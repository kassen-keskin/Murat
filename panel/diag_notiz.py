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
    
    # Check the schema of Kunde.tNotiz
    cursor.execute("SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tNotiz' AND TABLE_SCHEMA = 'Kunde'")
    print("Kunde.tNotiz columns:", cursor.fetchall())
    
    # Also get top 1 record to see what typical values are
    cursor.execute("SELECT TOP 1 * FROM Kunde.tNotiz")
    row = cursor.fetchone()
    if row:
        columns = [column[0] for column in cursor.description]
        print("Top 1 record:", dict(zip(columns, row)))
        
except Exception as e:
    print("Error:", e)
