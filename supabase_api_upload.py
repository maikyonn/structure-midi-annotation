import csv
import os
from supabase import create_client, Client
import json

# Supabase configuration
SUPABASE_URL = "https://ivydpvtbjlsebplnzsxs.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2eWRwdnRiamxzZWJwbG56c3hzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg5MDk5MTAsImV4cCI6MjA2NDQ4NTkxMH0.1SQYwBgeYVreYITpHlwswS4L-q4H0b3WmQpqwKTGsqc"

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def upload_csv_to_supabase(csv_file_path, batch_size=100):
    """
    Upload CSV data to Supabase using the API instead of SQL queries
    """
    records = []
    
    print(f"Reading CSV file: {csv_file_path}")
    
    # Read CSV file
    with open(csv_file_path, 'r', encoding='utf-8') as file:
        csv_reader = csv.DictReader(file)
        for row in csv_reader:
            # Convert row to the format expected by Supabase
            record = {
                'file_id': row.get('file_id', ''),
                'significant_prediction': row.get('significant_prediction', ''),
                'predicted_music_style': row.get('predicted_music_style', ''),
                'style_change_timestamps': row.get('style_change_timestamps', ''),
                'num_tokens': int(row.get('num_tokens', 0)) if row.get('num_tokens') and row.get('num_tokens').isdigit() else None,
                'confidence_scores': row.get('confidence_scores', ''),
                'prediction': row.get('prediction', ''),
                'human_agree': row.get('human_agree', '').lower() == 'true' if row.get('human_agree', '').lower() in ['true', 'false'] else None
            }
            
            # Skip header row or empty file_id
            if record['file_id'] and record['file_id'] != 'file_id':
                records.append(record)
    
    print(f"Parsed {len(records)} records from CSV")
    
    # Upload in batches
    total_uploaded = 0
    errors = []
    
    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        batch_num = (i // batch_size) + 1
        
        try:
            print(f"Uploading batch {batch_num} ({len(batch)} records)...")
            
            # Insert batch to Supabase
            result = supabase.table('midi_files').insert(batch).execute()
            
            if result.data:
                total_uploaded += len(batch)
                print(f"✓ Batch {batch_num} uploaded successfully")
            else:
                print(f"✗ Batch {batch_num} failed - no data returned")
                errors.append(f"Batch {batch_num}: No data returned")
                
        except Exception as e:
            print(f"✗ Error uploading batch {batch_num}: {str(e)}")
            errors.append(f"Batch {batch_num}: {str(e)}")
            continue
    
    print(f"\nUpload Summary:")
    print(f"Total records processed: {len(records)}")
    print(f"Total records uploaded: {total_uploaded}")
    print(f"Errors: {len(errors)}")
    
    if errors:
        print("\nErrors encountered:")
        for error in errors:
            print(f"  - {error}")
    
    return total_uploaded, errors

def check_table_structure():
    """
    Check if the midi_files table exists and show its structure
    """
    try:
        # Try to fetch one record to check table structure
        result = supabase.table('midi_files').select('*').limit(1).execute()
        print("✓ Table 'midi_files' exists and is accessible")
        return True
    except Exception as e:
        print(f"✗ Error accessing table 'midi_files': {str(e)}")
        print("Make sure the table exists with the correct schema")
        return False

if __name__ == "__main__":
    # Check table accessibility first
    if not check_table_structure():
        exit(1)
    
    # Upload the CSV data
    csv_file_path = '/Users/maikyon/Downloads/gen1-5k-real/included_files.csv'
    
    if not os.path.exists(csv_file_path):
        print(f"Error: CSV file not found at {csv_file_path}")
        exit(1)
    
    uploaded_count, errors = upload_csv_to_supabase(csv_file_path)
    
    if uploaded_count > 0:
        print(f"\n🎉 Successfully uploaded {uploaded_count} records to Supabase!")
    else:
        print("\n❌ No records were uploaded. Please check the errors above.")