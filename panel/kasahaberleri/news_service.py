import os
import re
import json
import time
import hashlib
import urllib.request
import urllib.parse
import urllib.error
import xml.etree.ElementTree as ET
from html import unescape
from html.parser import HTMLParser
from email.utils import parsedate_to_datetime
from datetime import datetime, timezone
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PANEL_DIR = os.path.dirname(BASE_DIR)

# Load .env from both kasahaberleri and parent panel folder
load_dotenv(os.path.join(BASE_DIR, ".env"))
load_dotenv(os.path.join(PANEL_DIR, ".env"))

NEWS_DATA_FILE = os.path.join(BASE_DIR, "news_data.json")
LEGACY_SENT_FILE = os.path.join(BASE_DIR, "sent_news.json")

# Curated search queries grouped by category, excluding Krankenkasse/Sparkasse noise
DEFAULT_QUERIES = [
    {"query": 'Kassensystem OR Registrierkasse -Krankenkasse', "category": "sektor", "label": "Kasa Sistemleri (Genel)"},
    {"query": 'KassenSichV OR Kassensicherungsverordnung', "category": "kanun", "label": "KassenSichV Mevzuatı"},
    {"query": 'Kassenmeldepflicht OR "146a AO" Kasse', "category": "kanun", "label": "Kasa Bildirim Zorunluluğu (§ 146a AO)"},
    {"query": 'GoBD Kassenführung OR DSFinV-K', "category": "kanun", "label": "GoBD & DSFinV-K Standartları"},
    {"query": '"Kassen-Nachschau" OR Betriebsprüfung Kasse Finanzamt', "category": "kanun", "label": "Finanzamt Kasa Denetimi (Kassen-Nachschau)"},
    {"query": 'E-Rechnung Pflicht Kassensystem OR Gastronomie OR Einzelhandel', "category": "kanun", "label": "E-Rechnung & Fatura Zorunluluğu"},
    {"query": '"Technische Sicherheitseinrichtung" OR "TSE" Kasse BSI', "category": "tse", "label": "TSE & BSI Sertifikasyonu"},
    {"query": '"Cloud-TSE" OR Fiskaly OR Swissbit TSE Kasse', "category": "tse", "label": "Cloud-TSE & Donanım Üreticileri"},
    {"query": 'POS-Systeme Innovation OR Self-Checkout OR SoftPOS Einzelhandel Gastronomie', "category": "teknoloji", "label": "POS Teknolojik Yenilikler & SoftPOS"},
    {"query": '"Digitaler Bon" OR "Digitaler Kassenbon" OR Bonpflicht', "category": "teknoloji", "label": "Dijital Fiş & Bonpflicht"},
    {"query": 'DATEV Kassenarchiv OR "Mein ELSTER" Aufzeichnungssysteme', "category": "vergi", "label": "DATEV & ELSTER Entegrasyonları"},
]

NEGATIVE_KEYWORDS = [
    "krankenkasse", "pflegekasse", "aok", "barmer", "tk-kasse", "techniker krankenkasse",
    "dak-gesundheit", "kassenärzt", "kassenpatient", "gkv", "bürgergeld", "rentenkasse",
    "kriegskasse", "staatskasse", "kommunalkasse", "sparkasse"
]

CATEGORY_META = {
    "kanun": {"name": "Kanun & Mevzuat", "icon": "⚖️", "color": "#ef5350"},
    "teknoloji": {"name": "Teknolojik Yenilikler", "icon": "🚀", "color": "#03dac6"},
    "tse": {"name": "TSE & Güvenlik", "icon": "🔐", "color": "#ffb300"},
    "vergi": {"name": "Vergi, ELSTER & DATEV", "icon": "🏛️", "color": "#42a5f5"},
    "sektor": {"name": "Sektör & POS Haberleri", "icon": "🖥️", "color": "#bb86fc"},
}

