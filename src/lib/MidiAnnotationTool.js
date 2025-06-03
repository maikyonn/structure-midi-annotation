import { MidiDataService } from './supabaseClient.js';

class MidiAnnotationTool {
    constructor() {
        this.midiFiles = [];
        this.currentFileIndex = 0;
        this.currentFileData = null;
        this.currentMidiData = null;
        this.isPlaying = false;
        this.playbackPosition = 0;
        this.totalDuration = 0;
        this.playbackInterval = null;
        this.piano = null;
        this.scheduledNotes = [];
        this.masterVolume = 7.0; // Default volume (70% * 10x boost = 700%)
        this.playbackSpeed = 1.0; // Default playback speed (1x)
        
        this.init();
    }
    
    async init() {
        await this.loadMidiFilesData();
        this.setupEventListeners();
        this.populateFileSelector();
        this.createPianoKeys();
        // Audio will be initialized on first play button click
    }
    
    async loadMidiFilesData() {
        try {
            this.showStatus('Loading MIDI files from database...', 'info');
            
            this.midiFiles = await MidiDataService.loadMidiFiles();
            console.log('Loaded MIDI files:', this.midiFiles.length);
            
            // Update button state and count after loading data
            setTimeout(() => {
                this.updateNextButton();
            }, 100);
            
            this.showStatus(`Loaded ${this.midiFiles.length} MIDI files`, 'success');
        } catch (error) {
            console.error('Error loading MIDI files:', error);
            this.showStatus('Error loading MIDI files from database', 'error');
        }
    }
    
    
    setupEventListeners() {
        document.getElementById('midiSelect').addEventListener('change', (e) => {
            if (e.target.value) {
                this.currentFileIndex = parseInt(e.target.value);
                this.loadMidiFile();
            }
        });
        
        document.getElementById('playBtn').addEventListener('click', () => {
            this.togglePlayback();
        });
        
        document.getElementById('agreeBtn').addEventListener('click', () => {
            this.submitAnnotation(true);
        });
        
        document.getElementById('disagreeBtn').addEventListener('click', () => {
            this.submitAnnotation(false);
        });
        
        // Volume slider
        document.getElementById('volumeSlider').addEventListener('input', (e) => {
            this.updateVolume(e.target.value);
        });
        
        // Next unannotated button
        document.getElementById('nextUnannotatedBtn').addEventListener('click', () => {
            this.loadNextUnannotated();
        });
        
        // Speed selector
        document.getElementById('speedSelect').addEventListener('change', (e) => {
            this.updateSpeed(parseFloat(e.target.value));
        });
    }
    
    populateFileSelector() {
        const select = document.getElementById('midiSelect');
        select.innerHTML = '<option value="">Select a MIDI file...</option>';
        
        this.midiFiles.forEach((file, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = file.file_id;
            
            // Add visual indicator for annotated files
            if (file.human_agree !== null) {
                option.textContent += file.human_agree ? ' ✓' : ' ✗';
            }
            
            select.appendChild(option);
        });
    }
    
    async loadMidiFile() {
        const fileData = this.midiFiles[this.currentFileIndex];
        if (!fileData) return;
        
        this.currentFileData = fileData;
        
        try {
            // Load MIDI file from AWS S3
            const midiPath = `https://ml-datasets-maikyon.s3.us-west-2.amazonaws.com/midi/${fileData.file_id}`;
            const response = await fetch(midiPath);
            
            if (!response.ok) {
                throw new Error(`MIDI file not found: ${midiPath}`);
            }
            
            const arrayBuffer = await response.arrayBuffer();
            
            // Parse MIDI using Tone.js MIDI parser
            try {
                if (typeof Midi === 'undefined') {
                    throw new Error('Midi library not loaded');
                }
                this.currentMidiData = new Midi(arrayBuffer);
                this.totalDuration = this.currentMidiData.duration;
            } catch (midiError) {
                console.error('MIDI parsing failed:', midiError);
                // Fallback: create sample data for testing
                this.currentMidiData = this.createSampleMidiData();
                this.totalDuration = this.currentMidiData.duration;
                this.showStatus('Using sample data - MIDI parsing failed', 'error');
            }
            
            console.log('MIDI loaded:', this.currentMidiData);
            console.log('Duration:', this.totalDuration);
            console.log('Tracks:', this.currentMidiData.tracks.length);
            
            // Debug: count total notes
            let totalNotes = 0;
            this.currentMidiData.tracks.forEach((track, index) => {
                console.log(`Track ${index}: ${track.notes.length} notes`);
                totalNotes += track.notes.length;
            });
            console.log('Total notes:', totalNotes);
            
            this.displayFileInfo(fileData);
            this.renderPianoRoll();
            // Add highlights after rendering to ensure proper scaling
            setTimeout(() => {
                this.addStructureHighlights(fileData);
            }, 100);
            
        } catch (error) {
            console.error('Error loading MIDI file:', error);
            this.showStatus(`Error loading MIDI file: ${error.message}`, 'error');
        }
    }
    
