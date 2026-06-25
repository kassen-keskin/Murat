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
    
    # Check tNachricht schema
    print('=== tNachricht columns ===')
    cursor.execute("""
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'tNachricht' AND TABLE_SCHEMA = 'Ticketsystem' 
        ORDER BY ORDINAL_POSITION
    """)
    for row in cursor.fetchall():
        print(row)
    
    print('\n=== tTicket columns ===')
    cursor.execute("""
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'tTicket' AND TABLE_SCHEMA = 'Ticketsystem' 
        ORDER BY ORDINAL_POSITION
    """)
    for row in cursor.fetchall():
        print(row)
    
    print('\n=== Sample messages ===')
    cursor.execute("""
        SELECT TOP 5 kNachricht, kTicket, kBenutzer_Ersteller, dErstellung, nRichtung
        FROM Ticketsystem.tNachricht
        ORDER BY dErstellung DESC
    """)
    for row in cursor.fetchall():
        print(row)
        
except Exception as e:
    print('Error:', e)