SEED_ARTICLES = [
    {
        "id": "rehber-kassenmeldepflicht-146a",
        "original_title": "§ 146a Abs. 4 AO: Elektronische Kassenmeldepflicht über Mein ELSTER – Fristen & Anforderungen",
        "title_tr": "§ 146a AO Elektronik Kasa Bildirim Zorunluluğu (ELSTER Meldepflicht): Kapsamlı Rehber",
        "url": "https://www.bundesfinanzministerium.de/Content/DE/Standardartikel/Themen/Steuern/Steuerarten/Abgabenordnung/kassensicherungsverordnung.html",
        "source": "BMF / Mevzuat Rehberi",
        "source_url": "https://www.bundesfinanzministerium.de",
        "published_at": "2026-10-25T09:00:00+00:00",
        "date_display": "25.10.2026 09:00",
        "category": "kanun",
        "importance": "yuksek",
        "summary_tr": "Almanya'da § 146a Abs. 4 AO uyarınca tüm elektronik kayıt ve kasa sistemlerinin (eAS) ve bağlı TSE ünitelerinin Mein ELSTER veya ERiC arayüzü üzerinden Finanzamt'a bildirilmesi zorunludur. Yeni kurulan veya kullanım dışı bırakılan kasalar için 1 aylık bildirim süresi uygulanmaktadır.",
        "impact_tr": "Müşterilere kurulan her yeni kasa, TSE değişimi veya kasa iptali sonrasında ELSTER bildirim verilerinin (TSE Seri No, BSI Sertifika ID, Kasa Seri No, Kurulum Tarihi) eksiksiz tutulması kritik önem taşır.",
        "tags": ["§ 146a AO", "Meldepflicht", "ELSTER", "KassenSichV"],
        "is_read": False,
        "is_bookmarked": True,
        "user_note": "",
        "ai_processed": True,
        "reader_content": {
            "title_tr": "§ 146a AO Elektronik Kasa Bildirim Zorunluluğu (ELSTER Meldepflicht)",
            "lead_tr": "Alman Vergi Usul Kanunu (§ 146a Abs. 4 AO) kapsamında işletmelerin kullandığı tüm elektronik yazar kasalar ve TSE güvenlik birimleri vergi dairesine (Finanzamt) elektronik ortamda bildirilmek zorundadır.",
            "article_body_tr": "Almanya Federal Maliye Bakanlığı (BMF) düzenlemesiyle birlikte elektronik kasa sistemlerinin (Elektronische Aufzeichnungssysteme - eAS) Mein ELSTER portalı veya DATEV/ERiC XML arayüzleri üzerinden bildirilmesi yasal bir zorunluluk haline gelmiştir.\n\nBir işletmede kullanılan tüm kasalar tek bir işletme yerine (Betriebsstätte) ait tek bir bildirimde toplu olarak raporlanmalıdır. Her yeni kasa alımında, kiralanmasında, TSE değişiminde veya kasanın sistemden çıkarılmasında (Außerbetriebnahme) olay tarihinden itibaren en geç 1 ay içinde bildirim güncellenmelidir.\n\nKiralanan (Leasing/Miete) kasalar da satın alınan kasalarla aynı bildirim yükümlülüğüne tabidir.",
            "legal_or_tech_context_tr": "§ 146a Abs. 4 AO ve KassenSichV kapsamında bildirimde bulunması gereken temel teknik veriler şunlardır: Kasa türü (Kassensystem / EU-Taxameter), Üretici ve Model adı, Yazılım adı ve sürümü, Kasa Seri Numarası, TSE Seri Numarası, BSI Sertifika ID'si, Kurulum (Inbetriebnahme) tarihi.",
            "action_items_tr": [
                "Müşteriye kasa teslim edilirken TSE Seri Numarası, BSI Kodu ve Kasa Seri Numarası bilgilerini teslimat formunda ve Panel TSE/ELSTER modülünde eksiksiz kaydedin.",
                "Arıza veya süre bitimi nedeniyle TSE USB/SD kartı değiştirildiğinde müşteriyi veya mali müşavirini (Steuerberater) ELSTER güncellemesi konusunda bilgilendirin.",
                "İade alınan veya hurdaya ayrılan kasalar için 'Außerbetriebnahme' tarihinin bildirilmesi gerektiğini hatırlatın."
            ],
            "glossary": [
                {"term": "Mitteilungspflicht (§ 146a Abs. 4 AO)", "meaning_tr": "Elektronik kayıt sistemlerini vergi dairesine bildirme yükümlülüğü"},
                {"term": "Betriebsstätte", "meaning_tr": "Kasanın fiilen kullanıldığı şube / iş yeri"},
                {"term": "Inbetriebnahme / Außerbetriebnahme", "meaning_tr": "Kasanın devreye alınması / kullanım dışı bırakılması"}
            ],
            "scraped_de": "",
            "generated_at": "30.10.2026 12:00"
        }
    },
    {
        "id": "rehber-e-rechnung-pflicht-kasse",
        "original_title": "E-Rechnungspflicht im B2B-Bereich und Auswirkungen auf Kassensysteme & Kleinbetragsrechnungen",
        "title_tr": "B2B E-Fatura (E-Rechnung) Zorunluluğu ve Kasa Sistemlerine (Kleinbetragsrechnung) Etkisi",
        "url": "https://www.bundesfinanzministerium.de/Content/DE/FAQ/e-rechnung.html",
        "source": "BMF / Vergi Mevzuatı",
        "source_url": "https://www.bundesfinanzministerium.de",
        "published_at": "2026-10-20T10:30:00+00:00",
        "date_display": "20.10.2026 10:30",
        "category": "kanun",
        "importance": "yuksek",
        "summary_tr": "Wachstumschancengesetz kapsamında Almanya'da B2B (işletmeler arası) işlemlerde EN 16931 uyumlu yapılandırılmış E-Rechnung (ZUGFeRD / XRechnung) dönemi başlamıştır. 250 € altındaki kasa fişleri (Kleinbetragsrechnungen) için istisna devam etse de B2B kurumsal satış yapan kasalarda ZUGFeRD desteği önem kazanmaktadır.",
        "impact_tr": "Restoran ve perakendede 250 € üstü B2B iş yemekleri (Bewirtungsbeleg) veya ticari alışverişlerde müşteriler kasadan ZUGFeRD PDF/XML formatında e-fatura talep edebilmektedir.",
        "tags": ["E-Rechnung", "ZUGFeRD", "Kleinbetragsrechnung", "B2B"],
        "is_read": False,
        "is_bookmarked": False,
        "user_note": "",
        "ai_processed": True,
        "reader_content": {
            "title_tr": "E-Rechnung Zorunluluğu ve Kasa Sistemlerine Etkisi",
            "lead_tr": "Almanya'da B2B işlemlerde kağıt ve standart PDF faturaların yerini EN 16931 standardındaki yapılandırılmış elektronik faturalar (XRechnung ve ZUGFeRD) almaktadır.",
            "article_body_tr": "1 Ocak 2025 itibarıyla tüm işletmeler için E-Rechnung alma zorunluluğu devreye girmiş, kademeli geçiş takvimiyle (2026-2028) B2B fatura düzenleme zorunluluğu yaygınlaşmıştır.\n\nKasa sistemleri açısından en önemli ayrım § 33 UStDV kapsamındaki 'Kleinbetragsrechnung' (Küçük Tutarlı Fatura - Brüt 250 €'ya kadar olan fişler) istisnasıdır. 250 €'ya kadar olan kasa fişleri klasik termal fiş veya dijital fiş olarak düzenlenmeye devam edebilir.\n\nAncak 250 €'yu aşan ve başka bir işletmeye (B2B) kesilen faturalarda (örneğin kurumsal restoran ağırlama fişleri - Bewirtungsbeleg veya toptan/ticari market satışları) kasa yazılımının ZUGFeRD veya XRechnung üretebilmesi ya da arka ofis (JTL-Wawi, LaCash, LotusPecas) üzerinden E-Rechnung gönderebilmesi gerekmektedir.",
            "legal_or_tech_context_tr": "UStG § 14 ve UStDV § 33: 250 € brüt tutara kadar olan fişler E-Rechnung zorunluluğundan muaftır. 250 € üzeri B2B işlemlerde EN 16931 uyumlu hibrit PDF/XML (ZUGFeRD 2.2+) veya XRechnung standartları geçerlidir.",
            "action_items_tr": [
                "Müşterilere 250 € altındaki normal kasa fişlerinin (Kassenbon) E-Rechnung zorunluluğundan muaf olduğunu net şekilde açıklayın.",
                "250 € üzeri kurumsal fatura (Rechnung / Bewirtungsbeleg) kesen restoran ve market müşterilerinde kasa yazılımının ZUGFeRD/E-Rechnung modülünü kontrol edin.",
                "Kendi şirket içi faturalandırma süreçlerinizde gelen ve giden E-Rechnung arşivlemesinin GoBD uyumlu olduğundan emin olun."
            ],
            "glossary": [
                {"term": "Kleinbetragsrechnung (§ 33 UStDV)", "meaning_tr": "Brüt 250 € sınırına kadar olan basitleştirilmiş fatura / kasa fişi"},
                {"term": "ZUGFeRD", "meaning_tr": "Hem okunabilir PDF hem de gömülü XML verisi içeren hibrit Alman e-fatura standardı"},
                {"term": "Bewirtungsbeleg", "meaning_tr": "Restoranlarda iş yemeği gideri olarak vergiden düşülen resmi ağırlama fişi"}
            ],
            "scraped_de": "",
            "generated_at": "30.10.2026 12:00"
        }
    },
    {
        "id": "rehber-kassen-nachschau-gobd",
        "original_title": "Kassen-Nachschau (§ 146b AO) & DSFinV-K: Worauf Prüfer des Finanzamts besonders achten",
        "title_tr": "Finanzamt Habersiz Kasa Denetimi (Kassen-Nachschau) ve DSFinV-K / GoBD Kontrol Listesi",
        "url": "https://www.bundesfinanzministerium.de",
        "source": "Finanzamt Denetim Rehberi",
        "source_url": "https://www.bundesfinanzministerium.de",
        "published_at": "2026-10-18T14:15:00+00:00",
        "date_display": "18.10.2026 14:15",
        "category": "vergi",
        "importance": "yuksek",
        "summary_tr": "Vergi dairesi denetçileri § 146b AO uyarınca önceden haber vermeksizin iş saatleri içinde işletmeye gelerek kasayı, TSE durumunu, Verfahrensdokumentation belgesini ve DSFinV-K / TAR veri dışa aktarımını kontrol edebilmektedir.",
        "impact_tr": "Müşterilerin denetim anında USB belleğe veya denetçiye anında DSFinV-K ve TSE-TAR dışa aktarımı verebilmesi ve TSE sertifika süresinin dolmamış olması cezai yaptırımları önler.",
        "tags": ["Kassen-Nachschau", "§ 146b AO", "DSFinV-K", "GoBD"],
        "is_read": False,
        "is_bookmarked": False,
        "user_note": "",
        "ai_processed": True,
        "reader_content": {
            "title_tr": "Finanzamt Habersiz Kasa Denetimi (Kassen-Nachschau § 146b AO)",
            "lead_tr": "Kassen-Nachschau, vergi denetçilerinin önceden randevu almadan işletmeye gelerek kasa düzenini ve TSE kayıtlarını yerinde denetlemesi uygulamasıdır.",
            "article_body_tr": "Denetçi işletmeye geldiğinde önce müşteri gibi nakit veya kartlı alışveriş yaparak fiş (Bonpflicht) verilip verilmediğini ve fiş üzerindeki TSE QR kodunu / imza sayacını kontrol edebilir.\n\nArdından kimliğini göstererek (Prüfungsausweis) şu 4 temel unsuru talep eder:\n1. Güncel kasa nakit sayımı (Kassensturz) ile kasadaki teorik bakiye (Soll-Bestand) uyumu.\n2. TSE'nin aktif olduğu ve sertifika süresinin geçerli olduğu.\n3. DSFinV-K standartlarında kasa verilerinin ve TSE TAR dosyalarının dışa aktarımı.\n4. İşletmeye özel süreç dokümantasyonu (Verfahrensdokumentation) ve Z-Raporları.",
            "legal_or_tech_context_tr": "§ 146b AO (Kassen-Nachschau), GoBD ve DSFinV-K 2.3+. Eksik TSE, geçersiz sertifika veya bozuk veri aktarımı durumunda Finanzamt ciro tahminine (Hinzuschätzung) ve § 379 AO kapsamında 25.000 €'ya varan para cezasına başvurabilir.",
            "action_items_tr": [
                "Müşterilerin TSE bitiş tarihlerini Panel üzerinden düzenli takip edin ve süresi dolmadan yenileyin.",
                "Kasa kurulumunda müşteriye 'Finanzamt Export (DSFinV-K / TAR)' menüsünün nasıl çalıştığını gösterin.",
                "Kasa teslimat ve kurulum belgelerinin (Verfahrensdokumentation eki olarak) işletmede kolay ulaşılır bir klasörde saklanmasını tavsiye edin."
            ],
            "glossary": [
                {"term": "Kassensturz", "meaning_tr": "Kasadaki fiili nakit paranın sayılıp sistemdeki kayıtla karşılaştırılması"},
                {"term": "DSFinV-K", "meaning_tr": "Kasa verilerinin vergi denetimi için standart dijital dışa aktarım formatı"},
                {"term": "Verfahrensdokumentation", "meaning_tr": "Kasa sisteminin nasıl kurulduğunu, kullanıldığını ve arşivlendiğini anlatan zorunlu süreç belgesi"}
            ],
            "scraped_de": "",
            "generated_at": "30.10.2026 12:00"
        }
    },
    {
        "id": "rehber-tse-bsi-cloud-usb",
        "original_title": "TSE-Zertifizierung nach BSI TR-03153: Hardware-TSE (USB/microSD) vs. Cloud-TSE im Vergleich",
        "title_tr": "BSI TR-03153 TSE Teknolojileri: Donanım TSE (Swissbit/Epson USB) ve Cloud-TSE Karşılaştırması",
        "url": "https://www.bsi.bund.de",
        "source": "BSI / Teknoloji & Güvenlik",
        "source_url": "https://www.bsi.bund.de",
        "published_at": "2026-10-15T11:00:00+00:00",
        "date_display": "15.10.2026 11:00",
        "category": "tse",
        "importance": "orta",
        "summary_tr": "Donanım tabanlı TSE'ler (Swissbit USB/SD, Diebold Nixdorf, Epson) internet bağlantısından bağımsız çalışırken 5-7 yıllık sertifika ömrüne sahiptir ve fiziksel değişim gerektirir. Cloud-TSE çözümleri ise merkezi yönetim sunarken sürekli çevrimiçi bağlantı ve çalışma ortamı güvenliği (SMAERS) şartlarına tabidir.",
        "impact_tr": "Müşterilerin mevcut donanım TSE'lerinin sertifika bitiş tarihlerini (CertificateExpirationDate) takip etmek hem yasal uyumluluk hem de yenileme satışı açısından kritik fırsattır.",
        "tags": ["TSE", "BSI TR-03153", "Swissbit", "Cloud-TSE"],
        "is_read": False,
        "is_bookmarked": False,
        "user_note": "",
        "ai_processed": True,
        "reader_content": {
            "title_tr": "BSI TR-03153 TSE Teknolojileri ve Sertifika Yaşam Döngüsü",
            "lead_tr": "Her elektronik yazar kasa, işlemleri silinemez şekilde imzalayan BSI sertifikalı bir TSE (Technische Sicherheitseinrichtung) ile çalışmak zorundadır.",
            "article_body_tr": "Almanya'da kasa sistemlerinde iki ana TSE mimarisi kullanılmaktadır:\n\n1. Donanım TSE (USB, microSD, Yazıcı İçi TSE): Swissbit, Cryptovision/Atos, Epson gibi üreticilerin sunduğu fiziksel güvenlik modülleridir. En büyük avantajı internet kesilse bile kesintisiz imzalama yapmasıdır. Ancak her donanım TSE'nin üzerindeki kriptografik sertifikanın belirli bir bitiş tarihi (genellikle 5 yıl) vardır ve süresi dolduğunda veya hafızası tükendiğinde fiziksel olarak yenisiyle değiştirilmesi gerekir.\n\n2. Bulut TSE (Cloud-TSE - örn. Fiskaly, Deutsche Fiskal): Fiziksel donanım gerektirmez ancak kasada sürekli internet bağlantısı ve BSI'ın SMAERS güvenlik gereksinimlerini karşılayan yazılım entegrasyonu şarttır.",
            "legal_or_tech_context_tr": "BSI TR-03153-1 standardı. Süresi dolan TSE ile yapılan işlemler imzasız sayılır ve KassenSichV ihlali oluşturur. Eski TSE kartları/USB'leri atılmamalı, 10 yıllık GoBD saklama süresi boyunca müşteri tarafından muhafaza edilmelidir.",
            "action_items_tr": [
                "Süresi biten eski TSE USB/SD kartlarının kesinlikle çöpe atılmaması, 10 yıl boyunca fatura/kasa arşiviyle birlikte saklanması gerektiğini müşteriye bildirin.",
                "Panel içindeki TSE Bitiş Tarihi filtresini kullanarak süresi yaklaşan müşterilerle proaktif iletişime geçin.",
                "Yeni TSE takıldığında kasa yazılımında eski TSE'yi kapatıp (Deaktivieren) yeni TSE'yi aktif ettikten sonra ELSTER bildirimini güncelleyin."
            ],
            "glossary": [
                {"term": "BSI TR-03153", "meaning_tr": "Federal Bilgi Güvenliği Dairesi'nin TSE cihazları için belirlediği teknik standart"},
                {"term": "TAR-Datei (Tape Archive)", "meaning_tr": "TSE'nin imzaladığı tüm log dosyalarını içeren standart arşiv paketi"},
                {"term": "Aufbewahrungspflicht (10 Jahre)", "meaning_tr": "Kasa verileri ve eski TSE donanımlarının 10 yıl boyunca saklanması zorunluluğu"}
            ],
            "scraped_de": "",
            "generated_at": "30.10.2026 12:00"
        }
    },
    {
        "id": "rehber-pos-teknoloji-trendleri",
        "original_title": "Moderne Kassensysteme im Handel & Gastronomie: SoftPOS, Self-Checkout, Digitaler Bon und KI",
        "title_tr": "Yeni Nesil Kasa Teknolojileri: SoftPOS (Tap-to-Pay), Self-Checkout, Dijital Fiş ve Yapay Zeka",
        "url": "https://www.ehi.org",
        "source": "Perakende & POS Teknolojileri",
        "source_url": "https://www.ehi.org",
        "published_at": "2026-10-12T08:45:00+00:00",
        "date_display": "12.10.2026 08:45",
        "category": "teknoloji",
        "importance": "orta",
        "summary_tr": "Perakende ve gastronomide personel maliyetlerinin artmasıyla birlikte Self-Checkout (kendi kendine ödeme) terminalleri, garson el terminallerinde SoftPOS (ek kart okuyucu olmadan telefondan temassız ödeme) ve QR kodlu dijital fiş çözümleri hızla yaygınlaşıyor.",
        "impact_tr": "Müşterilere kasa satışı yaparken entegre kart terminali (ZVT/OPI), QR dijital fiş ve mobil el terminali çözümleri sunmak rekabet avantajı sağlar.",
        "tags": ["SoftPOS", "Self-Checkout", "Digitaler Bon", "ZVT"],
        "is_read": False,
        "is_bookmarked": False,
        "user_note": "",
        "ai_processed": True,
        "reader_content": {
            "title_tr": "Perakende ve Gastronomide Yeni Nesil Kasa Teknolojileri",
            "lead_tr": "Kasa sistemleri artık sadece nakit ve fiş basan cihazlar olmaktan çıkıp, ödeme terminalleri, stok yönetimi ve müşteri deneyimini birleştiren akıllı merkezlere dönüşüyor.",
            "article_body_tr": "Almanya'da küçük ve orta ölçekli işletmelerde (Gastronomi, Fırın, Market, Döner/Restoran, Kiosk) öne çıkan 4 büyük teknolojik dönüşüm:\n\n1. ZVT / OPI Entegreli Ödeme & SoftPOS: Kart terminaline tutarı elle girme hatasını sıfırlayan kasa-POS bağlantısı (ZVT protokolü) ve garsonların Android el terminalinden doğrudan NFC ile ödeme almasını sağlayan SoftPOS (Tap-to-Pay) teknolojisi.\n\n2. Self-Checkout & Sipariş Kioskları: Özellikle fast-food restoranlarında ve marketlerde müşterinin kendi siparişini verip kartla ödediği dokunmatik kiosklar personel açığını kapatıyor.\n\n3. Dijital Fiş (Digitaler Kassenbon): Bonpflicht (fiş verme zorunluluğu) kapsamında kağıt israfını önlemek için müşteri ekranında gösterilen QR kod ile fişin PDF olarak telefona indirilmesi.\n\n4. Otomatik Muhasebe Köprüsü (DATEV MeinFiskal / Kassenarchiv): Gün sonu Z-raporlarının ve DSFinV-K verilerinin mali müşavire otomatik aktarılması.",
            "legal_or_tech_context_tr": "Dijital fiş (Digitaler Bon) uygulaması KassenSichV § 6 (Belegausgabepflicht) ile tamamen uyumludur; müşterinin fişi QR kod veya e-posta ile alabilmesi yeterlidir. Kart terminali entegrasyonlarında ZVT protokolü ile kasa kayıtlarının eşleşmesi GoBD denetimlerinde büyük kolaylık sağlar.",
            "action_items_tr": [
                "Kart terminali kullanan müşterilerde ZVT kasa bağlantısını aktif ederek yanlış tutar tuşlama ve Finanzamt kart-kasa uyumsuzluğu sorunlarını önleyin.",
                "Yoğun restoran müşterilerine mobil sipariş terminali veya self-sipariş kiosk alternatiflerini tanıtın.",
                "Müşteri ekranı olan kasalarda QR Dijital Fiş özelliğini etkinleştirerek termal rulo maliyetinden tasarruf sağlayabileceklerini belirtin."
            ],
            "glossary": [
                {"term": "ZVT-Protokoll (Zahlungsverkehrs-Terminal)", "meaning_tr": "Almanya'da yazar kasa ile EC/kredi kartı terminali arasındaki standart haberleşme protokolü"},
                {"term": "SoftPOS / Tap-to-Pay", "meaning_tr": "Harici POS cihazı olmadan NFC destekli Android/iOS cihaz üzerinden doğrudan kartlı ödeme alma teknolojisi"},
                {"term": "Belegausgabepflicht (Bonpflicht)", "meaning_tr": "Her işlem sonunda müşteriye basılı veya elektronik fiş sunma zorunluluğu"}
            ],
            "scraped_de": "",
            "generated_at": "30.10.2026 12:00"
        }
    }
]



