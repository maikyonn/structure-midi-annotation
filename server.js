const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Serve the CSV file
app.get('/included_files.csv', async (req, res) => {
    try {
        const csvContent = await fs.readFile('included_files.csv', 'utf8');
        res.setHeader('Content-Type', 'text/csv');
        res.send(csvContent);
    } catch (error) {
        console.error('Error reading CSV:', error);
        res.status(500).json({ error: 'Failed to read CSV file' });
    }
});

// Update CSV with human annotation
app.post('/update-annotation', async (req, res) => {
    try {
        const { fileId, humanAgree } = req.body;
        
        // Read current CSV
        const csvContent = await fs.readFile('included_files.csv', 'utf8');
        const lines = csvContent.split('\n');
        
        // Check if human_agree column exists, if not add it
        const headers = lines[0].split(',');
        if (!headers.includes('human_agree')) {
            lines[0] += ',human_agree';
        }
        const humanAgreeIndex = headers.indexOf('human_agree') !== -1 ? 
            headers.indexOf('human_agree') : headers.length;
        
        // Find and update the row
        let updated = false;
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue;
            
            const values = parseCSVLine(lines[i]);
            if (values[0] && values[0].trim() === fileId) {
                // Ensure the row has enough columns
                while (values.length <= humanAgreeIndex) {
                    values.push('');
                }
                values[humanAgreeIndex] = humanAgree ? 'true' : 'false';
                lines[i] = values.map(v => v.includes(',') || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v).join(',');
                updated = true;
                break;
            }
        }
        
        if (!updated) {
            return res.status(404).json({ error: 'File not found in CSV' });
        }
        
        // Write updated CSV
        const updatedCSV = lines.join('\n');
        await fs.writeFile('included_files.csv', updatedCSV, 'utf8');
        
        res.json({ success: true, message: 'Annotation updated successfully' });
        
    } catch (error) {
        console.error('Error updating CSV:', error);
        res.status(500).json({ error: 'Failed to update CSV file' });
    }
});

// Parse CSV line handling quotes and commas
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                // Escaped quote
                current += '"';
                i++; // Skip next quote
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

// Get list of available MIDI files
app.get('/api/midi-files', async (req, res) => {
    try {
        const midiDir = path.join(__dirname, 'midi');
        const files = await fs.readdir(midiDir);
        const midiFiles = files.filter(file => file.endsWith('.mid'));
        res.json(midiFiles);
    } catch (error) {
        console.error('Error reading MIDI directory:', error);
        res.status(500).json({ error: 'Failed to read MIDI files' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Open your browser and navigate to http://localhost:${PORT} to use the Musical Structure Annotation Tool');
});