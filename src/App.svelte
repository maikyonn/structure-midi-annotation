<script>
  import { onMount } from 'svelte';
  import MidiAnnotationTool from './lib/MidiAnnotationTool.js';

  let midiTool;

  onMount(() => {
    midiTool = new MidiAnnotationTool();
  });
</script>

<div class="container">
  <div class="header">
    <h1>Musical Structure Annotation Tool</h1>
    <p>Verify and annotate musical structure predictions for MIDI files</p>
  </div>
  
  <!-- Compact control bar with file selection and controls -->
  
  <div class="midi-info" id="midiInfo" style="display: none;">
    <div>
      <strong>File:</strong> <span id="fileName"></span><br>
      <strong>Predicted Structure:</strong> <span id="predictedStructure"></span><br>
      <strong>Confidence:</strong> <span id="confidence"></span>
    </div>
    <div>
      <strong>Significant Prediction:</strong> <span id="significantPrediction"></span><br>
      <strong>Style Changes:</strong> <span id="styleChanges"></span><br>
      <strong>Tokens:</strong> <span id="numTokens"></span>
    </div>
  </div>
  
  <div class="legend">
    <div class="legend-item">
      <div class="legend-color structure-a"></div>
      <span>Section A</span>
    </div>
    <div class="legend-item">
      <div class="legend-color structure-b"></div>
      <span>Section B</span>
    </div>
    <div class="legend-item">
      <div class="legend-color structure-c"></div>
      <span>Section C</span>
    </div>
  </div>
  
  <div class="piano-roll-container">
    <div class="timeline" id="timeline"></div>
    <div class="piano-roll" id="pianoRoll">
      <div class="piano-keys" id="pianoKeys"></div>
      <div class="notes-area" id="notesArea"></div>
      <div class="playback-cursor" id="playbackCursor" style="display: none;"></div>
    </div>
  </div>
  
  <div class="controls-container">
    <!-- File Selection Panel -->
    <div class="control-panel file-panel">
      <h4>File</h4>
      <div class="file-controls">
        <label for="midiSelect">MIDI:</label>
        <select id="midiSelect">
          <option value="">Loading files...</option>
        </select>
        <button class="next-btn" id="nextUnannotatedBtn">Next</button>
      </div>
      <span class="unannotated-count" id="unannotatedCount">--</span>
    </div>
    
    <!-- Audio Controls Panel -->
    <div class="control-panel audio-panel">
      <h4>Audio</h4>
      <div class="volume-control">
        <span class="volume-label">🔊</span>
        <input type="range" class="volume-slider" id="volumeSlider" min="0" max="100" value="100">
        <span class="volume-value" id="volumeValue">100%</span>
      </div>
      <div class="speed-controls">
        <span class="speed-label">Speed:</span>
        <div class="speed-radio-group">
          <label class="speed-radio">
            <input type="radio" name="speed" value="1">
            <span>1x</span>
          </label>
          <label class="speed-radio">
            <input type="radio" name="speed" value="2" checked>
            <span>2x</span>
          </label>
          <label class="speed-radio">
            <input type="radio" name="speed" value="3">
            <span>3x</span>
          </label>
          <label class="speed-radio">
            <input type="radio" name="speed" value="5">
            <span>5x</span>
          </label>
          <label class="speed-radio">
            <input type="radio" name="speed" value="8">
            <span>8x</span>
          </label>
        </div>
      </div>
    </div>
    
    <!-- Playback Panel -->
    <div class="control-panel playback-panel">
      <h4>Playback</h4>
      <button class="play-btn" id="playBtn">▶ Play</button>
      <div class="progress-bar">
        <div class="progress-fill" id="progressFill"></div>
      </div>
    </div>
    
    <!-- Annotation Panel -->
    <div class="control-panel annotation-panel">
      <h4>Annotation</h4>
      <div class="annotation-controls">
        <button class="agree-btn" id="agreeBtn">✓ Agree</button>
        <button class="disagree-btn" id="disagreeBtn">✗ Disagree</button>
      </div>
    </div>
  </div>
  
  <div class="status" id="status"></div>