class _HTMLStripper(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self._skip = False

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "noscript", "svg", "header", "footer", "nav"):
            self._skip = True
        elif tag in ("p", "br", "div", "li", "h1", "h2", "h3", "h4", "tr"):
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript", "svg", "header", "footer", "nav"):
            self._skip = False
        elif tag in ("p", "div", "li", "h1", "h2", "h3", "h4"):
            self.parts.append("\n")

    def handle_data(self, data):
        if not self._skip:
            self.parts.append(data)

    def get_text(self):
        raw = "".join(self.parts)
        raw = unescape(raw)
        lines = [re.sub(r"\s+", " ", line).strip() for line in raw.splitlines()]
        lines = [line for line in lines if line]
        return "\n\n".join(lines)


def strip_html(html_text: str) -> str:
    if not html_text:
        return ""
    stripper = _HTMLStripper()
    try:
        stripper.feed(html_text)
        return stripper.get_text()
    except Exception:
        return unescape(re.sub(r"<[^>]+>", " ", html_text)).strip()


def make_article_id(url: str, title: str = "") -> str:
    basis = (url or title or str(time.time())).encode("utf-8", errors="ignore")
    return hashlib.sha1(basis).hexdigest()[:16]


def get_gemini_api_key() -> str:
    load_dotenv(os.path.join(BASE_DIR, ".env"), override=False)
    load_dotenv(os.path.join(PANEL_DIR, ".env"), override=False)
    key = os.getenv("GEMINI_API_KEY", "").strip().strip('"').strip("'")
    return key


