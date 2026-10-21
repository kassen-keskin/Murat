from flask import Flask, jsonify, request, send_from_directory
import pyodbc
import os
import re
import datetime
from decimal import Decimal, ROUND_HALF_UP
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder='public', static_url_path='')

server = os.getenv('DB_SERVER', r'WIN11JTL\JTLWAWI')
database = os.getenv('DB_DATABASE', 'Mandant_1')
username = os.getenv('DB_USER', 'sa')
password = os.getenv('DB_PASSWORD', 'kassenberlin')
driver = os.getenv('DB_DRIVER', '{ODBC Driver 17 for SQL Server}')
port = int(os.getenv('PORT', 3000))

connection_string = (
    f"DRIVER={driver};SERVER={server};DATABASE={database};"
    f"UID={username};PWD={password};TrustServerCertificate=yes;"
)

GERMAN_MONTHS = [
    "Januar", "Februar", "März", "April", "Mai", "Juni",
    "Juli", "August", "September", "Oktober", "November", "Dezember"
]


def get_db_connection():
    return pyodbc.connect(connection_string)


def parse_brutto(val):
    if val is None:
        return 0.0
    if isinstance(val, (int, float, Decimal)):
        return float(val)
    s = str(val).strip()
    if not s:
        return 0.0
    # Handle German number format e.g. "1.234,56" or "71,40"
    if ',' in s and '.' in s:
        s = s.replace('.', '').replace(',', '.')
    elif ',' in s:
        s = s.replace(',', '.')
    try:
        return float(s)
    except ValueError:
        return 0.0


@app.route('/')
def index():
    return send_from_directory('public', 'index.html')


