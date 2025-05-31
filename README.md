# Musical Structure Annotation Tool

A web-based tool for verifying and annotating musical structure predictions in MIDI files. This tool displays MIDI files as piano roll visualizations with highlighted structural sections and allows users to agree or disagree with AI-generated musical structure predictions.

## Features

- **MIDI Piano Roll Visualization**: Interactive piano roll display of MIDI files
- **Structure Highlighting**: Visual highlights showing predicted musical structure changes (A, B, C sections)
- **Audio Playback**: Play MIDI files with synthesized audio using Tone.js
- **Annotation Interface**: Simple agree/disagree buttons for user feedback
- **CSV Integration**: Automatically updates CSV with human annotations
- **Progress Tracking**: Visual progress bar during playback

## Installation

1. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

2. **Development mode** (recommended):
   ```bash
   # Start frontend development server
   npm run dev
   
   # In a separate terminal, start the backend server
   npm run server:dev
   ```
   
   Then open your browser to `http://localhost:5173` (frontend) - the backend runs on `http://localhost:3001`

3. **Production build**:
   ```bash
   npm run build
   npm run preview
   ```

## Usage

1. **Select a MIDI file** from the dropdown menu
2. **Review the information** displayed about the file:
   - Predicted musical structure (e.g., ABA, ABAB, ABCB)
   - Confidence scores
   - Structure change timestamps
3. **Examine the piano roll** with colored highlights showing different sections:
   - Red: Section A
   - Blue: Section B  
   - Green: Section C
4. **Play the audio** using the play button to listen to the piece
5. **Make your annotation** by clicking either:
   - ✓ **Agree**: If you think the predicted structure is correct
   - ✗ **Disagree**: If you think the predicted structure is incorrect
6. The tool will **automatically save** your annotation and **move to the next file**

## File Structure

```
├── index.html          # Main HTML interface
├── app.js             # Frontend JavaScript application
├── server.js          # Node.js server
├── package.json       # Node.js dependencies
├── included_files.csv # CSV data with predictions
├── midi/              # Directory containing MIDI files
└── README.md          # This file
```

## CSV Data Format

The `included_files.csv` contains the following columns:

- `file_id`: MIDI filename
- `significant_prediction`: Main structural sections with token counts
- `predicted_music_style`: Predicted structure (e.g., ABA, ABAB, ABCB)
- `style_change_timestamps`: Timestamps where sections change
- `num_tokens`: Total number of tokens in the piece
- `confidence_scores`: AI confidence for each section
- `prediction`: Detailed token-level predictions
- `human_agree`: Added by this tool (true/false for user agreement)

## Technical Details

### Frontend
- **Svelte**: Modern reactive frontend framework  
- **Vite**: Fast build tool and development server
- **Tone.js**: Web audio synthesis for MIDI playback
- **Canvas/DOM**: Piano roll visualization

### Backend
- **Node.js/Express**: Web server (can run as serverless function)
- **File System**: CSV reading/writing
- **CORS**: Cross-origin resource sharing enabled

### MIDI Processing
- Currently uses a simplified MIDI parser for demonstration
- For production use, integrate a proper MIDI parsing library like:
  - `midi-parser-js`
  - `jsmidgen`
  - `tone/midi`

## Deployment

### Vercel Deployment

This project can be easily deployed to Vercel with both frontend and backend:

1. **Fork/Clone the repository** to your GitHub account

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel will automatically detect it as a Vite project

3. **Environment Setup**:
   - The frontend will be deployed automatically
   - The backend (`server.js`) will run as a serverless function
   - MIDI files and CSV data will be served from the repository

4. **Custom Domain** (optional):
   - Add your custom domain in Vercel dashboard
   - Configure DNS settings as instructed

5. **Automatic Deployments**:
   - Every push to main branch will trigger a new deployment
   - Preview deployments for pull requests

### Manual Deployment Steps

If you prefer manual deployment:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from project root
vercel

# Follow the prompts to configure your deployment
```

### Alternative Deployment Options

- **Netlify**: Similar process to Vercel
- **GitHub Pages**: For static frontend only
- **Heroku**: For full-stack deployment with backend
- **DigitalOcean App Platform**: Container-based deployment

## Development

For development with auto-restart:
```bash
# Frontend (Vite dev server)
npm run dev

# Backend (Express server with nodemon)
npm run server:dev
```

## Customization

### Adding New Structure Types
To support additional structure types beyond A, B, C:

1. Add CSS classes in `index.html`:
   ```css
   .structure-d { background-color: #ffcc99; border-color: #ff6600; }
   ```

2. Update the legend in the HTML

3. Modify the highlighting logic in `addStructureHighlights()`

### Enhancing MIDI Parsing
Replace the mock MIDI parser in `parseMIDI()` with a real implementation:

```javascript
// Example using midi-parser-js
const MidiParser = require('midi-parser-js');
const midiData = MidiParser.parse(arrayBuffer);
```

## Browser Compatibility

- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+

Requires Web Audio API support for audio playback.

## License

MIT License