def load_news_store() -> dict:
    default_store = {
        "last_updated": datetime.now().strftime("%d.%m.%Y %H:%M"),
        "queries": DEFAULT_QUERIES,
        "articles": list(SEED_ARTICLES)
    }
    if not os.path.exists(NEWS_DATA_FILE):
        save_news_store(default_store)
        return default_store
    try:
        with open(NEWS_DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if not isinstance(data, dict):
                return default_store
            if "articles" not in data or not isinstance(data["articles"], list) or len(data["articles"]) == 0:
                data["articles"] = list(SEED_ARTICLES)
            if "queries" not in data or not isinstance(data["queries"], list) or len(data["queries"]) == 0:
                data["queries"] = DEFAULT_QUERIES
            return data
    except Exception as e:
        print(f"[kasahaberleri] JSON okuma hatası: {e}")
        return default_store


def save_news_store(store: dict):
    tmp_path = f"{NEWS_DATA_FILE}.tmp"
    try:
        with open(tmp_path, "w", encoding="utf-8") as f:
            json.dump(store, f, ensure_ascii=False, indent=2)
        os.replace(tmp_path, NEWS_DATA_FILE)
    except Exception as e:
        print(f"[kasahaberleri] JSON kaydetme hatası: {e}")


def parse_rss_date(date_str: str) -> datetime:
    if not date_str:
        return datetime.now(timezone.utc)
    try:
        dt = parsedate_to_datetime(date_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return datetime.now(timezone.utc)


def is_likely_irrelevant(title: str, snippet: str = "") -> bool:
    combined = f"{title} {snippet}".lower()
    for neg in NEGATIVE_KEYWORDS:
        if neg in combined:
            # Only keep if it also explicitly mentions Kassensystem / Registrierkasse / KassenSichV / TSE
            if not any(pos in combined for pos in ["registrierkasse", "kassensystem", "kassensichv", "bonpflicht", "pos-system"]):
                return True
    return False


def google_translate_fallback(text: str, target_lang: str = "tr") -> str:
    """Fallback translation using Google Translate public endpoint if Gemini is unavailable."""
    if not text or not text.strip():
        return ""
    try:
        q = urllib.parse.quote(text[:1500])
        url = f"https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl={target_lang}&dt=t&q={q}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=8) as resp:
            payload = json.loads(resp.read().decode("utf-8", errors="ignore"))
            if isinstance(payload, list) and payload and isinstance(payload[0], list):
                return "".join(part[0] for part in payload[0] if part and part[0])
    except Exception as e:
        print(f"[kasahaberleri] Translate fallback hatası: {e}")
    return text


def call_gemini_json(prompt: str, temperature: float = 0.2, max_tokens: int = 4096):
    """Calls Gemini REST API directly without requiring heavy SDK dependencies."""
    api_key = get_gemini_api_key()
    if not api_key:
        return None, "GEMINI_API_KEY tanımlı değil."

    models_to_try = [
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
    ]

    last_err = None
    for model_name in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        body = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": temperature,
                "maxOutputTokens": max_tokens,
                "responseMimeType": "application/json"
            }
        }
        data_bytes = json.dumps(body).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=data_bytes,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        try:
            with urllib.request.urlopen(req, timeout=35) as resp:
                resp_json = json.loads(resp.read().decode("utf-8", errors="ignore"))
                candidates = resp_json.get("candidates") or []
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts") or []
                    if parts and "text" in parts[0]:
                        raw_text = parts[0]["text"].strip()
                        # Strip markdown code fences if present
                        if raw_text.startswith("```"):
                            raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
                            raw_text = re.sub(r"\s*```$", "", raw_text)
                        return json.loads(raw_text), None
        except urllib.error.HTTPError as he:
            err_body = ""
            try:
                err_body = he.read().decode("utf-8", errors="ignore")[:300]
            except Exception:
                pass
            last_err = f"HTTP {he.code} ({model_name}): {err_body}"
            continue
        except Exception as e:
            last_err = f"{model_name}: {str(e)}"
            continue

    return None, last_err or "Gemini API yanıt vermedi."