    displayFileInfo(fileData) {
        document.getElementById('fileName').textContent = fileData.file_id;
        document.getElementById('predictedStructure').textContent = fileData.predicted_music_style;
        document.getElementById('confidence').textContent = fileData.confidence_scores;
        document.getElementById('significantPrediction').textContent = fileData.significant_prediction;
        document.getElementById('styleChanges').textContent = fileData.style_change_timestamps;
        document.getElementById('numTokens').textContent = fileData.num_tokens;
        
        document.getElementById('midiInfo').style.display = 'grid';
    }
    
    createPianoKeys() {
        const pianoKeys = document.getElementById('pianoKeys');
        pianoKeys.innerHTML = '';
        
        // Create 88 piano keys (A0 to C8) - MIDI notes 21 to 108
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const blackKeys = [1, 3, 6, 8, 10]; // C#, D#, F#, G#, A#
        
        // Create keys from high to low (C8 to A0)
        for (let midiNote = 108; midiNote >= 21; midiNote--) {
            const octave = Math.floor((midiNote - 12) / 12);
            const noteIndex = (midiNote - 12) % 12;
            
            const keyDiv = document.createElement('div');
            keyDiv.className = `key ${blackKeys.includes(noteIndex) ? 'black' : 'white'}`;
            keyDiv.style.height = '4px'; // Smaller keys for better fit
            keyDiv.style.fontSize = '6px';
            
            if (!blackKeys.includes(noteIndex)) {
                keyDiv.textContent = `${noteNames[noteIndex]}${octave}`;
            }
            
            pianoKeys.appendChild(keyDiv);
        }
    }
    
    renderPianoRoll() {
        if (!this.currentMidiData) return;
        
        const notesArea = document.getElementById('notesArea');
        const timeline = document.getElementById('timeline');
        const pianoRoll = document.getElementById('pianoRoll');
        
        // Clear existing content
        notesArea.innerHTML = '';
        timeline.innerHTML = '';
        
        // Calculate available width (subtract piano keys width)
        const availableWidth = pianoRoll.clientWidth - 60; // 60px for piano keys
        
        // Scale to fit entire song in available width
        const pixelsPerSecond = availableWidth / this.totalDuration;
        
        // Store for use in highlighting
        this.pixelsPerSecond = pixelsPerSecond;
        
        // Add time markers
        const markerInterval = this.totalDuration > 120 ? 30 : (this.totalDuration > 60 ? 10 : 5);
        for (let i = 0; i <= Math.ceil(this.totalDuration); i += markerInterval) {
            const marker = document.createElement('div');
            marker.className = 'time-marker';
            marker.style.left = `${i * pixelsPerSecond}px`;
            const minutes = Math.floor(i / 60);
            const seconds = i % 60;
            marker.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            timeline.appendChild(marker);
        }
        
        // Get all notes from all tracks
        const allNotes = [];
        this.currentMidiData.tracks.forEach(track => {
            track.notes.forEach(note => {
                allNotes.push({
                    midi: note.midi,
                    time: note.time,
                    duration: note.duration,
                    velocity: note.velocity
                });
            });
        });
        
        console.log('Rendering', allNotes.length, 'notes');
        console.log('Available width:', availableWidth);
        console.log('Pixels per second:', pixelsPerSecond);
        
        if (allNotes.length === 0) {
            console.warn('No notes found in MIDI file!');
            notesArea.innerHTML = '<div style="color: red; padding: 20px;">No notes found in this MIDI file</div>';
            return;
        }
        
        // Render notes
        allNotes.forEach((note, index) => {
            const noteDiv = document.createElement('div');
            noteDiv.className = 'note';
            
            const left = note.time * pixelsPerSecond;
            const width = Math.max(note.duration * pixelsPerSecond, 1); // Minimum 1px width
            const top = (108 - note.midi) * 4; // 4px per semitone to match key height
            
            noteDiv.style.left = `${left}px`;
            noteDiv.style.width = `${width}px`;
            noteDiv.style.top = `${top}px`;
            noteDiv.style.height = '3px';
            noteDiv.style.opacity = Math.max(note.velocity / 127, 0.3); // Minimum opacity for visibility
            noteDiv.style.position = 'absolute';
            
            // Color based on velocity
            const intensity = Math.floor((note.velocity / 127) * 255);
            noteDiv.style.backgroundColor = `rgb(${Math.max(intensity, 76)}, ${Math.floor(intensity * 0.8)}, ${Math.floor(intensity * 0.2)})`;
            
            // Debug first few notes
            if (index < 3) {
                console.log(`Note ${index}: midi=${note.midi}, time=${note.time}, duration=${note.duration}, left=${left}, width=${width}, top=${top}`);
            }
            
            notesArea.appendChild(noteDiv);
        });
        
        // Set exact width and height
        notesArea.style.width = `${availableWidth}px`;
        notesArea.style.height = `${88 * 4}px`; // 88 keys * 4px each
        notesArea.style.minWidth = 'auto';
    }
    
