from flask import Flask, jsonify, make_response, send_from_directory, request
import json
import pyodbc
import os
import time
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder='public', static_url_path='')

CACHE_TTL = 300  # seconds
cache_store = {}


def make_cached_response(data, status='MISS'):
    resp = make_response(jsonify(data))
    resp.headers['X-Cache-Status'] = status
    resp.headers['Cache-Control'] = f'private, max-age={CACHE_TTL}'
    return resp


def get_cached_data(key):
    entry = cache_store.get(key)
    if entry and time.time() - entry['timestamp'] < CACHE_TTL:
        return entry['data']
    return None


def set_cached_data(key, data):
    cache_store[key] = {'data': data, 'timestamp': time.time()}

# Database configuration
server = os.getenv('DB_SERVER')
database = os.getenv('DB_DATABASE')
username = os.getenv('DB_USER')
password = os.getenv('DB_PASSWORD')
driver = '{ODBC Driver 17 for SQL Server}' # Default driver, might need adjustment based on system

connection_string = f'DRIVER={driver};SERVER={server};DATABASE={database};UID={username};PWD={password};TrustServerCertificate=yes;'

def get_db_connection():
    try:
        conn = pyodbc.connect(connection_string)
        return conn
    except Exception as e:
        print(f"Database connection failed: {e}")
        return None

@app.route('/')
def serve_index():
    return send_from_directory('public', 'index.html')

SATIS_DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'satis_data.json')

@app.route('/api/satis', methods=['GET', 'POST'])
def manage_satis_data():
    if request.method == 'GET':
        try:
            if os.path.exists(SATIS_DATA_FILE):
                with open(SATIS_DATA_FILE, 'r', encoding='utf-8') as f:
                    return jsonify(json.load(f))
            return jsonify({})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
            
    if request.method == 'POST':
        try:
            data = request.get_json()
            with open(SATIS_DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=4)
            return jsonify({"success": True})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

@app.route('/api/customers')
def get_customers():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    
    cursor = conn.cursor()
    try:
        cached = get_cached_data('customers')
        if cached is not None:
            return make_cached_response(cached, 'HIT')

        query = """
        SELECT [kKunde]
              ,[KundenNr]
              ,[Firma]
              ,[InhabeName]
              ,[Tel]
              ,[Mobil]
              ,[Strasse]
              ,[PLZ]
              ,[LisansNo]
              ,[KundenKategorie]
              ,[KundenGruppe]
              ,[Elster]
              ,[TamKontrolTarihi]
              ,[Servis]
          FROM [Custom].[MieteKundenMaster] WITH (NOLOCK)
          ORDER BY [KundenNr]
        """
        cursor.execute(query)
        columns = [column[0] for column in cursor.description]
        results = []
        for row in cursor.fetchall():
            results.append(dict(zip(columns, row)))

        set_cached_data('customers', results)
        return make_cached_response(results, 'MISS')
    except Exception as e:
        print(f"Query failed: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/customers_custom')
def get_customers_custom():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    
    cursor = conn.cursor()
    try:
        cached = get_cached_data('customers_custom')
        if cached is not None:
            return make_cached_response(cached, 'HIT')

        query = """
        SELECT [kKunde]
              ,[KundenNr]
              ,[Firma]
              ,[InhabeName]
              ,[KundenKategorie]
              ,[KundenGruppe]
              ,[KasaSayisi]
              ,[SeriKodluKasaSayisi]
              ,[ElsterSayisi]
              ,[AuftragSayisi]
              ,[NotSayisi]
              ,CASE WHEN [ElsterSayisi] > 0 THEN 1 ELSE 0 END AS [Elster]
              ,[BorcToplami]
              ,[BorcTarihi]
              ,[BorcTarihiGunSayisi]
              ,[Gesperrt]
              ,[TamKontrolTarihi]
              ,[Servis]
          FROM [Custom].[KundenMaster] WITH (NOLOCK)
          ORDER BY [KundenNr]
        """
        cursor.execute(query)
        columns = [column[0] for column in cursor.description]
        results = []
        for row in cursor.fetchall():
            results.append(dict(zip(columns, row)))

        set_cached_data('customers_custom', results)
        return make_cached_response(results, 'MISS')
    except Exception as e:
        print(f"Query failed: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/aylik-fatura')
def get_aylik_fatura():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor()
    try:
        cached = get_cached_data('aylik_fatura')
        if cached is not None:
            return make_cached_response(cached, 'HIT')

        query = """
        SELECT *
        FROM [Custom].[MieteKundenSonFaturaDetay] WITH (NOLOCK)
        ORDER BY [Kundennummer], [Artikelnummer]
        """
        cursor.execute(query)
        columns = [column[0] for column in cursor.description]
        results = []
        for row in cursor.fetchall():
            results.append(dict(zip(columns, row)))

        set_cached_data('aylik_fatura', results)
        return make_cached_response(results, 'MISS')
    except Exception as e:
        print(f"Query failed: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/details/<int:id>')
def get_details(id):
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    
    cursor = conn.cursor()
    try:
        query = "SELECT [kKunde], [Detay] FROM [Custom].[MieteKundenDetay] WHERE [kKunde] = ?"
        cursor.execute(query, (id,))
        
        columns = [column[0] for column in cursor.description]
        rows = cursor.fetchall()
        
        results = []
        for row in rows:
            results.append(dict(zip(columns, row)))
            
        return jsonify(results)
            
    except Exception as e:
        print(f"Query failed: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=False, port=3000)