def fetch_raw_rss_items(queries=None, days: int = 30, per_query_limit: int = 10) -> list:
    if queries is None:
        store = load_news_store()
        queries = store.get("queries") or DEFAULT_QUERIES

    raw_items = []
    seen_urls = set()
    seen_titles = set()

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
        "Accept-Language": "de-DE,de;q=0.9,en;q=0.8"
    }

    for q_obj in queries:
        q_str = q_obj["query"] if isinstance(q_obj, dict) else str(q_obj)
        default_cat = q_obj.get("category", "sektor") if isinstance(q_obj, dict) else "sektor"
        query_label = q_obj.get("label", q_str) if isinstance(q_obj, dict) else q_str

        try:
            encoded_query = urllib.parse.quote(f"{q_str} when:{days}d")
            url = f"https://news.google.com/rss/search?q={encoded_query}&hl=de&gl=DE&ceid=DE:de"
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=12) as resp:
                xml_bytes = resp.read()

            root = ET.fromstring(xml_bytes)
            for item in root.findall(".//item")[:per_query_limit]:
                title_el = item.find("title")
                link_el = item.find("link")
                pub_el = item.find("pubDate")
                source_el = item.find("source")
                desc_el = item.find("description")

                title = (title_el.text or "").strip() if title_el is not None else ""
                link = (link_el.text or "").strip() if link_el is not None else ""
                pub_date = (pub_el.text or "").strip() if pub_el is not None else ""
                source_name = (source_el.text or "Google News").strip() if source_el is not None else "Google News"
                source_url = source_el.attrib.get("url", "") if source_el is not None else ""
                desc_html = (desc_el.text or "").strip() if desc_el is not None else ""
                snippet = strip_html(desc_html)

                if not title or not link:
                    continue

                # Clean source suffix from title if duplicated
                clean_title = title
                if source_name and clean_title.endswith(f" - {source_name}"):
                    clean_title = clean_title[:-len(f" - {source_name}")].strip()

                norm_title = re.sub(r"\W+", "", clean_title.lower())
                if link in seen_urls or norm_title in seen_titles:
                    continue

                if is_likely_irrelevant(clean_title, snippet):
                    continue

                seen_urls.add(link)
                seen_titles.add(norm_title)

                dt = parse_rss_date(pub_date)
                raw_items.append({
                    "id": make_article_id(link, clean_title),
                    "original_title": clean_title,
                    "url": link,
                    "source": source_name,
                    "source_url": source_url,
                    "published_at": dt.isoformat(),
                    "date_display": dt.strftime("%d.%m.%Y %H:%M"),
                    "rss_snippet": snippet[:600],
                    "default_category": default_cat,
                    "query_label": query_label,
                })
        except Exception as e:
            print(f"[kasahaberleri] RSS hatası ({q_str}): {e}")

    raw_items.sort(key=lambda x: x.get("published_at", ""), reverse=True)
    return raw_items