    addStructureHighlights(fileData) {
        const notesArea = document.getElementById('notesArea');
        
        // Use the same scaling as the notes
        const pixelsPerSecond = this.pixelsPerSecond || 100;
        
        // Parse structure change timestamps
        const timestamps = this.parseTimestamps(fileData.style_change_timestamps);
        
        // Remove existing highlights
        document.querySelectorAll('.structure-highlight').forEach(el => el.remove());
        
        if (timestamps.length === 0) {
            // If no timestamps, highlight entire piece as section A
            const highlight = document.createElement('div');
            highlight.className = 'structure-highlight structure-a';
            highlight.style.left = '0px';
            highlight.style.width = `${this.totalDuration * pixelsPerSecond}px`;
            highlight.style.top = '0px';
            highlight.style.height = '100%';
            notesArea.appendChild(highlight);
            return;
        }
        
        // Sort timestamps by time
        timestamps.sort((a, b) => a.time - b.time);
        
        // Add highlights based on structure
        let currentSection = 'A';
        let sectionStart = 0;
        
        timestamps.forEach((timestamp) => {
            // Create highlight for current section
            const highlight = document.createElement('div');
            highlight.className = `structure-highlight structure-${currentSection.toLowerCase()}`;
            highlight.style.left = `${sectionStart * pixelsPerSecond}px`;
            highlight.style.width = `${(timestamp.time - sectionStart) * pixelsPerSecond}px`;
            highlight.style.top = '0px';
            highlight.style.height = '100%';
            notesArea.appendChild(highlight);
            
            // Update for next section
            currentSection = timestamp.section;
            sectionStart = timestamp.time;
        });
        
        // Add final section highlight
        if (sectionStart < this.totalDuration) {
            const highlight = document.createElement('div');
            highlight.className = `structure-highlight structure-${currentSection.toLowerCase()}`;
            highlight.style.left = `${sectionStart * pixelsPerSecond}px`;
            highlight.style.width = `${(this.totalDuration - sectionStart) * pixelsPerSecond}px`;
            highlight.style.top = '0px';
            highlight.style.height = '100%';
            notesArea.appendChild(highlight);
        }
    }
    
    parseTimestamps(timestampStr) {
        if (!timestampStr) return [];
        
        const timestamps = [];
        const parts = timestampStr.split(';');
        
        parts.forEach(part => {
            const match = part.trim().match(/([ABC]):(.+)/);
            if (match) {
                const section = match[1];
                const timeStr = match[2];
                const time = this.parseTimeString(timeStr);
                timestamps.push({ section, time });
            }
        });
        
        return timestamps.sort((a, b) => a.time - b.time);
    }
    
