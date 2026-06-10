import os
from dotenv import load_dotenv
import pyodbc

load_dotenv()

server = os.getenv('DB_SERVER')
database = os.getenv('DB_DATABASE')
username = os.getenv('DB_USER')
password = os.getenv('DB_PASSWORD')
driver = os.getenv('DB_DRIVER', '{ODBC Driver 17 for SQL Server}')

connection_string = f'DRIVER={driver};SERVER={server};DATABASE={database};UID={username};PWD={password};TrustServerCertificate=yes;'

try:
    conn = pyodbc.connect(connection_string)
    cursor = conn.cursor()
    
    # Check if kNotiz is identity
    cursor.execute("""
        SELECT is_identity 
        FROM sys.columns 
        WHERE object_id = OBJECT_ID('Kunde.tNotiz') AND name = 'kNotiz'
    """)
    row = cursor.fetchone()
    print("is_identity:", row[0] if row else "Column not found")
        
except Exception as e:
    print("Error:", e)
