import pyodbc, os
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
cursor.execute("SELECT TOP 1 * FROM [Custom].[LotusKundenLisans]")
print([col[0] for col in cursor.description])
