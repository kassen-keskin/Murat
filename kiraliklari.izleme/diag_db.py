import pyodbc
from dotenv import load_dotenv
import os

load_dotenv()

server = os.getenv('DB_SERVER')
database = os.getenv('DB_DATABASE')
username = os.getenv('DB_USER')
password = os.getenv('DB_PASSWORD')
driver = '{ODBC Driver 17 for SQL Server}'

connection_string = f'DRIVER={driver};SERVER={server};DATABASE={database};UID={username};PWD={password};TrustServerCertificate=yes;'

def test_custom_data():
    try:
        conn = pyodbc.connect(connection_string)
        cursor = conn.cursor()
        
        print("Checking Table Existence and Columns for [Custom].[KundenMaster]...")
        try:
            cursor.execute("SELECT TOP 0 * FROM [Custom].[KundenMaster]")
            columns = [column[0] for column in cursor.description]
            print(f"Columns found: {columns}")
        except Exception as e:
            print(f"Error checking table/columns: {e}")
            return

        print("\nChecking Row Count...")
        cursor.execute("SELECT COUNT(*) FROM [Custom].[KundenMaster]")
        count = cursor.fetchone()[0]
        print(f"Total Rows: {count}")

        if count > 0:
            print("\nFetching TOP 1 Sample...")
            cursor.execute("SELECT TOP 1 * FROM [Custom].[KundenMaster]")
            row = cursor.fetchone()
            print(f"Sample Data: {dict(zip(columns, row))}")

        conn.close()
    except Exception as e:
        print(f"Connection Failed: {e}")

if __name__ == '__main__':
    test_custom_data()