    updateVolume(value) {
        this.masterVolume = (value / 100) * 10; // Convert percentage to 0-10 (10x boost)
        
        // Update volume display
        document.getElementById('volumeValue').textContent = `${value}% (10x boost)`;
        
        // Update actual audio volume
        if (this.masterGain) {
            if (this.masterGain.gain) {
                // Tone.js gain node
                this.masterGain.gain.value = this.masterVolume;
            } else if (this.masterGain.gain && this.masterGain.gain.setValueAtTime) {
                // Web Audio API gain node
                this.masterGain.gain.setValueAtTime(this.masterVolume, this.audioContext.currentTime);
            }
        }
        
        console.log(`Volume updated to ${value}% (${this.masterVolume})`);
    }
    
    updateSpeed(multiplier) {
        this.playbackSpeed = multiplier;
        console.log(`Playback speed updated to ${multiplier}x`);
        
        // If currently playing, restart playback with new speed
        if (this.isPlaying) {
            const currentPosition = this.playbackPosition;
            this.stopCurrentPlayback();
            this.startPlaybackFromPosition(currentPosition);
        }
    }
    
    updatePlaybackCursor() {
        const cursorDiv = document.getElementById('playbackCursor');
        const notesArea = document.getElementById('notesArea');
        
        if (!cursorDiv || !this.pixelsPerSecond) return;
        
        // Calculate cursor position
        const position = this.playbackPosition * this.pixelsPerSecond + 60; // +60 for piano keys width
        cursorDiv.style.left = `${position}px`;
        cursorDiv.style.display = this.isPlaying ? 'block' : 'none';
    }
    
    scrubToPosition(event) {
        if (!this.totalDuration) return;
        
        const progressBar = event.currentTarget;
        const rect = progressBar.getBoundingClientRect();
        const clickX = event.clientX - rect.left;
        const progressPercent = clickX / rect.width;
        const newPosition = progressPercent * this.totalDuration;
        
        console.log(`Scrubbing to ${newPosition.toFixed(2)}s (${(progressPercent * 100).toFixed(1)}%)`);
        
        // Update playback position
        this.playbackPosition = Math.max(0, Math.min(newPosition, this.totalDuration));
        
        // Update visual elements
        this.updateProgressBar();
        this.updatePlaybackCursor();
        
        // If currently playing, restart playback from new position
        if (this.isPlaying) {
            this.restartPlaybackFromPosition();
        }
    }
    
    updateProgressBar() {
        const progress = Math.min((this.playbackPosition / this.totalDuration) * 100, 100);
        document.getElementById('progressFill').style.width = `${progress}%`;
    }
    
    restartPlaybackFromPosition() {
        // Stop current playback
        this.stopCurrentPlayback();
        
        // Restart from new position
        this.startPlaybackFromPosition(this.playbackPosition);
    }
    
    stopCurrentPlayback() {
        // Clear scheduled notes
        this.scheduledNotes.forEach(timeoutId => clearTimeout(timeoutId));
        this.scheduledNotes = [];
        
        if (this.playbackInterval) {
            clearInterval(this.playbackInterval);
            this.playbackInterval = null;
        }
    }
    
