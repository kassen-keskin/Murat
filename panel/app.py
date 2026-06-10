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
driver = os.getenv('DB_DRIVER', '{ODBC Driver 17 for SQL Server}') # Read from env or use default

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

TESLIMAT_CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'teslimat_config.json')

@app.route('/api/teslimat_config', methods=['GET', 'POST'])
def manage_teslimat_config():
    if request.method == 'GET':
        try:
            if os.path.exists(TESLIMAT_CONFIG_FILE):
                with open(TESLIMAT_CONFIG_FILE, 'r', encoding='utf-8') as f:
                    return jsonify(json.load(f))
            # Return a default empty structure if file doesn't exist
            return jsonify({"steps": []})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
            
    if request.method == 'POST':
        try:
            data = request.get_json()
            with open(TESLIMAT_CONFIG_FILE, 'w', encoding='utf-8') as f:
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

@app.route('/api/lotus-lisans')
def get_lotus_lisans():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500

    cursor = conn.cursor()
    try:
        cached = get_cached_data('lotus_lisans')
        if cached is not None:
            return make_cached_response(cached, 'HIT')

        query = """
        SELECT *
        FROM [Custom].[LotusKundenLisans] WITH (NOLOCK)
        ORDER BY [kKunde] DESC
        """
        cursor.execute(query)
        columns = [column[0] for column in cursor.description]
        results = []
        for row in cursor.fetchall():
            results.append(dict(zip(columns, row)))

        set_cached_data('lotus_lisans', results)
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

KUNDEN_MAPPINGS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'kunden_mappings.json')

