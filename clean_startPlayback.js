    async startPlayback() {
        if (!this.currentMidiData || !this.piano) return;
        
        this.isPlaying = true;
        this.playbackPosition = 0;
        this.scheduledNotes = [];
        
        // Show playback cursor
        const playbackCursor = document.getElementById('playbackCursor');
        if (playbackCursor) {
            playbackCursor.style.display = 'block';
        }
        
        // Start playback from beginning
        await this.startPlaybackFromPosition(0);
    }