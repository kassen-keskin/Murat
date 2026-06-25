import os
import pyodbc
from dotenv import load_dotenv

load_dotenv()

server = os.getenv('DB_SERVER')
database = os.getenv('DB_DATABASE')
username = os.getenv('DB_USER')
password = os.getenv('DB_PASSWORD')
driver = os.getenv('DB_DRIVER', '{ODBC Driver 17 for SQL Server}')

connection_string = f'DRIVER={driver};SERVER={server};DATABASE={database};UID={username};PWD={password};TrustServerCertificate=yes;'

conn = pyodbc.connect(connection_string)
cursor = conn.cursor()

cursor.execute("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA='Ticketsystem'")
tables = cursor.fetchall()
print("Tables in Ticketsystem schema:")
for t in tables:
    print(t.TABLE_NAME)

cursor.execute("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='Ticketsystem' AND TABLE_NAME='tTicketNachricht'")
columns = cursor.fetchall()
print("\nColumns in tTicketNachricht:")
for c in columns:
    print(c.COLUMN_NAME, c.DATA_TYPE)
