import csv
import json

def parse_csv_and_generate_sql(csv_file_path):
    records = []
    
    with open(csv_file_path, 'r', encoding='utf-8') as file:
        csv_reader = csv.DictReader(file)
        for row in csv_reader:
            records.append(row)
    
    print(f"Parsed {len(records)} records")
    
    # Generate SQL in chunks
    chunk_size = 100
    chunk_num = 1
    
    for i in range(0, len(records), chunk_size):
        chunk = records[i:i + chunk_size]
        sql_lines = ["INSERT INTO midi_files (file_id, significant_prediction, predicted_music_style, style_change_timestamps, num_tokens, confidence_scores, prediction, human_agree) VALUES"]
        
        values = []
        for record in chunk:
            file_id = (record.get('file_id') or '').replace("'", "''")
            significant_prediction = (record.get('significant_prediction') or '').replace("'", "''")
            predicted_music_style = (record.get('predicted_music_style') or '').replace("'", "''")
            style_change_timestamps = (record.get('style_change_timestamps') or '').replace("'", "''")
            
            try:
                num_tokens = int(record.get('num_tokens', 0)) if record.get('num_tokens') else 'NULL'
            except:
                num_tokens = 'NULL'
            
            confidence_scores = (record.get('confidence_scores') or '').replace("'", "''")
            prediction = (record.get('prediction') or '').replace("'", "''")
            
            human_agree_val = (record.get('human_agree') or '').lower()
            if human_agree_val == 'true':
                human_agree = 'true'
            elif human_agree_val == 'false':
                human_agree = 'false'
            else:
                human_agree = 'NULL'
            
            # Skip header row if file_id is empty or matches header
            if not file_id or file_id == 'file_id':
                continue
                
            value = f"('{file_id}', '{significant_prediction}', '{predicted_music_style}', '{style_change_timestamps}', {num_tokens}, '{confidence_scores}', '{prediction}', {human_agree})"
            values.append(value)
        
        if values:  # Only create file if we have values
            sql_lines.append(',\n'.join(values))
            sql_lines.append(';')
            
            with open(f'insert_chunk_{chunk_num}.sql', 'w', encoding='utf-8') as f:
                f.write('\n'.join(sql_lines))
            
            chunk_num += 1
    
    print(f"Generated {chunk_num - 1} SQL files")

if __name__ == "__main__":
    parse_csv_and_generate_sql('/Users/maikyon/Downloads/gen1-5k-real/included_files.csv')