def enrich_items_with_gemini(items: list) -> list:
    """Uses Gemini AI to filter, categorize, summarize in Turkish, and explain impact on POS/Kasse business."""
    if not items:
        return []

    batch_input = []
    for idx, it in enumerate(items):
        batch_input.append({
            "idx": idx,
            "title_de": it["original_title"],
            "source": it["source"],
            "date": it["date_display"],
            "snippet_de": it.get("rss_snippet", ""),
            "hint_category": it.get("default_category", "sektor")
        })

    prompt = f"""Sen Almanya'daki yazar kasa sistemleri (Kassensysteme, Registrierkassen, POS), vergi mevzuatı (KassenSichV, GoBD, DSFinV-K, § 146a AO Kassenmeldepflicht, Kassen-Nachschau, E-Rechnung, Bonpflicht), TSE (Technische Sicherheitseinrichtung, BSI, Cloud-TSE, Fiskaly, Swissbit) ve DATEV/ELSTER entegrasyonları konusunda uzman bir danışmansın.

Aşağıda Almanya Google News üzerinden çekilmiş haber başlıkları ve özet kesitleri yer alıyor.
Görevlerin:
1. Haberin gerçekten **Kasa Sistemleri (POS/Registrierkasse), Ticari Vergi/Muhasebe Mevzuatı (KassenSichV, GoBD, E-Rechnung, Finanzamt denetimi, ELSTER, DATEV), Perakende/Gastronomi Ödeme ve Kasa Teknolojileri** ile alakalı olup olmadığını değerlendir (`relevant`: true/false).
   - Eğer haber sağlık sigortası (Krankenkasse), devlet bütçesi, belediye kasası, spor kulübü veya alakasız genel politika ise `relevant: false` yap.
2. Alakalı her haber için:
   - `title_tr`: Başlığın akıcı, anlaşılır ve profesyonel Türkçe çevirisi.
   - `category`: Şu 5 değerden en uygun olanı:
     - `"kanun"` (Kanun değişiklikleri, KassenSichV, GoBD, Meldepflicht, E-Rechnung zorunluluğu, Bonpflicht, Kassen-Nachschau)
     - `"teknoloji"` (Yeni POS teknolojileri, SoftPOS, Cloud sistemler, yapay zeka, self-checkout, dijital fiş)
     - `"tse"` (TSE sertifikaları, BSI kararları, USB/Cloud TSE, Swissbit, Epson, Fiskaly)
     - `"vergi"` (Finanzamt uygulamaları, ELSTER bildirimleri, DATEV, vergi denetimi)
     - `"sektor"` (Gastronomi/perakende kasa pazarı, üretici haberleri, genel POS sektörü)
   - `importance`: `"yuksek"` (yeni yasa, zorunluluk, son tarih, ceza riski veya kritik teknoloji), `"orta"` veya `"bilgi"`.
   - `summary_tr`: Haberin ne anlattığını açıklayan 2-3 cümlelik net ve doyurucu Türkçe özet.
   - `impact_tr`: **Kasa sağlayıcısı / teknik servis ve işletmeler açısından önemi nedir?** (1-2 cümleyle "Bu gelişme neden önemli / neye dikkat edilmeli?" sorusunun cevabı).
   - `tags`: Konuyla ilgili 2-4 kısa anahtar kelime dizisi (örn: `["KassenSichV", "Meldepflicht", "2026"]`).

JSON formatında bir dizi (array) döndür. Her eleman şu şemada olmalı:
[
  {{
    "idx": 0,
    "relevant": true,
    "title_tr": "...",
    "category": "kanun",
    "importance": "yuksek",
    "summary_tr": "...",
    "impact_tr": "...",
    "tags": ["..."]
  }}
]

İncelenecek Haberler:
{json.dumps(batch_input, ensure_ascii=False)}
"""

    parsed, err = call_gemini_json(prompt, temperature=0.2, max_tokens=6000)
    enriched = []

    if parsed and isinstance(parsed, list):
        by_idx = {item.get("idx"): item for item in parsed if isinstance(item, dict) and "idx" in item}
        for idx, raw in enumerate(items):
            ai_info = by_idx.get(idx)
            if ai_info is not None:
                if not ai_info.get("relevant", True):
                    continue
                cat = ai_info.get("category", raw.get("default_category", "sektor"))
                if cat not in CATEGORY_META:
                    cat = raw.get("default_category", "sektor")
                imp = ai_info.get("importance", "orta")
                if imp not in ("yuksek", "orta", "bilgi"):
                    imp = "orta"

                raw["title_tr"] = ai_info.get("title_tr") or google_translate_fallback(raw["original_title"])
                raw["category"] = cat
                raw["importance"] = imp
                raw["summary_tr"] = ai_info.get("summary_tr") or ""
                raw["impact_tr"] = ai_info.get("impact_tr") or ""
                raw["tags"] = ai_info.get("tags") if isinstance(ai_info.get("tags"), list) else []
                raw["ai_processed"] = True
                enriched.append(raw)
            else:
                raw["title_tr"] = google_translate_fallback(raw["original_title"])
                raw["category"] = raw.get("default_category", "sektor")
                raw["importance"] = "orta"
                raw["summary_tr"] = google_translate_fallback(raw.get("rss_snippet", "")) if raw.get("rss_snippet") else "Detayları görüntülemek için habere tıklayın."
                raw["impact_tr"] = ""
                raw["tags"] = [raw.get("query_label", "Kasa Sistemleri")]
                raw["ai_processed"] = False
                enriched.append(raw)
    else:
        print(f"[kasahaberleri] Gemini toplu analiz uyarısı ({err}), fallback çeviri kullanılıyor.")
        for raw in items:
            raw["title_tr"] = google_translate_fallback(raw["original_title"])
            raw["category"] = raw.get("default_category", "sektor")
            raw["importance"] = "orta"
            raw["summary_tr"] = google_translate_fallback(raw.get("rss_snippet", "")) if raw.get("rss_snippet") else "Detaylı inceleme için habere tıklayın."
            raw["impact_tr"] = ""
            raw["tags"] = [raw.get("query_label", "Kasa Sistemleri")]
            raw["ai_processed"] = False
            enriched.append(raw)

    return enriched