@app.route('/api/kunde_columns')
def get_kunde_columns():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT TOP 1 * FROM [Custom].[Kunde]")
        columns = [column[0] for column in cursor.description]
        return jsonify(columns)
    except Exception as e:
        print(f"Query failed: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/kunde/<kunden_nr>')
def get_kunde(kunden_nr):
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    
    cursor = conn.cursor()
    try:
        query = "SELECT * FROM [Custom].[Kunde] WHERE KundenNr = ?"
        cursor.execute(query, (kunden_nr,))
        
        columns = [column[0] for column in cursor.description]
        row = cursor.fetchone()
        
        if row:
            result = dict(zip(columns, row))
            return jsonify(result)
        else:
            return jsonify({"error": "Not found"}), 404
            
    except Exception as e:
        print(f"Query failed: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/mappings/<form_id>', methods=['GET', 'POST'])
def manage_mappings(form_id):
    if request.method == 'GET':
        try:
            if os.path.exists(KUNDEN_MAPPINGS_FILE):
                with open(KUNDEN_MAPPINGS_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    return jsonify(data.get(form_id, {}))
            return jsonify({})
        except Exception as e:
            return jsonify({"error": str(e)}), 500
            
    if request.method == 'POST':
        try:
            new_mapping = request.get_json()
            data = {}
            if os.path.exists(KUNDEN_MAPPINGS_FILE):
                with open(KUNDEN_MAPPINGS_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
            
            data[form_id] = new_mapping
            
            with open(KUNDEN_MAPPINGS_FILE, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=4)
            return jsonify({"success": True})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

import datetime

@app.route('/api/ticket-users')
def get_ticket_users():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    
    cursor = conn.cursor()
    try:
        cached = get_cached_data('ticket_users')
        if cached is not None:
            return make_cached_response(cached, 'HIT')

        query = """
        SELECT [kBenutzer]
              ,[cLogin]
              ,[cName]
          FROM [eazybusiness].[dbo].[tBenutzer] WITH (NOLOCK)
        """
        cursor.execute(query)
        columns = [column[0] for column in cursor.description]
        results = []
        for row in cursor.fetchall():
            results.append(dict(zip(columns, row)))

        set_cached_data('ticket_users', results)
        return make_cached_response(results, 'MISS')
    except Exception as e:
        print(f"Query failed: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/tickets', methods=['GET'])
def get_tickets():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    
    cursor = conn.cursor()
    try:
        query = """
        SELECT t.[kTicket]
              ,t.[cEindeutigeId]
              ,t.[kStatus]
              ,t.[nPrioritaet]
              ,t.[dLoesung]
              ,t.[dAenderung]
              ,t.[dFaelligAm]
              ,t.[kBenutzer_Ersteller]
              ,t.[kBenutzer_Bearbeiter]
              ,t.[kKunde]
              ,c.[KundenNr]
              ,c.[Firma]
              ,e.[cTitelErsteNachricht]
              ,e.[nAnzahlNachrichten]
              ,e.[dEmpfangLetzteNachricht]
          FROM [Ticketsystem].[tTicket] t WITH (NOLOCK)
          LEFT JOIN [Custom].[KundenMaster] c WITH (NOLOCK) ON t.[kKunde] = c.[kKunde]
          LEFT JOIN [Ticketsystem].[tTicketEckdaten] e WITH (NOLOCK) ON t.[kTicket] = e.[kTicket]
          ORDER BY t.[dAenderung] DESC
        """
        cursor.execute(query)
        columns = [column[0] for column in cursor.description]
        results = []
        for row in cursor.fetchall():
            row_dict = dict(zip(columns, row))
            # Format datetime objects for JSON serialization
            for key, value in row_dict.items():
                if isinstance(value, datetime.datetime):
                    row_dict[key] = value.isoformat()
            results.append(row_dict)

        return jsonify(results)
    except Exception as e:
        print(f"Query failed: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/tickets/<int:id>', methods=['GET'])
def get_ticket_details(id):
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    
    cursor = conn.cursor()
    try:
        # 1. Fetch ticket main info
        query_ticket = """
        SELECT t.[kTicket], t.[cEindeutigeId], t.[kStatus], t.[nPrioritaet], t.[dAenderung], t.[kKunde], t.[kBenutzer_Bearbeiter], c.[Firma], c.[KundenNr]
        FROM [Ticketsystem].[tTicket] t WITH (NOLOCK)
        LEFT JOIN [Custom].[KundenMaster] c WITH (NOLOCK) ON t.[kKunde] = c.[kKunde]
        WHERE t.[kTicket] = ?
        """
        cursor.execute(query_ticket, (id,))
        columns_t = [column[0] for column in cursor.description]
        row_t = cursor.fetchone()
        if not row_t:
             return jsonify({"error": "Ticket not found"}), 404
        
        ticket_data = dict(zip(columns_t, row_t))
        for key, value in ticket_data.items():
            if isinstance(value, datetime.datetime):
                ticket_data[key] = value.isoformat()

        # 2. Fetch messages
        query_msgs = """
        SELECT [kNachricht], [cInhalt], [dErstellung], [kBenutzer_Ersteller], [nRichtung], [cBeschreibung]
        FROM [Ticketsystem].[tNachricht] WITH (NOLOCK)
        WHERE [kTicket] = ?
        ORDER BY [dErstellung] ASC
        """
        cursor.execute(query_msgs, (id,))
        columns_m = [column[0] for column in cursor.description]
        messages = []
        for row in cursor.fetchall():
            msg_dict = dict(zip(columns_m, row))
            for key, value in msg_dict.items():
                if isinstance(value, datetime.datetime):
                    msg_dict[key] = value.isoformat()
            messages.append(msg_dict)
            
        ticket_data['messages'] = messages
        return jsonify(ticket_data)
        
    except Exception as e:
        print(f"Query failed: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/tickets', methods=['POST'])
def create_ticket():
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    
    data = request.get_json()
    kKunde = data.get('kKunde', None)
    cTitel = data.get('cTitel', '')
    cInhalt = data.get('cInhalt', '')
    kBenutzer = data.get('kBenutzer', 1) # Default to 1 if not provided
    
    # Simple validation
    if not cInhalt:
         return jsonify({"error": "Content is required"}), 400

    cursor = conn.cursor()
    try:
        # Using 1 as Open status, Priority 1 as Normal.
        now = datetime.datetime.now()
        
        # Format Ticket ID: T{YY}-{DD}{AY}{Seq}
        tr_months = {
            1: 'OCAK', 2: 'SUBAT', 3: 'MART', 4: 'NISAN', 5: 'MAYIS', 6: 'HAZIRAN',
            7: 'TEMMUZ', 8: 'AGUSTOS', 9: 'EYLUL', 10: 'EKIM', 11: 'KASIM', 12: 'ARALIK'
        }
        yy = now.strftime("%y")
        dd = now.strftime("%d")
        ay = tr_months[now.month]
        prefix = f"T{yy}-{dd}{ay}"
        
        cursor.execute("SELECT cEindeutigeId FROM [Ticketsystem].[tTicket] WITH (NOLOCK) WHERE cEindeutigeId LIKE ?", (prefix + '%',))
        existing_ids = cursor.fetchall()
        max_seq = 0
        for row in existing_ids:
            if row[0] and row[0].startswith(prefix):
                seq_str = row[0][len(prefix):]
                if seq_str.isdigit():
                    seq = int(seq_str)
                    if seq > max_seq:
                        max_seq = seq
        new_seq = max_seq + 1
        new_eindeutige_id = f"{prefix}{new_seq}"
        
        # 1. Insert into tTicket
        cursor.execute("""
            SET NOCOUNT ON;
            INSERT INTO [Ticketsystem].[tTicket] 
            ([cEindeutigeId], [kStatus], [nPrioritaet], [dAenderung], [kBenutzer_Ersteller], [kKunde], [nIstInPapierkorb], [nBenutzererstellt], [nVollstaendigAngelegt])
            VALUES (?, ?, ?, ?, ?, ?, 0, 1, 1);
            SELECT SCOPE_IDENTITY();
        """, (new_eindeutige_id, 1, 1, now, kBenutzer, kKunde))
        
        new_ticket_id = int(cursor.fetchone()[0])
        
        # 2. Insert dummy file for HTML content
        cursor.execute("""
            SET NOCOUNT ON;
            INSERT INTO [dbo].[tFile]
            ([bFile], [kBenutzer], [dErstellDatum], [cFileHash], [cFileName], [cFileType], [nFileSizeKB])
            VALUES (?, ?, ?, ?, ?, ?, ?);
            SELECT SCOPE_IDENTITY();
        """, (b'', kBenutzer, now, '', 'message.html', '.html', 0))
        kFile_HtmlInhalt = int(cursor.fetchone()[0])
        
        # 3. Insert initial message into tNachricht
        cursor.execute("""
            SET NOCOUNT ON;
            INSERT INTO [Ticketsystem].[tNachricht]
            ([cInhalt], [dErstellung], [cBeschreibung], [kTicket], [kBenutzer_Ersteller], [nRichtung], [dEmpfangen], [nVorgangserkennungGelaufen], [kFile_HtmlInhalt], [nVollstaendigAngelegt])
            VALUES (?, ?, ?, ?, ?, 0, ?, 1, ?, 1);
            SELECT SCOPE_IDENTITY();
        """, (cInhalt, now, cTitel, new_ticket_id, kBenutzer, now, kFile_HtmlInhalt))
        
        # 4. Insert or update tTicketEckdaten
        cursor.execute("""
            INSERT INTO [Ticketsystem].[tTicketEckdaten]
            ([kTicket], [nAnzahlNachrichten], [nAnzahlAnhaenge], [cInhaltErsteNachricht], [nRichtungLetzteNachricht], [cTitelErsteNachricht], [dEmpfangLetzteNachricht])
            VALUES (?, 1, 0, ?, 0, ?, ?)
        """, (new_ticket_id, cInhalt, cTitel, now))
        
        # 5. Insert into tNotiz (Ticket Created)
        if kKunde:
            cursor.execute("SELECT cName, cLogin FROM [eazybusiness].[dbo].[tBenutzer] WITH (NOLOCK) WHERE kBenutzer = ?", (kBenutzer,))
            user_row = cursor.fetchone()
            user_name = user_row[0] or user_row[1] if user_row else "Bilinmeyen Kullanıcı"
            
            date_str = now.strftime("%d.%m.%Y")
            notiz_text = f"{new_eindeutige_id} nolu '{cTitel}' konulu Ticket {user_name} tarafindan {date_str} tarihinde açıldı."
            
            cursor.execute("""
                SET NOCOUNT ON;
                INSERT INTO [Kunde].[tNotiz] ([kKunde], [kAuftrag], [cNotiz], [nTyp], [dErstellt], [kBenutzer])
                VALUES (?, 0, ?, 0, ?, ?);
            """, (kKunde, notiz_text, now, kBenutzer))

        conn.commit()
        return jsonify({"success": True, "kTicket": new_ticket_id})
        
    except Exception as e:
        conn.rollback()
        print(f"Insert failed: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/tickets/<int:id>/reply', methods=['POST'])
def reply_ticket(id):
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    
    data = request.get_json()
    cInhalt = data.get('cInhalt', '')
    kBenutzer = data.get('kBenutzer', 1)
    
    if not cInhalt:
         return jsonify({"error": "Content is required"}), 400

    cursor = conn.cursor()
    try:
        now = datetime.datetime.now()
        
        # 1. Insert dummy file for HTML content
        cursor.execute("""
            SET NOCOUNT ON;
            INSERT INTO [dbo].[tFile]
            ([bFile], [kBenutzer], [dErstellDatum], [cFileHash], [cFileName], [cFileType], [nFileSizeKB])
            VALUES (?, ?, ?, ?, ?, ?, ?);
            SELECT SCOPE_IDENTITY();
        """, (b'', kBenutzer, now, '', 'message.html', '.html', 0))
        kFile_HtmlInhalt = int(cursor.fetchone()[0])
        
        # 2. Insert message
        cursor.execute("""
            SET NOCOUNT ON;
            INSERT INTO [Ticketsystem].[tNachricht]
            ([cInhalt], [dErstellung], [kTicket], [kBenutzer_Ersteller], [nRichtung], [dEmpfangen], [nVorgangserkennungGelaufen], [kFile_HtmlInhalt], [nVollstaendigAngelegt])
            VALUES (?, ?, ?, ?, 0, ?, 1, ?, 1);
            SELECT SCOPE_IDENTITY();
        """, (cInhalt, now, id, kBenutzer, now, kFile_HtmlInhalt))
        
        # 3. Update Ticket Modification Date
        cursor.execute("""
            UPDATE [Ticketsystem].[tTicket]
            SET [dAenderung] = ?
            WHERE [kTicket] = ?
        """, (now, id))
        
        # 3. Update Eckdaten
        cursor.execute("""
            UPDATE [Ticketsystem].[tTicketEckdaten]
            SET [nAnzahlNachrichten] = [nAnzahlNachrichten] + 1,
                [dEmpfangLetzteNachricht] = ?,
                [nRichtungLetzteNachricht] = 0
            WHERE [kTicket] = ?
        """, (now, id))
        
        conn.commit()
        return jsonify({"success": True})
        
    except Exception as e:
        conn.rollback()
        print(f"Reply failed: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/tickets/<int:id>/status', methods=['PATCH'])
def update_ticket_status(id):
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    
    data = request.get_json()
    new_status = data.get('kStatus')
    
    if not new_status:
         return jsonify({"error": "Status is required"}), 400

    cursor = conn.cursor()
    try:
        now = datetime.datetime.now()
        # If status is 3 (resolved), we can also set dLoesung
        if new_status == 3:
            cursor.execute("""
                UPDATE [Ticketsystem].[tTicket]
                SET [kStatus] = ?, [dAenderung] = ?, [dLoesung] = ?
                WHERE [kTicket] = ?
            """, (new_status, now, now, id))
        else:
            cursor.execute("""
                UPDATE [Ticketsystem].[tTicket]
                SET [kStatus] = ?, [dAenderung] = ?
                WHERE [kTicket] = ?
            """, (new_status, now, id))
            
        # Fetch ticket info for Notiz
        cursor.execute("""
            SELECT t.kKunde, t.cEindeutigeId, e.cTitelErsteNachricht 
            FROM [Ticketsystem].[tTicket] t WITH (NOLOCK)
            LEFT JOIN [Ticketsystem].[tTicketEckdaten] e WITH (NOLOCK) ON t.kTicket = e.kTicket
            WHERE t.kTicket = ?
        """, (id,))
        ticket_row = cursor.fetchone()
        
        if ticket_row and ticket_row[0]:
            kKunde = ticket_row[0]
            cEindeutigeId = ticket_row[1] or str(id)
            cTitel = ticket_row[2] or "Başlıksız"
            
            # Fetch user name
            kBenutzer = data.get('kBenutzer', 1)
            cursor.execute("SELECT cName, cLogin FROM [eazybusiness].[dbo].[tBenutzer] WITH (NOLOCK) WHERE kBenutzer = ?", (kBenutzer,))
            user_row = cursor.fetchone()
            user_name = user_row[0] or user_row[1] if user_row else "Bilinmeyen Kullanıcı"
                
            # Determine action text
            action_str = "durumu değiştirildi"
            if new_status == 1:
                action_str = "yeniden açıldı"
            elif new_status == 2:
                action_str = "beklemeye alındı"
            elif new_status == 3:
                action_str = "çözüldü"
                
            # Format date DD.MM.YYYY
            date_str = now.strftime("%d.%m.%Y")
            notiz_text = f"{cEindeutigeId} nolu '{cTitel}' konulu Ticket {user_name} tarafindan {date_str} tarihinde {action_str}."
            
            # Insert into Kunde.tNotiz
            cursor.execute("""
                SET NOCOUNT ON;
                INSERT INTO [Kunde].[tNotiz] ([kKunde], [kAuftrag], [cNotiz], [nTyp], [dErstellt], [kBenutzer])
                VALUES (?, 0, ?, 0, ?, ?);
            """, (kKunde, notiz_text, now, kBenutzer))
            
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        conn.rollback()
        print(f"Update failed: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=False, port=3000)

