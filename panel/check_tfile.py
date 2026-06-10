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
    
    # Check what's in tNachricht
    cursor.execute("SELECT TOP 5 kFile_HtmlInhalt FROM [Ticketsystem].[tNachricht]")
    print("Top 5 kFile_HtmlInhalt in tNachricht:", cursor.fetchall())
    
    # Check schema of tFile
    cursor.execute("SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tFile'")
    print("Schema of tFile:", cursor.fetchall())
    
except Exception as e:
    print("Error:", e)