def refresh_news(max_new_items: int = 25, days: int = 30) -> dict:
    """Fetches latest RSS news, processes new items with Gemini AI, and merges into news_data.json."""
    store = load_news_store()
    existing_articles = store.get("articles", [])
    existing_by_id = {a.get("id"): a for a in existing_articles if a.get("id")}
    existing_urls = {a.get("url") for a in existing_articles if a.get("url")}

    raw_items = fetch_raw_rss_items(store.get("queries"), days=days, per_query_limit=8)

    new_candidates = [
        item for item in raw_items
        if item["id"] not in existing_by_id and item["url"] not in existing_urls
    ][:max_new_items]

    added_count = 0
    if new_candidates:
        # Process in chunks of 15 so Gemini JSON response never truncates
        enriched_new = []
        chunk_size = 15
        for i in range(0, len(new_candidates), chunk_size):
            chunk = new_candidates[i:i + chunk_size]
            enriched_new.extend(enrich_items_with_gemini(chunk))

        for item in enriched_new:
            item["is_read"] = False
            item["is_bookmarked"] = False
            item["user_note"] = ""
            item["created_at"] = datetime.now(timezone.utc).isoformat()
            existing_articles.append(item)
            added_count += 1

    # Sort all articles: newest published first
    existing_articles.sort(key=lambda x: x.get("published_at", ""), reverse=True)

    # Keep bookmarked articles + latest 300 articles
    bookmarked = [a for a in existing_articles if a.get("is_bookmarked")]
    non_bookmarked = [a for a in existing_articles if not a.get("is_bookmarked")][:300]
    merged = bookmarked + non_bookmarked
    merged.sort(key=lambda x: x.get("published_at", ""), reverse=True)

    store["articles"] = merged
    store["last_updated"] = datetime.now().strftime("%d.%m.%Y %H:%M")
    save_news_store(store)

    return {
        "added_count": added_count,
        "total_count": len(merged),
        "last_updated": store["last_updated"]
    }


def _try_extract_url_from_google_news(gnews_url: str) -> str:
    """Attempts to decode or resolve a Google News RSS link if possible."""
    if not gnews_url or "news.google.com" not in gnews_url:
        return gnews_url

    # 1. Try base64 decoding if legacy CBMi URL contains direct http string
    try:
        m = re.search(r"/articles/([A-Za-z0-9_-]+)", gnews_url)
        if m:
            b64_part = m.group(1)
            padding = "=" * (-len(b64_part) % 4)
            import base64
            raw_bytes = base64.urlsafe_b64decode(b64_part + padding)
            decoded_latin = raw_bytes.decode("latin1", errors="ignore")
            url_match = re.search(r"(https?://[^\x00-\x1f\x7f-\xff\"'<>\\]+)", decoded_latin)
            if url_match:
                candidate = url_match.group(1)
                if "news.google.com" not in candidate and "." in candidate:
                    return candidate
    except Exception:
        pass

    return gnews_url


