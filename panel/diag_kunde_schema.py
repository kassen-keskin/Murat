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
    
    # Check the schema of dbo.tKunde
    cursor.execute("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'tKunde' AND TABLE_SCHEMA = 'dbo'")
    print("dbo.tKunde columns:", [c[0] for c in cursor.fetchall()])
    
    # Check what Custom.Kunde is
    cursor.execute("SELECT VIEW_DEFINITION FROM INFORMATION_SCHEMA.VIEWS WHERE TABLE_SCHEMA = 'Custom' AND TABLE_NAME = 'Kunde'")
    res = cursor.fetchall()
    if res:
        print("Custom.Kunde view definition:", res[0][0])
    else:
        print("Custom.Kunde is not a view.")
        
except Exception as e:
    print("Error:", e)
