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
    
    # Check if kKunde 8 is in dbo.tKunde
    cursor.execute("SELECT cKundenNr, cFirma FROM dbo.tKunde WHERE kKunde = 8")
    print("dbo.tKunde for 8:", cursor.fetchall())
    
    # Check if kKunde 8 is in Custom.Kunde
    cursor.execute("SELECT KundenNr, Firma FROM Custom.Kunde WHERE kKunde = 8")
    print("Custom.Kunde for 8:", cursor.fetchall())
    
    # Check the view definition for Custom.Kunde
    cursor.execute("SELECT VIEW_DEFINITION FROM INFORMATION_SCHEMA.VIEWS WHERE TABLE_SCHEMA = 'Custom' AND TABLE_NAME = 'Kunde'")
    print("View definition for Custom.Kunde:", cursor.fetchall())
    
except Exception as e:
    print("Error:", e)
