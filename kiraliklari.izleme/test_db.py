import pyodbc
from dotenv import load_dotenv
import os

load_dotenv()

print("Available ODBC Drivers:")
for driver in pyodbc.drivers():
    print(f" - {driver}")

server = os.getenv('DB_SERVER')
database = os.getenv('DB_DATABASE')
username = os.getenv('DB_USER')
password = os.getenv('DB_PASSWORD')

print(f"\nAttempting to connect to:")
print(f"Server: {server}")
print(f"Database: {database}")
print(f"User: {username}")

# Try multiple drivers if specific one fails
drivers_to_try = [
    '{ODBC Driver 17 for SQL Server}',
    '{ODBC Driver 18 for SQL Server}',
    '{SQL Server}',
    '{SQL Server Native Client 11.0}'
]

connected = False
for driver in drivers_to_try:
    if driver not in [d for d in pyodbc.drivers()] and not driver.startswith('{'):
         # simple check, but pyodbc.drivers() returns names without braces usually
         pass

    print(f"\nTrying driver: {driver}")
    try:
        conn_str = f'DRIVER={driver};SERVER={server};DATABASE={database};UID={username};PWD={password};TrustServerCertificate=yes;'
        conn = pyodbc.connect(conn_str, timeout=5)
        print("SUCCESS! Connected to database.")
        conn.close()
        connected = True
        break
    except Exception as e:
        print(f"Failed: {e}")

if not connected:
    print("\nCould not connect with any common driver. Please check credentials and server accessibility.")