def scrape_webpage_text(url: str) -> tuple:
    """Tries to fetch webpage HTML and extract readable article paragraphs."""
    resolved_url = _try_extract_url_from_google_news(url)
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "de-DE,de;q=0.9,en;q=0.8"
    }
    try:
        req = urllib.request.Request(resolved_url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            final_url = resp.geturl()
            html_bytes = resp.read(350_000)
            html_str = html_bytes.decode("utf-8", errors="ignore")

        if "news.google.com" in final_url or "consent.google.com" in final_url:
            return "", final_url

        # Extract <p> and <article> content
        paragraphs = re.findall(r"<p[^>]*>(.*?)</p>", html_str, flags=re.IGNORECASE | re.DOTALL)
        cleaned_paras = []
        for p in paragraphs:
            txt = strip_html(p).strip()
            if len(txt) > 45 and not any(skip in txt.lower() for skip in ["cookie", "datenschutz", "impressum", "newsletter abon"]):
                cleaned_paras.append(txt)

        full_text = "\n\n".join(cleaned_paras[:25])
        return full_text[:8000], final_url
    except Exception:
        return "", resolved_url


def build_article_reader_content(article_id: str, force_refresh: bool = False) -> dict:
    """Returns rich Turkish reading content & legal/technical analysis for a specific article."""
    store = load_news_store()
    articles = store.get("articles", [])
    target = next((a for a in articles if a.get("id") == article_id), None)
    if not target:
        return {"error": "Haber bulunamadı."}

    # Mark as read automatically
    target["is_read"] = True

    if target.get("reader_content") and not force_refresh:
        save_news_store(store)
        return {"article": target, "reader": target["reader_content"]}

    scraped_de, final_url = scrape_webpage_text(target.get("url", ""))
    if final_url and "news.google.com" not in final_url:
        target["resolved_url"] = final_url

    title_de = target.get("original_title", "")
    source = target.get("source", "")
    date_str = target.get("date_display", "")
    snippet_de = target.get("rss_snippet", "")

    prompt = f"""Sen Almanya kasa sistemleri (Kassensysteme / POS), KassenSichV, GoBD, TSE, § 146a AO Kassenmeldepflicht, E-Rechnung, Kassen-Nachschau, DATEV ve ELSTER konularında uzman bir eğitmen ve danışmansın.

Kullanıcı Panel içindeki okuma ekranında şu haberi/konuyu açtı:
- Orijinal Başlık (Almanca): {title_de}
- Kaynak: {source} ({date_str})
- RSS Özeti / Kesit: {snippet_de}
- Web Sayfasından Çekilen Metin (varsa): {scraped_de if scraped_de else "(Kaynak site doğrudan bot erişimini kısıtlıyor, başlık ve mevzuat/sektör bağlamına göre kapsamlı analiz üret)"}

Lütfen kullanıcıya bu haberi ve ilgili konuyu kasa sistemleri özelinde tam olarak öğretecek, okunaklı ve kapsamlı bir Türkçe içerik hazırla.
JSON formatında şu alanları döndür:
{{
  "title_tr": "Haberin/Konunun Türkçe Başlığı",
  "lead_tr": "Haberin 2-3 cümlelik çarpıcı giriş özeti",
  "article_body_tr": "Eğer web metni varsa tam ve akıcı Türkçe çevirisi/özeti; eğer web metni kısıtlıysa bu haberin konusu olan gelişmenin tüm detaylarıyla 3-4 paragraflık kapsamlı Türkçe anlatımı (paragrafları \\n\\n ile ayır).",
  "legal_or_tech_context_tr": "Kanuni veya Teknolojik Arka Plan: Bu konu Almanya'daki hangi yasa (örn. § 146a AO, KassenSichV, GoBD, DSFinV-K, E-Rechnung) veya hangi kasa teknolojisi (TSE, Cloud-TSE, SoftPOS, DATEV/ELSTER) ile ilgilidir? Teknik/hukuki olarak ne anlama gelir?",
  "action_items_tr": [
    "Kasa satışı, kurulumu, teknik servisi veya işletmeler için dikkat edilmesi gereken 1. somut madde",
    "2. somut madde",
    "3. somut madde"
  ],
  "glossary": [
    {{"term": "Haberde geçen önemli Almanca terim (örn. Kassen-Nachschau)", "meaning_tr": "Kısa ve net Türkçe açıklaması"}}
  ]
}}
"""

    parsed, err = call_gemini_json(prompt, temperature=0.25, max_tokens=4096)
    if parsed and isinstance(parsed, dict):
        reader_data = {
            "title_tr": parsed.get("title_tr") or target.get("title_tr") or title_de,
            "lead_tr": parsed.get("lead_tr") or target.get("summary_tr") or "",
            "article_body_tr": parsed.get("article_body_tr") or target.get("summary_tr") or "",
            "legal_or_tech_context_tr": parsed.get("legal_or_tech_context_tr") or target.get("impact_tr") or "",
            "action_items_tr": parsed.get("action_items_tr") if isinstance(parsed.get("action_items_tr"), list) else [],
            "glossary": parsed.get("glossary") if isinstance(parsed.get("glossary"), list) else [],
            "scraped_de": scraped_de[:3000] if scraped_de else "",
            "generated_at": datetime.now().strftime("%d.%m.%Y %H:%M")
        }
    else:
        translated_body = google_translate_fallback(scraped_de) if scraped_de else (target.get("summary_tr") or google_translate_fallback(title_de))
        reader_data = {
            "title_tr": target.get("title_tr") or title_de,
            "lead_tr": target.get("summary_tr") or "",
            "article_body_tr": translated_body,
            "legal_or_tech_context_tr": target.get("impact_tr") or f"Gemini analizi şu an alınamadı ({err}). Orijinal kaynağı aşağıdaki bağlantıdan inceleyebilirsiniz.",
            "action_items_tr": [],
            "glossary": [],
            "scraped_de": scraped_de[:3000] if scraped_de else "",
            "generated_at": datetime.now().strftime("%d.%m.%Y %H:%M")
        }

    target["reader_content"] = reader_data
    save_news_store(store)
    return {"article": target, "reader": reader_data}


def ask_kasa_knowledge_ai(question: str) -> dict:
    """Allows the user to ask or research any German POS law, regulation, or technology topic in Turkish."""
    if not question or not question.strip():
        return {"error": "Lütfen bir soru veya konu başlığı girin."}

    prompt = f"""Sen Almanya'daki kasa sistemleri (Kassensysteme, POS), vergi ve maliye mevzuatı (KassenSichV, GoBD, DSFinV-K, § 146a AO Kassenmeldepflicht, ELSTER, DATEV, E-Rechnung, Bonpflicht, Kassen-Nachschau) ve kasa donanım/yazılım teknolojileri (TSE, BSI, Cloud-TSE, Swissbit, Epson, Fiskaly, SoftPOS, LaCash, LotusPecas) konusunda uzman bir danışmansın.

Kullanıcının sorusu / araştırmak istediği konu:
"{question.strip()}"

Lütfen JSON formatında, anlaşılır ve detaylı bir Türkçe rehber yanıtı üret:
{{
  "title": "Konu Başlığı",
  "summary": "Kısa ve net özet cevap (2-3 cümle)",
  "detailed_explanation": "Konunun detaylı, maddeli veya paragraflı kapsamlı açıklaması (paragrafları \\n\\n ile ayır)",
  "key_points": [
    "Önemli kural / dikkat edilmesi gereken nokta 1",
    "Önemli kural / dikkat edilmesi gereken nokta 2",
    "Önemli kural / dikkat edilmesi gereken nokta 3"
  ],
  "terms": [
    {{"term": "İlgili Almanca Terim", "meaning_tr": "Türkçe karşılığı ve anlamı"}}
  ]
}}
"""
    parsed, err = call_gemini_json(prompt, temperature=0.3, max_tokens=4096)
    if parsed and isinstance(parsed, dict):
        return {"result": parsed}
    return {"error": f"AI yanıtı oluşturulamadı: {err}"}