    async startPlaybackFromPosition(startPosition) {
        if (!this.currentMidiData || !this.piano) return;
        
        // Get all notes from all tracks
        const allNotes = [];
        this.currentMidiData.tracks.forEach(track => {
            track.notes.forEach(note => {
                // Only include notes that haven't passed yet
                if (note.time >= startPosition) {
                    allNotes.push({
                        midi: note.midi,
                        time: note.time,
                        duration: note.duration,
                        velocity: note.velocity
                    });
                }
            });
        });
        
        // Sort notes by time
        allNotes.sort((a, b) => a.time - b.time);
        
        const startTime = Date.now() - (startPosition * 1000); // Adjust for current position
        
        // Schedule remaining notes for playback (adjusted for speed)
        allNotes.forEach(note => {
            const playTime = note.time * 1000; // Convert to milliseconds
            const adjustedPlayTime = playTime - (startPosition * 1000); // Adjust for scrub position
            const speedAdjustedTime = adjustedPlayTime / this.playbackSpeed; // Apply speed multiplier
            
            if (speedAdjustedTime >= 0) { // Only schedule future notes
                const timeoutId = setTimeout(() => {
                    if (this.isPlaying && this.piano) {
                        try {
                            if (this.piano.triggerAttackRelease) {
                                // Tone.js sampler
                                const noteName = Tone.Frequency(note.midi, "midi").toNote();
                                // Apply 10x volume boost to individual notes too
                                const boostedVelocity = Math.min((note.velocity / 127) * 10, 1); // Cap at 1.0
                                // Adjust note duration for speed
                                const speedAdjustedDuration = note.duration / this.playbackSpeed;
                                this.piano.triggerAttackRelease(noteName, speedAdjustedDuration, undefined, boostedVelocity);
                            } else if (this.piano.playNote) {
                                // Custom synthesizer fallback
                                this.piano.playNote(
                                    note.midi, 
                                    note.duration / this.playbackSpeed, // Adjust duration for speed
                                    note.velocity / 127,
                                    0 // Start immediately when timeout fires
                                );
                            }
                        } catch (error) {
                            console.error('Error playing note:', error);
                        }
                    }
                }, speedAdjustedTime);
                
                this.scheduledNotes.push(timeoutId);
            }
        });
        
        // Update progress bar and cursor (adjusted for speed)
        this.playbackInterval = setInterval(() => {
            if (!this.isPlaying) return;
            
            // Calculate position with speed multiplier
            this.playbackPosition = ((Date.now() - startTime) / 1000) * this.playbackSpeed;
            this.updateProgressBar();
            this.updatePlaybackCursor();
            
            if (this.playbackPosition >= this.totalDuration) {
                this.stopPlayback();
                document.getElementById('playBtn').textContent = '▶ Play';
            }
        }, 100);
    }
    
    parseTimeString(timeStr) {
        // Parse time strings like "1:30.720" or "46.710s"
        if (timeStr.includes(':')) {
            const parts = timeStr.split(':');
            const minutes = parseInt(parts[0]);
            const seconds = parseFloat(parts[1]);
            return minutes * 60 + seconds;
        } else {
            return parseFloat(timeStr.replace('s', ''));
        }
    }
    
    createSampleMidiData() {
        // Create sample MIDI data for testing when real parsing fails
        const notes = [];
        const duration = 30; // 30 seconds
        
        // Generate some sample notes
        for (let i = 0; i < 50; i++) {
            notes.push({
                midi: 60 + Math.floor(Math.random() * 24), // C4 to B5
                time: i * 0.5 + Math.random() * 0.2,
                duration: 0.3 + Math.random() * 0.5,
                velocity: 64 + Math.random() * 63
            });
        }
        
        return {
            duration: duration,
            tracks: [{
                notes: notes
            }]
        };
    }
    
