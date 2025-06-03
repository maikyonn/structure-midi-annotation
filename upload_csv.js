const fs = require('fs');
const path = require('path');

// Read and parse CSV file
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const header = lines[0].split(',');
  const records = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Parse CSV line considering quoted fields
    const fields = [];
    let current = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current); // Add the last field
    
    if (fields.length === header.length) {
      const record = {};
      header.forEach((col, idx) => {
        record[col] = fields[idx] || null;
      });
      records.push(record);
    }
  }
  
  return records;
}

// Generate SQL INSERT statements
function generateInsertSQL(records) {
  let sql = `INSERT INTO midi_files (file_id, significant_prediction, predicted_music_style, style_change_timestamps, num_tokens, confidence_scores, prediction, human_agree) VALUES\n`;
  
  const values = records.map(record => {
    const fileId = record.file_id?.replace(/'/g, "''") || '';
    const significantPrediction = record.significant_prediction?.replace(/'/g, "''") || '';
    const predictedMusicStyle = record.predicted_music_style?.replace(/'/g, "''") || '';
    const styleChangeTimestamps = record.style_change_timestamps?.replace(/'/g, "''") || '';
    const numTokens = record.num_tokens ? parseInt(record.num_tokens) : null;
    const confidenceScores = record.confidence_scores?.replace(/'/g, "''") || '';
    const prediction = record.prediction?.replace(/'/g, "''") || '';
    const humanAgree = record.human_agree === 'true' ? true : (record.human_agree === 'false' ? false : null);
    
    return `('${fileId}', '${significantPrediction}', '${predictedMusicStyle}', '${styleChangeTimestamps}', ${numTokens}, '${confidenceScores}', '${prediction}', ${humanAgree})`;
  });
  
  sql += values.join(',\n');
  sql += ';';
  
  return sql;
}

// Main execution
const csvPath = '/Users/maikyon/Downloads/gen1-5k-real/included_files.csv';
const records = parseCSV(csvPath);
console.log(`Parsed ${records.length} records`);

// Split into chunks of 100 records for better performance
const CHUNK_SIZE = 100;
const chunks = [];
for (let i = 0; i < records.length; i += CHUNK_SIZE) {
  chunks.push(records.slice(i, i + CHUNK_SIZE));
}

// Write SQL files for each chunk
chunks.forEach((chunk, index) => {
  const sql = generateInsertSQL(chunk);
  fs.writeFileSync(`/Users/maikyon/Downloads/gen1-5k-real/insert_chunk_${index + 1}.sql`, sql);
});

console.log(`Generated ${chunks.length} SQL files`);