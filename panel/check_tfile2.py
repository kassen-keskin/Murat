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
    
    # Check schema of dbo.tFile
    cursor.execute("SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tFile' AND TABLE_SCHEMA = 'dbo'")
    print("Schema of dbo.tFile:", cursor.fetchall())
    
    # Get top 1 kFile
    cursor.execute("SELECT TOP 1 kFile FROM dbo.tFile")
    row = cursor.fetchone()
    print("Top 1 kFile in dbo.tFile:", row)
    
except Exception as e:
    print("Error:", e)