@app.route('/api/init-data', methods=['GET'])
def get_init_data():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()

        # 1. Next order number base (MaxNr for current year + 1)
        year = datetime.date.today().year
        cursor.execute("""
            SELECT dbo.GetNextAuftragsNr(1) AS NextAuftragsNr,
                   (SELECT nNummer FROM dbo.tLaufendeNummern WHERE kLaufendeNummer = 3) AS LaufendeNummer
        """)
        nr_row = cursor.fetchone()
        first_auftrags_nr = nr_row.NextAuftragsNr if nr_row and nr_row.NextAuftragsNr else f"AU-{year}-13601"
        laufende_nr = nr_row.LaufendeNummer if nr_row else 0

        # Extract numeric base from AU-YYYY-NNNNN
        match = re.match(r'^(AU-\d{4}-)(\d+)$', first_auftrags_nr)
        if match:
            nr_prefix = match.group(1)
            start_nr = int(match.group(2))
        else:
            nr_prefix = f"AU-{year}-"
            start_nr = (laufende_nr or 13600) + 1

        # 2. Fetch rows from [Custom].[MieteKundenSonFaturaDetay]
        cursor.execute("""
            SELECT 
                Kundennummer,
                KassenKunde,
                K_Firma,
                Auftragsnummer,
                [Zahlungsart Auftrag] AS Zahlungsart,
                Auftragsdatum,
                ISNULL(Artikelnummer, '') AS Artikelnummer,
                ISNULL([Bezeichnung (Position)], '') AS Bezeichnung,
                Menge,
                [USt. in %] AS Ust,
                [Brutto-VK] AS BruttoVK
            FROM [Custom].[MieteKundenSonFaturaDetay]
            ORDER BY TRY_CAST(Kundennummer AS INT), Kundennummer
        """)
        rows = cursor.fetchall()

        customers_map = {}
        customers_order = []

        for r in rows:
            knr = str(r.Kundennummer).strip()
            if knr not in customers_map:
                customers_map[knr] = {
                    "kundennummer": knr,
                    "kassenKunde": bool(r.KassenKunde),
                    "firma": r.K_Firma or "",
                    "zahlungsart": r.Zahlungsart or ("Bank" if r.KassenKunde else "Rechnung"),
                    "originalAuftragsnummer": r.Auftragsnummer or "",
                    "selected": True,
                    "isCustomAdded": False,
                    "positions": []
                }
                customers_order.append(knr)

            brutto_val = parse_brutto(r.BruttoVK)
            customers_map[knr]["positions"].append({
                "artikelnummer": str(r.Artikelnummer or "").strip(),
                "bezeichnung": str(r.Bezeichnung or "").strip(),
                "originalBezeichnung": str(r.Bezeichnung or "").strip(),
                "menge": float(r.Menge if r.Menge is not None else 1),
                "ust": float(r.Ust if r.Ust is not None else 19),
                "brutto": brutto_val
            })

        customers_list = [customers_map[k] for k in customers_order]

        # 3. Fetch all customers for "Add Customer" modal
        cursor.execute("""
            SELECT 
                kKunde,
                cKundenNr AS Kundennummer,
                ISNULL(cFirma, '') AS Firma,
                ISNULL(cVorname, '') + ' ' + ISNULL(cName, '') AS Inhaber,
                ISNULL(cOrt, '') AS Ort,
                ISNULL(KassenKunde, 0) AS KassenKunde,
                ISNULL(KundenGruppe, '') AS KundenGruppe
            FROM Kunde.lvKunde WITH (NOLOCK)
            WHERE ISNULL(Gesperrt, 0) = 0
            ORDER BY TRY_CAST(cKundenNr AS INT), cKundenNr
        """)
        all_customers = []
        for c in cursor.fetchall():
            all_customers.append({
                "kKunde": c.kKunde,
                "kundennummer": str(c.Kundennummer or "").strip(),
                "firma": str(c.Firma or "").strip(),
                "inhaber": str(c.Inhaber or "").strip(),
                "ort": str(c.Ort or "").strip(),
                "kassenKunde": bool(c.KassenKunde),
                "zahlungsart": "Bank" if c.KassenKunde else "Rechnung",
                "kundenGruppe": str(c.KundenGruppe or "").strip()
            })

        # 4. Fetch rental articles for quick selection when adding/editing positions
        cursor.execute("""
            SELECT 
                A.kArtikel,
                A.cArtNr AS Artikelnummer,
                AB.cName AS Bezeichnung,
                CAST(ROUND(A.fVKNetto * 1.19, 2) AS DECIMAL(10,2)) AS BruttoVK
            FROM dbo.tArtikel A WITH (NOLOCK)
            JOIN dbo.tArtikelBeschreibung AB WITH (NOLOCK)
                ON AB.kArtikel = A.kArtikel AND AB.kSprache = 1 AND AB.kPlattform = 1
            WHERE AB.cName LIKE '%Miete%' OR AB.cName LIKE '%Kassenmiete%'
            ORDER BY TRY_CAST(A.cArtNr AS INT), A.cArtNr
        """)
        rental_articles = []
        for a in cursor.fetchall():
            rental_articles.append({
                "kArtikel": a.kArtikel,
                "artikelnummer": str(a.Artikelnummer or "").strip(),
                "bezeichnung": str(a.Bezeichnung or "").strip(),
                "brutto": float(a.BruttoVK or 0.0)
            })

        return jsonify({
            "success": True,
            "database": database,
            "server": server,
            "nrPrefix": nr_prefix,
            "startNr": start_nr,
            "laufendeNr": laufende_nr,
            "customers": customers_list,
            "allCustomers": all_customers,
            "rentalArticles": rental_articles
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/customer-last-invoice/<kundennummer>', methods=['GET'])
def get_customer_last_invoice(kundennummer):
    """Fetch last invoice positions for a customer if they are added manually."""
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT TOP 1 R.kRechnung
            FROM Rechnung.tRechnung R WITH (NOLOCK)
            JOIN Kunde.lvKunde K WITH (NOLOCK) ON K.kKunde = R.kKunde
            WHERE K.cKundenNr = ?
            ORDER BY R.kRechnung DESC
        """, (kundennummer,))
        row = cursor.fetchone()
        if not row:
            return jsonify({"success": True, "positions": []})

        cursor.execute("""
            SELECT 
                ISNULL(cArtNr, '') AS Artikelnummer,
                ISNULL(cName, '') AS Bezeichnung,
                fAnzahl AS Menge,
                fMwSt AS Ust,
                fVkBruttoGesamt AS BruttoVK
            FROM Rechnung.tRechnungPosition WITH (NOLOCK)
            WHERE kRechnung = ?
            ORDER BY nSort
        """, (row.kRechnung,))
        positions = []
        for p in cursor.fetchall():
            positions.append({
                "artikelnummer": str(p.Artikelnummer or "").strip(),
                "bezeichnung": str(p.Bezeichnung or "").strip(),
                "originalBezeichnung": str(p.Bezeichnung or "").strip(),
                "menge": float(p.Menge if p.Menge is not None else 1),
                "ust": float(p.Ust if p.Ust is not None else 19),
                "brutto": float(p.BruttoVK if p.BruttoVK is not None else 0.0)
            })
        return jsonify({"success": True, "positions": positions})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if conn:
            conn.close()


@app.route('/api/create-orders', methods=['POST'])
def create_orders():
    """
    Creates orders in JTL-Wawi exactly as captured in 1.trc (Tavsiye 1):
    - Lookup customer in Kunde.lvKundendaten
    - Lookup Zahlungsart in dbo.tZahlungsart
    - INSERT INTO Verkauf.tAuftrag
    - INSERT INTO Verkauf.tAuftragText
    - INSERT INTO Verkauf.tAuftragAdresse (nTyp = 0 and nTyp = 1)
    - INSERT INTO Verkauf.tAuftragPosition
    - EXEC Verkauf.spAuftragEckdatenBerechnen
    - Update dbo.tLaufendeNummern
    """
    data = request.get_json() or {}
    orders = data.get("orders", [])
    order_date_str = data.get("orderDate", "")  # YYYY-MM-DD

    if not orders:
        return jsonify({"success": False, "error": "Oluşturulacak sipariş seçilmedi."}), 400

    try:
        order_dt = datetime.datetime.strptime(order_date_str, "%Y-%m-%d")
    except ValueError:
        return jsonify({"success": False, "error": "Geçersiz sipariş tarihi formatı."}), 400

    conn = None
    try:
        conn = get_db_connection()
        conn.autocommit = False
        cursor = conn.cursor()

        # Lookup FirmaHistory (for kFirma = 1)
        cursor.execute("SELECT TOP 1 kFirmaHistory FROM dbo.tFirmaHistory WHERE kFirma = 1 ORDER BY kFirmaHistory DESC")
        fh_row = cursor.fetchone()
        k_firma_history = int(fh_row.kFirmaHistory) if fh_row else 8

        # Lookup Zahlungsart mapping
        cursor.execute("SELECT kZahlungsart, cName FROM dbo.tZahlungsart")
        zahlungsarten = {str(r.cName).strip().lower(): int(r.kZahlungsart) for r in cursor.fetchall()}

        # Lookup Standard Text
        cursor.execute("SELECT TOP 1 cText FROM dbo.tText WHERE cName = 'Bestellung standard'")
        txt_row = cursor.fetchone()
        standard_drucktext = txt_row.cText if txt_row and txt_row.cText else "Vielen Dank für Ihren Auftrag."

        created_orders = []
        skipped_orders = []

        for order in orders:
            kundennummer = str(order.get("kundennummer", "")).strip()
            auftrags_nr = str(order.get("auftragsnummer", "")).strip()
            zahlungsart_name = str(order.get("zahlungsart", "Rechnung")).strip()
            positions = order.get("positions", [])

            if not kundennummer or not auftrags_nr or not positions:
                continue

            # Check if AuftragsNr already exists
            cursor.execute("SELECT kAuftrag FROM Verkauf.tAuftrag WHERE cAuftragsNr = ?", (auftrags_nr,))
            if cursor.fetchone():
                skipped_orders.append({
                    "kundennummer": kundennummer,
                    "auftragsnummer": auftrags_nr,
                    "reason": f"Sipariş numarası ({auftrags_nr}) zaten mevcut."
                })
                continue

            # Fetch customer details from Kunde.lvKundendaten
            cursor.execute("SELECT TOP 1 * FROM Kunde.lvKundendaten WHERE cKundenNr = ?", (kundennummer,))
            kunde = cursor.fetchone()
            if not kunde:
                skipped_orders.append({
                    "kundennummer": kundennummer,
                    "auftragsnummer": auftrags_nr,
                    "reason": f"Müşteri bulunamadı ({kundennummer})."
                })
                continue

            k_kunde = int(kunde.kKunde)
            k_kundengruppe = int(kunde.kKundenGruppe) if getattr(kunde, 'kKundenGruppe', None) else 1
            k_sprache = int(kunde.kSprache) if getattr(kunde, 'kSprache', None) else 1
            c_ust_id = str(getattr(kunde, 'cUSTID', '') or '')
            c_iso = str(getattr(kunde, 'cISO', '') or 'DE') or 'DE'
            k_zahlungsart = zahlungsarten.get(zahlungsart_name.lower(), 9)

            # 1. INSERT INTO Verkauf.tAuftrag
            cursor.execute("""
                SET NOCOUNT ON;
                DECLARE @Identities TABLE (Id INT NOT NULL);
                INSERT INTO [Verkauf].[tAuftrag] (
                    [cWaehrung], [kVorgangsstatus], [kBenutzer], [kKunde], [cAuftragsNr], [nType], [dErstellt],
                    [kShopauftrag], [nBeschreibung], [cInet], [fFaktor], [kShop], [kFirmaHistory], [kPlattform],
                    [kSprache], [cExterneAuftragsnummer], [nSteuereinstellung], [cEbayUsername], [cShopZahlungsmodul],
                    [nHatUpload], [fZusatzGewicht], [cVersandlandISO], [cVersandlandBundeslandKuerzel],
                    [cVersandlandWaehrung], [fVersandlandWaehrungFaktor], [kVersandArt], [nZahlungszielTage],
                    [dVoraussichtlichesLieferdatum], [dAuslieferdatum], [fSkonto], [nSkontoTage], [nStorno],
                    [nKomplettAusgeliefert], [nLieferPrioritaet], [nPremiumVersand], [kRueckhaltegrund],
                    [kZahlungsart], [kWarenlager], [nIstExterneRechnung], [nIstReadOnly], [nMaxLiefertage],
                    [cOutboundId], [kFulfillmentLieferant], [cUstId], [nArchiv], [nReserviert], [nDebitorennr],
                    [nAuftragStatus], [cKundenAuftragsnummer], [cAmazonServiceLevel], [dExternesErstelldatum],
                    [kFarbe], [fFinanzierungskosten], [kAuftragQuelle], [nAuftragQuelleAktion], [kArtikelKarton],
                    [cKundenNr], [kKundengruppe], [dErstelltWawi], [dAuslieferungAb], [kAmazonUser], [cKundeUstId],
                    [nPending], [kBenutzerErstellt], [nSteuersonderbehandlung]
                )
                OUTPUT INSERTED.[kAuftrag] AS [Id] INTO @Identities
                VALUES (
                    N'EUR', NULL, 1, ?, ?, 1, ?,
                    NULL, 0, N'N', 1, NULL, ?, 5,
                    ?, N'', 0, N'', N'',
                    0, 0, ?, N'',
                    N'EUR', 1, 2, NULL,
                    NULL, NULL, NULL, NULL, 0,
                    0, 0, 0, NULL,
                    ?, NULL, 0, 0, NULL,
                    N'', NULL, N'', 0, 0, NULL,
                    0, N'', N'', NULL,
                    NULL, 0, NULL, NULL, NULL,
                    ?, ?, NULL, NULL, NULL, ?,
                    0, 0, 0
                );
                SELECT [Id] FROM @Identities;
            """, (
                k_kunde, auftrags_nr, order_dt,
                k_firma_history,
                k_sprache, c_iso,
                k_zahlungsart,
                kundennummer, k_kundengruppe, c_ust_id
            ))
            k_auftrag = int(cursor.fetchone()[0])

            # 2. INSERT INTO Verkauf.tAuftragText
            cursor.execute("""
                INSERT INTO [Verkauf].[tAuftragText] ([kAuftrag], [cAnmerkung], [cDrucktext], [cHinweis], [cVorgangsstatus])
                VALUES (?, N'', ?, N'', N'')
            """, (k_auftrag, standard_drucktext))

            # 3. INSERT INTO Verkauf.tAuftragAdresse (nTyp = 0 Billing, nTyp = 1 Shipping)
            for n_typ in (0, 1):
                cursor.execute("""
                    INSERT INTO [Verkauf].[tAuftragAdresse] (
                        [kAuftrag], [kKunde], [cFirma], [cAnrede], [cTitel], [cVorname], [cName],
                        [cStrasse], [cPLZ], [cOrt], [cLand], [cTel], [cZusatz], [cAdressZusatz],
                        [cPostID], [cMobil], [cMail], [cFax], [cBundesland], [cISO], [nTyp], [nZolldokumenteErforderlich]
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
                """, (
                    k_auftrag,
                    k_kunde,
                    str(getattr(kunde, 'cFirma', '') or ''),
                    str(getattr(kunde, 'cAnrede', '') or ''),
                    str(getattr(kunde, 'cTitel', '') or ''),
                    str(getattr(kunde, 'cVorname', '') or ''),
                    str(getattr(kunde, 'cName', '') or ''),
                    str(getattr(kunde, 'cStrasse', '') or ''),
                    str(getattr(kunde, 'cPLZ', '') or ''),
                    str(getattr(kunde, 'cOrt', '') or ''),
                    str(getattr(kunde, 'cLand', '') or 'Deutschland'),
                    str(getattr(kunde, 'cTel', '') or ''),
                    str(getattr(kunde, 'cZusatz', '') or ''),
                    str(getattr(kunde, 'cAdressZusatz', '') or ''),
                    str(getattr(kunde, 'cPostID', '') or ''),
                    str(getattr(kunde, 'cMobil', '') or ''),
                    str(getattr(kunde, 'cMail', '') or ''),
                    str(getattr(kunde, 'cFax', '') or ''),
                    str(getattr(kunde, 'cBundesland', '') or ''),
                    c_iso,
                    n_typ
                ))

            # 4. INSERT INTO Verkauf.tAuftragPosition
            for idx, pos in enumerate(positions, start=1):
                art_nr = str(pos.get("artikelnummer", "") or "").strip()
                bezeichnung = str(pos.get("bezeichnung", "") or "").strip()
                menge = Decimal(str(pos.get("menge", 1) or 1))
                mwst = Decimal(str(pos.get("ust", 19) or 19))
                brutto_gesamt = Decimal(str(pos.get("brutto", 0) or 0)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

                divisor = Decimal("1") + (mwst / Decimal("100"))
                netto_gesamt = (brutto_gesamt / divisor).quantize(Decimal("0.0000000000001"), rounding=ROUND_HALF_UP)
                vk_netto = (netto_gesamt / menge).quantize(Decimal("0.0000000000001"), rounding=ROUND_HALF_UP) if menge != 0 else Decimal("0")

                cursor.execute("""
                    INSERT INTO [Verkauf].[tAuftragPosition] (
                        [kArtikel], [kAuftrag], [cArtNr], [nReserviert], [cName], [cHinweis],
                        [fAnzahl], [fEkNetto], [fVkNetto], [fRabatt], [fMwSt], [nSort],
                        [cNameStandard], [kSteuerklasse], [nType], [cEinheit], [nHatUpload],
                        [kKonfigVater], [kKonfigItem], [kAmazonBestellungPos], [kAuftragStueckliste],
                        [kEbayTransaction], [fFaktor], [kSteuerschluessel], [cFNSKU],
                        [fVkNettoGesamt], [fVkBruttoGesamt]
                    ) VALUES (
                        NULL, ?, ?, 0, ?, N'',
                        ?, 0, ?, 0, ?, ?,
                        N'', 1, 0, N'', 0,
                        NULL, NULL, NULL, NULL,
                        NULL, 0, NULL, N'',
                        ?, ?
                    )
                """, (
                    k_auftrag, art_nr, bezeichnung,
                    menge, vk_netto, mwst, idx,
                    netto_gesamt.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP),
                    brutto_gesamt
                ))

            # 5. EXEC DEPRECATED.spAuftragEckdatenBerechnen (calls Verkauf.spAuftragEckdatenBerechnen)
            cursor.execute("EXEC DEPRECATED.spAuftragEckdatenBerechnen @kAuftrag = ?", (k_auftrag,))

            # 6. Update tLaufendeNummern if numeric suffix is higher
            m = re.match(r'^AU-\d{4}-(\d+)$', auftrags_nr)
            if m:
                num_val = int(m.group(1))
                cursor.execute("""
                    UPDATE dbo.tLaufendeNummern
                    SET nNummer = CASE WHEN nNummer < ? THEN ? ELSE nNummer END
                    WHERE kLaufendeNummer = 3
                """, (num_val, num_val))

            created_orders.append({
                "kAuftrag": k_auftrag,
                "kundennummer": kundennummer,
                "auftragsnummer": auftrags_nr
            })

        conn.commit()
        return jsonify({
            "success": True,
            "createdCount": len(created_orders),
            "skippedCount": len(skipped_orders),
            "createdOrders": created_orders,
            "skippedOrders": skipped_orders
        })
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if conn:
            conn.close()


if __name__ == '__main__':
    print(f"JTL Aylik Fatura Olusturma Arayuzu calisiyor: http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)