    async setupAudio() {
        if (this.piano) {
            return; // Already initialized
        }
        
        try {
            // Show loading message
            const instruction = document.querySelector('.controls small');
            if (instruction) {
                instruction.textContent = 'Loading piano samples...';
                instruction.style.color = '#2196F3';
            }
            
            // Initialize Tone.js (this must happen after user gesture)
            if (typeof Tone !== 'undefined') {
                await Tone.start();
                console.log('Tone.js started successfully');
                
                // Create a high-quality piano sampler with multiple samples
                this.piano = new Tone.Sampler({
                    urls: {
                        A0: "A0.mp3",
                        C1: "C1.mp3",
                        "D#1": "Ds1.mp3",
                        "F#1": "Fs1.mp3",
                        A1: "A1.mp3",
                        C2: "C2.mp3",
                        "D#2": "Ds2.mp3",
                        "F#2": "Fs2.mp3",
                        A2: "A2.mp3",
                        C3: "C3.mp3",
                        "D#3": "Ds3.mp3",
                        "F#3": "Fs3.mp3",
                        A3: "A3.mp3",
                        C4: "C4.mp3",
                        "D#4": "Ds4.mp3",
                        "F#4": "Fs4.mp3",
                        A4: "A4.mp3",
                        C5: "C5.mp3",
                        "D#5": "Ds5.mp3",
                        "F#5": "Fs5.mp3",
                        A5: "A5.mp3",
                        C6: "C6.mp3",
                        "D#6": "Ds6.mp3",
                        "F#6": "Fs6.mp3",
                        A6: "A6.mp3",
                        C7: "C7.mp3",
                        "D#7": "Ds7.mp3",
                        "F#7": "Fs7.mp3",
                        A7: "A7.mp3",
                        C8: "C8.mp3"
                    },
                    release: 1,
                    baseUrl: "https://tonejs.github.io/audio/salamander/",
                });
                
                // Create master volume control with 5x boost
                this.masterGain = new Tone.Gain(this.masterVolume).toDestination();
                this.piano.connect(this.masterGain);
                console.log('Piano volume boosted 10x for better audibility');
                
                console.log('High-quality piano sampler created with full range');
                
                if (instruction) {
                    instruction.textContent = 'High-quality piano loaded - Press play to start';
                    instruction.style.color = '#4CAF50';
                }
            } else {
                throw new Error('Tone.js not available');
            }
            
        } catch (error) {
            console.error('Tone.js failed, using basic synthesizer:', error);
            // Fallback to basic synthesizer
            this.piano = this.createPianoSynth();
            
            const instruction = document.querySelector('.controls small');
            if (instruction) {
                instruction.textContent = 'Basic synthesizer ready - Press play to start';
                instruction.style.color = '#ff9800';
            }
        }
    }
    
    createPianoSynth() {
        // Create a simple but pleasant piano-like synthesizer using Web Audio API
        // Create master gain for volume control
        this.audioContext = this.audioContext || new AudioContext();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = this.masterVolume;
        this.masterGain.connect(this.audioContext.destination);
        console.log('Synthesizer volume boosted 10x for better audibility');
        
        return {
            playNote: (midiNote, duration, velocity = 0.7, startTime = 0) => {
                if (!this.audioContext) return;
                
                const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
                const gainValue = velocity * 3.0; // 10x boost (was 0.3, now 3.0)
                
                // Create oscillators for a richer piano-like sound
                const oscillator1 = this.audioContext.createOscillator();
                const oscillator2 = this.audioContext.createOscillator();
                const oscillator3 = this.audioContext.createOscillator();
                
                // Create gain nodes
                const gainNode = this.audioContext.createGain();
                const masterGain = this.audioContext.createGain();
                
                // Set up oscillators with slightly different frequencies for richness
                oscillator1.frequency.value = frequency;
                oscillator2.frequency.value = frequency * 2.01; // Slight detune
                oscillator3.frequency.value = frequency * 4.02; // Higher harmonic
                
                oscillator1.type = 'triangle';
                oscillator2.type = 'sine';
                oscillator3.type = 'sine';
                
                // Connect oscillators to gain
                oscillator1.connect(gainNode);
                oscillator2.connect(gainNode);
                oscillator3.connect(gainNode);
                
                // Set relative volumes
                gainNode.gain.value = gainValue;
                masterGain.gain.value = 0.8; // Mix level for oscillator 2
                
                // Connect to master gain instead of destination
                gainNode.connect(this.masterGain);
                
                // Create envelope (ADSR)
                const now = this.audioContext.currentTime + startTime;
                const attackTime = 0.02;
                const decayTime = 0.1;
                const sustainLevel = 0.3;
                const releaseTime = Math.min(duration * 0.3, 1.0);
                
                // Attack
                gainNode.gain.setValueAtTime(0, now);
                gainNode.gain.linearRampToValueAtTime(gainValue, now + attackTime);
                
                // Decay
                gainNode.gain.linearRampToValueAtTime(gainValue * sustainLevel, now + attackTime + decayTime);
                
                // Release
                const releaseStart = now + duration - releaseTime;
                gainNode.gain.setValueAtTime(gainValue * sustainLevel, releaseStart);
                gainNode.gain.linearRampToValueAtTime(0, releaseStart + releaseTime);
                
                // Start and stop oscillators
                oscillator1.start(now);
                oscillator2.start(now);
                oscillator3.start(now);
                
                oscillator1.stop(now + duration);
                oscillator2.stop(now + duration);
                oscillator3.stop(now + duration);
            }
        };
    }
    
