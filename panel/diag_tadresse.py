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
    
    # Try to find Firma for kKunde = 8
    cursor.execute("""
        SELECT a.cFirma, k.cKundenNr 
        FROM dbo.tKunde k 
        LEFT JOIN dbo.tAdresse a ON k.kKunde = a.kKunde
        WHERE k.kKunde = 8
    """)
    print("tAdresse for kKunde 8:", cursor.fetchall())
    
    cursor.execute("""
        SELECT a.cFirma, k.cKundenNr 
        FROM dbo.tKunde k 
        LEFT JOIN dbo.tAdresse a ON k.kKunde = a.kKunde
        WHERE k.kKunde = 9251
    """)
    print("tAdresse for kKunde 9251:", cursor.fetchall())
    
except Exception as e:
    print("Error:", e)
