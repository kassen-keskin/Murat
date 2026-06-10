import os
from dotenv import load_dotenv
import pyodbc
import datetime

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
    now = datetime.datetime.now()
    
    cursor.execute("""
        SET NOCOUNT ON;
        INSERT INTO [dbo].[tFile]
        ([bFile], [kBenutzer], [dErstellDatum], [cFileHash], [cFileName], [cFileType], [nFileSizeKB])
        VALUES (?, ?, ?, ?, ?, ?, ?);
        SELECT SCOPE_IDENTITY();
    """, (b'', 1, now, '', 'message.html', '.html', 0))
    kFile = int(cursor.fetchone()[0])
    
    print("Inserted kFile:", kFile)
    
    conn.rollback() # Don't commit, just test
    
except Exception as e:
    print("Error:", e)
