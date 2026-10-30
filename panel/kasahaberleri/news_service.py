import os
import re
import json
import time
import base64
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

BROWSER_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
}


class _HTMLStripper(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self._skip = False

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style", "noscript", "svg", "header", "footer", "nav", "aside", "form"):
            self._skip = True
        elif tag in ("p", "br", "div", "li", "h1", "h2", "h3", "h4", "tr"):
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in ("script", "style", "noscript", "svg", "header", "footer", "nav", "aside", "form"):
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


def is_deep_article_url(url: str) -> bool:
    """Returns True only if the URL points to a specific path/page, not just a bare domain root."""
    if not url or not url.startswith(("http://", "https://")):
        return False
    try:
        parsed = urllib.parse.urlparse(url)
        if not parsed.netloc:
            return False
        path_clean = (parsed.path or "").strip("/")
        # Reject bare homepages like https://www.ehi.org or https://www.bsi.bund.de/de
        if len(path_clean) <= 3 and not parsed.query:
            return False
        return True
    except Exception:
        return False


def make_article_id(url: str, title: str = "") -> str:
    basis = (title or url or str(time.time())).encode("utf-8", errors="ignore")
    return hashlib.sha1(basis).hexdigest()[:16]


def get_gemini_api_key() -> str:
    load_dotenv(os.path.join(BASE_DIR, ".env"), override=False)
    load_dotenv(os.path.join(PANEL_DIR, ".env"), override=False)
    return os.getenv("GEMINI_API_KEY", "").strip().strip('"').strip("'")


def load_news_store() -> dict:
    default_store = {
        "last_updated": None,
        "queries": DEFAULT_QUERIES,
        "articles": []
    }
    if not os.path.exists(NEWS_DATA_FILE):
        save_news_store(default_store)
        return default_store
    try:
        with open(NEWS_DATA_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            if not isinstance(data, dict):
                return default_store
            articles = data.get("articles")
            if not isinstance(articles, list):
                articles = []
            # Clean out any old synthetic seed articles that had bare homepage URLs
            cleaned_articles = [
                a for a in articles
                if not str(a.get("id", "")).startswith("rehber-")
                or is_deep_article_url(a.get("resolved_url") or a.get("url") or "")
            ]
            data["articles"] = cleaned_articles
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
            if not any(pos in combined for pos in ["registrierkasse", "kassensystem", "kassensichv", "bonpflicht", "pos-system"]):
                return True
    return False


def google_translate_fallback(text: str, target_lang: str = "tr") -> str:
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


def resolve_google_news_url(gnews_url: str, title: str = "", source: str = "") -> str:
    """
    Decodes a Google News RSS article link (https://news.google.com/rss/articles/CBMi...)
    into the exact deep publisher URL where the article lives.
    """
    if not gnews_url:
        return ""
    if "news.google.com" not in gnews_url and "bing.com/news/apiclick" not in gnews_url:
        return gnews_url

    # Case 0: Bing News apiclick URL with ?url=...
    if "bing.com/news/apiclick" in gnews_url:
        try:
            parsed_q = urllib.parse.parse_qs(urllib.parse.urlparse(gnews_url).query)
            if "url" in parsed_q and parsed_q["url"]:
                candidate = parsed_q["url"][0]
                if is_deep_article_url(candidate):
                    return candidate
        except Exception:
            pass

    m = re.search(r"/(?:rss/)?articles/([A-Za-z0-9_-]+)", gnews_url)
    art_id = m.group(1) if m else ""

    # Step 1: Legacy base64 decode (if URL is directly embedded in protobuf bytes)
    if art_id:
        try:
            padding = "=" * (-len(art_id) % 4)
            raw_bytes = base64.urlsafe_b64decode(art_id + padding)
            decoded_latin = raw_bytes.decode("latin1", errors="ignore")
            url_match = re.search(r"(https?://[^\x00-\x1f\x7f-\xff\"'<>\\]+)", decoded_latin)
            if url_match:
                candidate = url_match.group(1)
                if "news.google.com" not in candidate and is_deep_article_url(candidate):
                    return candidate
        except Exception:
            pass

    # Step 2: Modern Google News batchexecute (Fbv4je) RPC resolution
    if art_id:
        for prefix in ("https://news.google.com/articles/", "https://news.google.com/rss/articles/"):
            try:
                page_url = f"{prefix}{art_id}?hl=de&gl=DE&ceid=DE:de"
                headers = {
                    **BROWSER_HEADERS,
                    "Cookie": "CONSENT=YES+cb.20230531-04-p0.de+FX+999; SOCS=CAESHAgBEhJnd3NfMjAyNDA1MjItMF9SQzIaAmRlIAEaBgiA_LyaBg"
                }
                req = urllib.request.Request(page_url, headers=headers)
                with urllib.request.urlopen(req, timeout=8) as resp:
                    html_str = resp.read().decode("utf-8", errors="ignore")

                # Check if direct data-n-au or canonical external link exists in HTML
                au_match = re.search(r'data-n-au="([^"]+)"', html_str)
                if au_match and is_deep_article_url(au_match.group(1)):
                    return unescape(au_match.group(1))

                ts_match = re.search(r'data-n-a-ts="(\d+)"', html_str)
                sg_match = re.search(r'data-n-a-sg="([^"]+)"', html_str)
                id_match = re.search(r'data-n-a-id="([^"]+)"', html_str)

                if ts_match and sg_match:
                    ts = ts_match.group(1)
                    sg = sg_match.group(1)
                    real_id = id_match.group(1) if id_match else art_id

                    inner_req = (
                        f'["garturlreq",[["X","X",["X","X"],null,null,1,1,"DE:de",null,1,'
                        f'null,null,null,null,null,0,1],"X","X",1,[1,1,1],1,1,null,0,0,null,0],'
                        f'"{real_id}",{ts},"{sg}"]'
                    )
                    f_req = json.dumps([[["Fbv4je", inner_req, None, "generic"]]])
                    post_data = urllib.parse.urlencode({"f.req": f_req}).encode("utf-8")

                    rpc_url = "https://news.google.com/_/DotsSplashUi/data/batchexecute?rpcids=Fbv4je"
                    rpc_headers = {
                        **headers,
                        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
                        "Referer": "https://news.google.com/"
                    }
                    rpc_req = urllib.request.Request(rpc_url, data=post_data, headers=rpc_headers, method="POST")
                    with urllib.request.urlopen(rpc_req, timeout=8) as rpc_resp:
                        rpc_text = rpc_resp.read().decode("utf-8", errors="ignore")

                    # Unescape JSON string inside batchexecute response
                    res_match = re.search(r'\["garturlres","(https?:[^"]+)"', rpc_text)
                    if not res_match:
                        res_match = re.search(r'\\"garturlres\\",\\"(https?:[^\\"]+)\\"', rpc_text)
                    if res_match:
                        resolved = res_match.group(1).replace("\\/", "/").replace("\\u003d", "=").replace("\\u0026", "&")
                        if is_deep_article_url(resolved):
                            return resolved
                    break
            except Exception as e:
                print(f"[kasahaberleri] Fbv4je çözümleme uyarısı: {e}")

    # Step 3: Fallback search via Bing News RSS by exact headline to obtain direct deep article URL
    if title:
        try:
            search_q = f'"{title[:80]}" {source}'.strip()
            b_url = f"https://www.bing.com/news/search?q={urllib.parse.quote(search_q)}&setlang=de-de&cc=DE&format=rss"
            req = urllib.request.Request(b_url, headers=BROWSER_HEADERS)
            with urllib.request.urlopen(req, timeout=6) as resp:
                b_xml = resp.read()
            b_root = ET.fromstring(b_xml)
            first_item = b_root.find(".//item")
            if first_item is not None:
                b_link = (first_item.findtext("link") or "").strip()
                if "url=" in b_link:
                    pq = urllib.parse.parse_qs(urllib.parse.urlparse(b_link).query)
                    if "url" in pq and pq["url"] and is_deep_article_url(pq["url"][0]):
                        return pq["url"][0]
                elif is_deep_article_url(b_link):
                    return b_link
        except Exception:
            pass

    return gnews_url


def fetch_raw_rss_items(queries=None, days: int = 30, per_query_limit: int = 8) -> list:
    if queries is None:
        store = load_news_store()
        queries = store.get("queries") or DEFAULT_QUERIES

    raw_items = []
    seen_urls = set()
    seen_titles = set()

    for q_obj in queries:
        q_str = q_obj["query"] if isinstance(q_obj, dict) else str(q_obj)
        default_cat = q_obj.get("category", "sektor") if isinstance(q_obj, dict) else "sektor"
        query_label = q_obj.get("label", q_str) if isinstance(q_obj, dict) else q_str

        # 1. Fetch from Bing News RSS first (provides direct unencrypted deep article URLs in ?url=...)
        try:
            b_encoded = urllib.parse.quote(q_str)
            b_url = f"https://www.bing.com/news/search?q={b_encoded}&setlang=de-de&cc=DE&format=rss"
            req = urllib.request.Request(b_url, headers=BROWSER_HEADERS)
            with urllib.request.urlopen(req, timeout=10) as resp:
                xml_bytes = resp.read()
            root = ET.fromstring(xml_bytes)
            for item in root.findall(".//item")[:per_query_limit // 2 + 2]:
                title = (item.findtext("title") or "").strip()
                raw_link = (item.findtext("link") or "").strip()
                pub_date = (item.findtext("pubDate") or "").strip()
                desc_html = (item.findtext("description") or "").strip()
                snippet = strip_html(desc_html)

                # Extract direct article URL from Bing's apiclick wrapper
                deep_link = raw_link
                if "url=" in raw_link:
                    pq = urllib.parse.parse_qs(urllib.parse.urlparse(raw_link).query)
                    if "url" in pq and pq["url"]:
                        deep_link = pq["url"][0]

                if not title or not is_deep_article_url(deep_link):
                    continue

                source_name = urllib.parse.urlparse(deep_link).netloc.replace("www.", "")
                norm_title = re.sub(r"\W+", "", title.lower())
                if deep_link in seen_urls or norm_title in seen_titles:
                    continue
                if is_likely_irrelevant(title, snippet):
                    continue

                seen_urls.add(deep_link)
                seen_titles.add(norm_title)
                dt = parse_rss_date(pub_date)
                raw_items.append({
                    "id": make_article_id(deep_link, title),
                    "original_title": title,
                    "url": deep_link,
                    "resolved_url": deep_link,
                    "source": source_name,
                    "published_at": dt.isoformat(),
                    "date_display": dt.strftime("%d.%m.%Y %H:%M"),
                    "rss_snippet": snippet[:600],
                    "default_category": default_cat,
                    "query_label": query_label,
                })
        except Exception as e:
            print(f"[kasahaberleri] Bing RSS uyarısı ({q_str}): {e}")

        # 2. Fetch from Google News RSS
        try:
            encoded_query = urllib.parse.quote(f"{q_str} when:{days}d")
            url = f"https://news.google.com/rss/search?q={encoded_query}&hl=de&gl=DE&ceid=DE:de"
            req = urllib.request.Request(url, headers=BROWSER_HEADERS)
            with urllib.request.urlopen(req, timeout=10) as resp:
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
                desc_html = (desc_el.text or "").strip() if desc_el is not None else ""
                snippet = strip_html(desc_html)

                if not title or not link:
                    continue

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
                    "resolved_url": "",
                    "source": source_name,
                    "published_at": dt.isoformat(),
                    "date_display": dt.strftime("%d.%m.%Y %H:%M"),
                    "rss_snippet": snippet[:600],
                    "default_category": default_cat,
                    "query_label": query_label,
                })
        except Exception as e:
            print(f"[kasahaberleri] Google News RSS hatası ({q_str}): {e}")

    raw_items.sort(key=lambda x: x.get("published_at", ""), reverse=True)
    return raw_items


def enrich_items_with_gemini(items: list) -> list:
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

Aşağıda Almanya haber kaynaklarından çekilmiş haber başlıkları ve özet kesitleri yer alıyor.
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

JSON formatında bir dizi (array) döndür:
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

    # Resolve deep article URLs for selected items
    for item in enriched:
        if not is_deep_article_url(item.get("resolved_url", "")):
            resolved = resolve_google_news_url(
                item.get("url", ""),
                title=item.get("original_title", ""),
                source=item.get("source", "")
            )
            if is_deep_article_url(resolved) and "news.google.com" not in resolved:
                item["resolved_url"] = resolved
                item["url"] = resolved

    return enriched


def refresh_news(max_new_items: int = 25, days: int = 30) -> dict:
    store = load_news_store()
    existing_articles = store.get("articles", [])
    existing_by_id = {a.get("id"): a for a in existing_articles if a.get("id")}
    existing_urls = {a.get("url") for a in existing_articles if a.get("url")}
    existing_titles = {re.sub(r"\W+", "", (a.get("original_title") or "").lower()) for a in existing_articles}

    raw_items = fetch_raw_rss_items(store.get("queries"), days=days, per_query_limit=8)

    new_candidates = []
    for item in raw_items:
        norm_t = re.sub(r"\W+", "", (item.get("original_title") or "").lower())
        if item["id"] not in existing_by_id and item["url"] not in existing_urls and norm_t not in existing_titles:
            new_candidates.append(item)
            if len(new_candidates) >= max_new_items:
                break

    added_count = 0
    if new_candidates:
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

    existing_articles.sort(key=lambda x: x.get("published_at", ""), reverse=True)

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


def scrape_webpage_text(url: str, title: str = "", source: str = "") -> tuple:
    """
    Resolves the exact deep article URL and extracts the article's full readable text
    from JSON-LD articleBody, meta description, and <article>/<p> tags.
    """
    resolved_url = resolve_google_news_url(url, title=title, source=source)

    try:
        req = urllib.request.Request(resolved_url, headers=BROWSER_HEADERS)
        with urllib.request.urlopen(req, timeout=12) as resp:
            final_url = resp.geturl()
            html_bytes = resp.read(500_000)
            html_str = html_bytes.decode("utf-8", errors="ignore")

        if "news.google.com" in final_url or "consent.google.com" in final_url:
            return "", resolved_url

        extracted_blocks = []

        # 1. Try JSON-LD (articleBody / description) used by German publishers
        ld_matches = re.findall(
            r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
            html_str,
            flags=re.IGNORECASE | re.DOTALL
        )
        for ld_raw in ld_matches:
            try:
                ld_obj = json.loads(ld_raw.strip())
                objs = ld_obj if isinstance(ld_obj, list) else [ld_obj]
                for o in objs:
                    if isinstance(o, dict):
                        body_txt = o.get("articleBody") or o.get("text") or ""
                        if isinstance(body_txt, str) and len(body_txt.strip()) > 80:
                            extracted_blocks.append(strip_html(body_txt))
            except Exception:
                pass

        # 2. Extract meta description / og:description
        meta_desc = re.search(
            r'<meta[^>]+(?:property=["\']og:description["\']|name=["\']description["\'])[^>]+content=["\']([^"\']+)["\']',
            html_str,
            flags=re.IGNORECASE
        )
        if meta_desc:
            md_txt = unescape(meta_desc.group(1)).strip()
            if len(md_txt) > 40:
                extracted_blocks.append(md_txt)

        # 3. Extract <article> or <main> paragraphs first, fallback to all <p>
        article_match = re.search(r"<article[^>]*>(.*?)</article>", html_str, flags=re.IGNORECASE | re.DOTALL)
        if not article_match:
            article_match = re.search(r"<main[^>]*>(.*?)</main>", html_str, flags=re.IGNORECASE | re.DOTALL)
        scope_html = article_match.group(1) if article_match else html_str

        paragraphs = re.findall(r"<p[^>]*>(.*?)</p>", scope_html, flags=re.IGNORECASE | re.DOTALL)
        for p in paragraphs:
            txt = strip_html(p).strip()
            if len(txt) > 45 and not any(
                skip in txt.lower()
                for skip in ["cookie", "datenschutz", "impressum", "newsletter abon", "alle rechte vorbehalten", "anmelden"]
            ):
                if txt not in extracted_blocks:
                    extracted_blocks.append(txt)

        full_text = "\n\n".join(extracted_blocks[:30])
        best_url = final_url if is_deep_article_url(final_url) else resolved_url
        return full_text[:9000], best_url
    except Exception as e:
        print(f"[kasahaberleri] Sayfa okuma uyarısı ({resolved_url}): {e}")
        return "", resolved_url


def build_article_reader_content(article_id: str, force_refresh: bool = False) -> dict:
    store = load_news_store()
    articles = store.get("articles", [])
    target = next((a for a in articles if a.get("id") == article_id), None)
    if not target:
        return {"error": "Haber bulunamadı."}

    target["is_read"] = True

    # Ensure deep URL is resolved even if reader_content was cached earlier
    current_url = target.get("resolved_url") or target.get("url") or ""
    if "news.google.com" in current_url or not is_deep_article_url(current_url):
        resolved = resolve_google_news_url(
            target.get("url", ""),
            title=target.get("original_title", ""),
            source=target.get("source", "")
        )
        if is_deep_article_url(resolved) and "news.google.com" not in resolved:
            target["resolved_url"] = resolved
            target["url"] = resolved

    if target.get("reader_content") and not force_refresh and target["reader_content"].get("scraped_de"):
        save_news_store(store)
        return {"article": target, "reader": target["reader_content"]}

    title_de = target.get("original_title", "")
    source = target.get("source", "")
    date_str = target.get("date_display", "")
    snippet_de = target.get("rss_snippet", "")

    scraped_de, final_url = scrape_webpage_text(
        target.get("resolved_url") or target.get("url", ""),
        title=title_de,
        source=source
    )
    if is_deep_article_url(final_url) and "news.google.com" not in final_url:
        target["resolved_url"] = final_url
        target["url"] = final_url

    prompt = f"""Sen Almanya kasa sistemleri (Kassensysteme / POS), KassenSichV, GoBD, TSE, § 146a AO Kassenmeldepflicht, E-Rechnung, Kassen-Nachschau, DATEV ve ELSTER konularında uzman bir eğitmen ve danışmansın.

Kullanıcı Panel içindeki okuma ekranında şu haberi açtı:
- Orijinal Başlık (Almanca): {title_de}
- Kaynak: {source} ({date_str})
- Haberin Tam Bağlantısı: {target.get("resolved_url") or target.get("url", "")}
- RSS Özeti / Kesit: {snippet_de}
- Haberin Web Sayfasından Çekilen Orijinal Metni:
{scraped_de if scraped_de else "(Haber sitesinin tam metnine doğrudan erişilemedi, başlık ve RSS özetinden hareketle haberin tam içeriğini açıkla)"}

Lütfen JSON formatında şu alanları döndür:
{{
  "title_tr": "Haberin Türkçe Başlığı",
  "lead_tr": "Haberin 2-3 cümlelik net giriş özeti",
  "article_body_tr": "Haber metninin eksiksiz, akıcı ve anlaşılır Türkçe çevirisi ve detaylı anlatımı (paragrafları \\n\\n ile ayır).",
  "legal_or_tech_context_tr": "Kanuni veya Teknolojik Arka Plan: Bu haber Almanya'daki hangi yasa (örn. § 146a AO, KassenSichV, GoBD, DSFinV-K, E-Rechnung) veya hangi kasa teknolojisi (TSE, Cloud-TSE, SoftPOS, DATEV/ELSTER) ile ilgilidir?",
  "action_items_tr": [
    "Kasa satışı, kurulumu, teknik servisi veya işletmeler için dikkat edilmesi gereken 1. somut madde",
    "2. somut madde",
    "3. somut madde"
  ],
  "glossary": [
    {{"term": "Haberde geçen önemli Almanca terim", "meaning_tr": "Türkçe açıklaması"}}
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
            "scraped_de": scraped_de[:4000] if scraped_de else snippet_de,
            "generated_at": datetime.now().strftime("%d.%m.%Y %H:%M")
        }
    else:
        translated_body = google_translate_fallback(scraped_de) if scraped_de else (target.get("summary_tr") or google_translate_fallback(snippet_de or title_de))
        reader_data = {
            "title_tr": target.get("title_tr") or title_de,
            "lead_tr": target.get("summary_tr") or "",
            "article_body_tr": translated_body,
            "legal_or_tech_context_tr": target.get("impact_tr") or "",
            "action_items_tr": [],
            "glossary": [],
            "scraped_de": scraped_de[:4000] if scraped_de else snippet_de,
            "generated_at": datetime.now().strftime("%d.%m.%Y %H:%M")
        }

    target["reader_content"] = reader_data
    save_news_store(store)
    return {"article": target, "reader": reader_data}


def ask_kasa_knowledge_ai(question: str) -> dict:
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