    async togglePlayback() {
        const playBtn = document.getElementById('playBtn');
        
        if (!this.isPlaying) {
            // Initialize audio on first play (user gesture required)
            if (!this.piano) {
                playBtn.textContent = 'Loading...';
                playBtn.disabled = true;
                try {
                    await this.setupAudio();
                } catch (error) {
                    console.error('Failed to initialize audio:', error);
                    this.showStatus('Audio initialization failed', 'error');
                    playBtn.textContent = '▶ Play';
                    playBtn.disabled = false;
                    return;
                }
                playBtn.disabled = false;
            }
            
            await this.startPlayback();
            playBtn.textContent = '⏸ Pause';
        } else {
            this.stopPlayback();
            playBtn.textContent = '▶ Play';
        }
    }
    
    async startPlayback() {
        if (!this.currentMidiData || !this.piano) return;
        
        this.isPlaying = true;
        this.playbackPosition = 0;
        this.scheduledNotes = [];
        
        // Get all notes from all tracks
        const allNotes = [];
        this.currentMidiData.tracks.forEach(track => {
            track.notes.forEach(note => {
                allNotes.push({
                    midi: note.midi,
                    time: note.time,
                    duration: note.duration,
                    velocity: note.velocity
                });
            });
        });
        
        // Sort notes by time
        allNotes.sort((a, b) => a.time - b.time);
        
        const startTime = Date.now();
        
        // Schedule notes for playback (adjusted for speed)
        allNotes.forEach(note => {
            const playTime = note.time * 1000; // Convert to milliseconds
            const speedAdjustedTime = playTime / this.playbackSpeed; // Apply speed multiplier
            
            const timeoutId = setTimeout(() => {
                if (this.isPlaying && this.piano) {
                    try {
                        if (this.piano.triggerAttackRelease) {
                            // Tone.js sampler
                            const noteName = Tone.Frequency(note.midi, "midi").toNote();
                            // Apply 10x volume boost to individual notes too
                            const boostedVelocity = Math.min((note.velocity / 127) * 10, 1); // Cap at 1.0
                            // Adjust note duration for speed
                            const speedAdjustedDuration = note.duration / this.playbackSpeed;
                            this.piano.triggerAttackRelease(noteName, speedAdjustedDuration, undefined, boostedVelocity);
                        } else if (this.piano.playNote) {
                            // Custom synthesizer fallback
                            this.piano.playNote(
                                note.midi, 
                                note.duration / this.playbackSpeed, // Adjust duration for speed
                                note.velocity / 127,
                                0 // Start immediately when timeout fires
                            );
                        }
                    } catch (error) {
                        console.error('Error playing note:', error);
                    }
                }
            }, speedAdjustedTime);
            
            this.scheduledNotes.push(timeoutId);
        });
        
        // Show playback cursor
        const playbackCursor = document.getElementById('playbackCursor');
        if (playbackCursor) {
            playbackCursor.style.display = 'block';
        }
        
        // Update progress bar and cursor (adjusted for speed)
        this.playbackInterval = setInterval(() => {
            if (!this.isPlaying) return;
            
            // Calculate position with speed multiplier
            this.playbackPosition = ((Date.now() - startTime) / 1000) * this.playbackSpeed;
            const progress = Math.min((this.playbackPosition / this.totalDuration) * 100, 100);
            document.getElementById('progressFill').style.width = `${progress}%`;
            
            // Update playback cursor position
            this.updatePlaybackCursor();
            
            if (this.playbackPosition >= this.totalDuration) {
                this.stopPlayback();
                document.getElementById('playBtn').textContent = '▶ Play';
            }
        }, 100);
    }
    
    stopPlayback() {
        this.isPlaying = false;
        this.playbackPosition = 0;
        
        // Clear scheduled notes
        this.scheduledNotes.forEach(timeoutId => clearTimeout(timeoutId));
        this.scheduledNotes = [];
        
        if (this.playbackInterval) {
            clearInterval(this.playbackInterval);
            this.playbackInterval = null;
        }
        
        // Hide playback cursor
        const cursorElement = document.getElementById('playbackCursor');
        if (cursorElement) {
            cursorElement.style.display = 'none';
        }
        
        // Reset progress bar
        document.getElementById('progressFill').style.width = '0%';
    }
    
