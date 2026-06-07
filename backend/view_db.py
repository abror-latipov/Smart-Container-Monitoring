import sqlite3

conn = sqlite3.connect("smart_container.db")
cursor = conn.cursor()

try:
    cursor.execute("SELECT * FROM sensor_data")
    rows = cursor.fetchall()
    
    # Get column names
    colnames = [description[0] for description in cursor.description]
    print(" | ".join(colnames))
    print("-" * 100)
    
    for row in rows:
        print(" | ".join(map(str, row)))
        
except Exception as e:
    print(f"Error: {e}")
finally:
    conn.close()
