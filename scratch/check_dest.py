import psycopg2
import os

conn_str = os.getenv("INSFORGE_DATABASE_URL", "")
if not conn_str:
    raise SystemExit("Set INSFORGE_DATABASE_URL before running this script.")

try:
    conn = psycopg2.connect(conn_str)
    cur = conn.cursor()
    
    print("Updating Container 19 user_id to match sandbox bypass...")
    cur.execute("UPDATE containers SET user_id = '12345678-1234-5678-90ab-cdef12345678' WHERE id = 19;")
    conn.commit()
    print("Update successful!")
    
    print("\n=== CONTAINERS ===")
    cur.execute("SELECT id, name, user_id, status FROM containers WHERE id = 19;")
    print(cur.fetchall())
    
    cur.close()
    conn.close()
except Exception as e:
    print("Error:", e)
