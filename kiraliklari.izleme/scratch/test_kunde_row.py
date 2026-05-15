import pyodbc, os
from dotenv import load_dotenv
load_dotenv()
conn=pyodbc.connect(f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={os.getenv("DB_SERVER")};DATABASE={os.getenv("DB_DATABASE")};UID={os.getenv("DB_USER")};PWD={os.getenv("DB_PASSWORD")};TrustServerCertificate=yes;')
cursor=conn.cursor()
cursor.execute("SELECT TOP 1 KundenNr, TSENo FROM [Custom].[Kunde] WHERE TSENo IS NOT NULL AND len(TSENo) > 5")
print(cursor.fetchone())
