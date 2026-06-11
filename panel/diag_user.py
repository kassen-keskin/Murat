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
    
    # Check structure of eazybusiness.dbo.tBenutzer
    cursor.execute("SELECT TOP 5 kBenutzer, cName, cLogin, cPasswort FROM [eazybusiness].[dbo].[tBenutzer] WHERE cLogin = 'murat' OR cLogin = 'admin'")
    rows = cursor.fetchall()
    print("tBenutzer rows:", rows)
    
except Exception as e:
    print("Error:", e)
