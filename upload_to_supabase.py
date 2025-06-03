import os
import glob

# The Supabase project ID
PROJECT_ID = "ivydpvtbjlsebplnzsxs"

# Find all SQL files
sql_files = sorted(glob.glob('insert_chunk_*.sql'), key=lambda x: int(x.split('_')[2].split('.')[0]))

print(f"Found {len(sql_files)} SQL files to upload")

# Read and process each file
for i, sql_file in enumerate(sql_files[:5]):  # Start with first 5 files
    print(f"Processing {sql_file}...")
    
    with open(sql_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    # Clean up the SQL (remove extra newlines and formatting issues)
    sql_content = sql_content.replace('\n', ' ')
    sql_content = ' '.join(sql_content.split())  # Normalize whitespace
    
    # Write cleaned SQL to a new file for MCP execution
    clean_file = f"clean_{sql_file}"
    with open(clean_file, 'w', encoding='utf-8') as f:
        f.write(sql_content)
    
    print(f"Created cleaned file: {clean_file}")

print("Ready for MCP upload!")