</div>

<style>
  :global(body) {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    margin: 0;
    padding: 20px;
    background-color: #f5f5f5;
  }
  
  .container {
    max-width: 1200px;
    margin: 0 auto;
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  }
  
  .header {
    text-align: center;
    margin-bottom: 30px;
    padding-bottom: 20px;
    border-bottom: 2px solid #e0e0e0;
  }
  
  .controls-container {
    display: flex;
    justify-content: center;
    gap: 25px;
    margin: 20px 0;
    padding: 20px;
    background: #f9f9f9;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
    flex-wrap: wrap;
  }
  
  .control-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 15px 20px;
    background: white;
    border-radius: 8px;
    border: 1px solid #ddd;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    min-width: 140px;
  }
  
  .control-panel h4 {
    margin: 0 0 8px 0;
    font-size: 14px;
    color: #666;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .file-controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    width: 100%;
  }
  
  .file-controls label {
    font-weight: bold;
    font-size: 12px;
    margin: 0;
    color: #666;
  }
  
  .file-controls select {
    width: 100%;
    min-width: 150px;
    text-align: center;
  }
  
  .next-btn {
    background: #FF9800;
    color: white;
    padding: 6px 12px;
    font-size: 12px;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.3s;
    white-space: nowrap;
  }
  
  .next-btn:hover {
    background: #F57C00;
  }
  
  .next-btn:disabled {
    background: #cccccc;
    cursor: not-allowed;
  }
  
  .unannotated-count {
    font-size: 12px;
    color: #666;
    font-weight: bold;
    white-space: nowrap;
  }
  
  
  
  .speed-radio-group {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    justify-content: center;
  }
  
  .speed-radio {
    display: flex;
    align-items: center;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    border: 1px solid #ddd;
    background: white;
    transition: all 0.2s;
  }
  
  .speed-radio:hover {
    background: #f0f0f0;
  }
  
  .speed-radio input[type="radio"] {
    display: none;
  }
  
  .speed-radio input[type="radio"]:checked + span {
    font-weight: bold;
  }
  
  .speed-radio:has(input[type="radio"]:checked) {
    background: #4CAF50;
    color: white;
    border-color: #45a049;
  }
  
  .annotation-controls {
    display: flex;
    flex-direction: column;
    gap: 8px;
    width: 100%;
  }
  
  .progress-bar {
    width: 100%;
    height: 6px;
    background: #ddd;
    border-radius: 3px;
    overflow: hidden;
    margin-top: 10px;
    cursor: pointer;
  }
  
  .progress-fill {
    height: 100%;
    background: #4CAF50;
    width: 0%;
    transition: width 0.1s linear;
    pointer-events: none;
  }
  
  .speed-controls {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 15px;
    width: 100%;
  }
  
  .speed-label {
    font-size: 12px;
    color: #666;
    font-weight: bold;
    text-align: center;
  }
  
  .midi-info {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-bottom: 20px;
    padding: 15px;
    background: #e8f4fd;
    border-radius: 5px;
  }
  
  .piano-roll-container {
    position: relative;
    margin: 20px 0;
    border: 2px solid #ddd;
    border-radius: 5px;
    overflow: hidden;
  }
  
  .piano-roll {
    width: 100%;
    height: 400px;
    background: linear-gradient(to right, #f0f0f0 0%, #f8f8f8 100%);
    position: relative;
    overflow: hidden;
  }
  
  .playback-cursor {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: #ff4444;
    z-index: 20;
    pointer-events: none;
    transition: left 0.1s linear;
    box-shadow: 0 0 4px rgba(255, 68, 68, 0.6);
  }
  
  .piano-keys {
    position: absolute;
    left: 0;
    top: 0;
    width: 60px;
    height: 100%;
    background: white;
    border-right: 2px solid #ccc;
    z-index: 10;
  }
  
  :global(.key) {
    height: 10px;
    border-bottom: 1px solid #eee;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 8px;
    color: #666;
  }
  
  :global(.key.black) {
    background: #333;
    color: white;
  }
  
  :global(.key.white) {
    background: white;
  }
  
  .notes-area {
    margin-left: 60px;
    position: relative;
    height: 100%;
    min-width: 800px;
    cursor: pointer;
  }
  
  .notes-area:hover {
    background: rgba(76, 175, 80, 0.02);
  }
  
  :global(.note) {
    position: absolute;
    background: #4CAF50;
    border: 1px solid #45a049;
    border-radius: 2px;
    height: 8px;
  }
  
  .timeline {
    position: absolute;
    top: 0;
    left: 60px;
    right: 0;
    height: 30px;
    background: white;
    border-bottom: 1px solid #ccc;
    z-index: 5;
    cursor: pointer;
  }
  
  .timeline:hover {
    background: #f8f8f8;
  }
  
  :global(.time-marker) {
    position: absolute;
    height: 100%;
    border-left: 1px solid #999;
    font-size: 10px;
    padding-left: 2px;
    color: #666;
  }
  
  :global(.structure-highlight) {
    position: absolute;
    top: 0;
    bottom: 0;
    opacity: 0.3;
    border: 2px solid;
    border-radius: 3px;
    pointer-events: none;
  }
  
  :global(.structure-a) { background-color: #ff9999; border-color: #ff0000; }
  :global(.structure-b) { background-color: #99ccff; border-color: #0066cc; }
  :global(.structure-c) { background-color: #99ff99; border-color: #00cc00; }
  
  
  button {
    padding: 12px 24px;
    font-size: 16px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    transition: all 0.3s;
  }
  
  .play-btn {
    background: #4CAF50;
    color: white;
  }
  
  .play-btn:hover {
    background: #45a049;
  }
  
  .play-btn:disabled {
    background: #cccccc;
    cursor: not-allowed;
  }
  
  .play-btn:disabled:hover {
    background: #cccccc;
  }
  
  .agree-btn {
    background: #2196F3;
    color: white;
  }
  
  .agree-btn:hover {
    background: #1976D2;
  }
  
  .disagree-btn {
    background: #f44336;
    color: white;
  }
  
  .disagree-btn:hover {
    background: #d32f2f;
  }
  
  
  .legend {
    display: flex;
    justify-content: center;
    gap: 20px;
    margin: 15px 0;
    padding: 10px;
    background: white;
    border-radius: 5px;
    border: 1px solid #ddd;
  }
  
  .legend-item {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  
  .legend-color {
    width: 20px;
    height: 15px;
    border-radius: 3px;
    border: 1px solid #ccc;
  }
  
  .status {
    text-align: center;
    padding: 10px;
    margin-top: 10px;
    border-radius: 5px;
    display: none;
  }
  
  :global(.status.success) {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }
  
  :global(.status.error) {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }
  
  :global(.status.info) {
    background: #d1ecf1;
    color: #0c5460;
    border: 1px solid #bee5eb;
  }
  
  select, input {
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-size: 14px;
  }
  
  label {
    font-weight: bold;
    margin-bottom: 5px;
    display: block;
  }
  
  .volume-control {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .volume-label {
    font-size: 14px;
  }
  
  .volume-slider {
    width: 80px;
    height: 4px;
    border-radius: 2px;
    background: #ddd;
    outline: none;
    -webkit-appearance: none;
  }
  
  .volume-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #4CAF50;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }
  
  .volume-slider::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #4CAF50;
    cursor: pointer;
    border: none;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }
  
  .volume-value {
    font-size: 12px;
    color: #666;
    min-width: 30px;
  }
</style>