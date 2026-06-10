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
    
    # Check the latest 10 tickets
    cursor.execute("""
        SELECT TOP 10 t.kTicket, t.kBenutzer_Ersteller, t.kKunde, c.Firma, c.KundenNr 
        FROM [Ticketsystem].[tTicket] t
        LEFT JOIN [Custom].[Kunde] c ON t.kKunde = c.kKunde
        ORDER BY t.kTicket DESC
    """)
    rows = cursor.fetchall()
    print("Latest 10 tickets:")
    for row in rows:
        print(row)
        
except Exception as e:
    print("Error:", e)
