import pyodbc, os
from dotenv import load_dotenv
load_dotenv()
conn=pyodbc.connect(f'DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={os.getenv("DB_SERVER")};DATABASE={os.getenv("DB_DATABASE")};UID={os.getenv("DB_USER")};PWD={os.getenv("DB_PASSWORD")};TrustServerCertificate=yes;')
cursor=conn.cursor()
cursor.execute('SELECT TOP 1 * FROM [Custom].[Kunde]')
print([column[0] for column in cursor.description])