    async submitAnnotation(agrees) {
        const fileData = this.currentFileData;
        if (!fileData) return;
        
        try {
            this.showStatus('Saving annotation...', 'info');
            
            // Save annotation to Supabase
            await MidiDataService.saveAnnotation(fileData.file_id, agrees);
            
            // Update local data
            fileData.human_agree = agrees;
            this.midiFiles[this.currentFileIndex].human_agree = agrees;
            
            this.showStatus(`Annotation saved: ${agrees ? 'Agreed' : 'Disagreed'}`, 'success');
            
            // Update the count and button state
            this.updateNextButton();
            
            // Update file selector to show annotation status
            this.populateFileSelector();
            // Re-select current file
            document.getElementById('midiSelect').value = this.currentFileIndex;
            
            // Move to next file
            setTimeout(() => {
                this.moveToNextFile();
            }, 1000);
            
        } catch (error) {
            console.error('Error saving annotation:', error);
            this.showStatus('Error saving annotation to database', 'error');
        }
    }
    
    
    moveToNextFile() {
        const select = document.getElementById('midiSelect');
        const nextIndex = this.currentFileIndex + 1;
        
        if (nextIndex < this.midiFiles.length) {
            select.value = nextIndex;
            this.currentFileIndex = nextIndex;
            this.loadMidiFile();
        } else {
            this.showStatus('All files have been annotated!', 'success');
        }
    }
    
    async loadNextUnannotated() {
        try {
            // Get next unannotated file from Supabase
            const currentFileId = this.currentFileData ? this.currentFileData.file_id : null;
            const nextFile = await MidiDataService.getNextUnannotated(currentFileId);
            
            if (nextFile) {
                // Find the index of this file in our local array
                const fileIndex = this.midiFiles.findIndex(file => file.file_id === nextFile.file_id);
                
                if (fileIndex !== -1) {
                    this.currentFileIndex = fileIndex;
                    const select = document.getElementById('midiSelect');
                    select.value = fileIndex;
                    this.loadMidiFile();
                    this.updateNextButton();
                } else {
                    // File not found in local array, reload data
                    await this.loadMidiFilesData();
                    this.populateFileSelector();
                    this.loadNextUnannotated(); // Try again
                }
            } else {
                // No unannotated files found
                this.showStatus('All files have been annotated!', 'success');
                this.updateNextButton();
            }
        } catch (error) {
            console.error('Error loading next unannotated file:', error);
            this.showStatus('Error loading next unannotated file', 'error');
        }
    }
    
    async updateNextButton() {
        const button = document.getElementById('nextUnannotatedBtn');
        
        try {
            const unannotatedCount = await MidiDataService.getUnannotatedCount();
            
            if (unannotatedCount > 0) {
                button.disabled = false;
                button.textContent = 'Next Unannotated';
            } else {
                button.disabled = true;
                button.textContent = 'All Annotated';
            }
            
            // Update the count display
            await this.updateUnannotatedCount();
        } catch (error) {
            console.error('Error updating next button:', error);
            // Fallback to local check
            const hasUnannotated = this.midiFiles.some(file => file.human_agree === null);
            button.disabled = !hasUnannotated;
            button.textContent = hasUnannotated ? 'Next Unannotated' : 'All Annotated';
            this.updateUnannotatedCount();
        }
    }
    
    async updateUnannotatedCount() {
        const countElement = document.getElementById('unannotatedCount');
        
        try {
            const unannotatedCount = await MidiDataService.getUnannotatedCount();
            countElement.textContent = `Unannotated files: ${unannotatedCount}`;
        } catch (error) {
            console.error('Error getting unannotated count:', error);
            // Fallback to local count
            const localCount = this.midiFiles.filter(file => file.human_agree === null).length;
            countElement.textContent = `Unannotated files: ${localCount}`;
        }
    }
    
    showStatus(message, type) {
        const status = document.getElementById('status');
        status.textContent = message;
        status.className = `status ${type}`;
        status.style.display = 'block';
        
        setTimeout(() => {
            status.style.display = 'none';
        }, 3000);
    }
}

export default MidiAnnotationTool;