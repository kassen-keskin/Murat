import os
import json
import requests
import urllib.parse
import xml.etree.ElementTree as ET
import google.generativeai as genai

# Topics to search on Google News
QUERIES = [
    "Kassensystem",
    "Registrierkassen",
    "KassenSichV",
    "Kassenführung",
    "Finanzamt",
    "GoBD",
    "DATEV",
    "ELSTER",
    "POS-Systeme",
    "Technische Sicherheitseinrichtung TSE",
    "Digitaler Bon",
    "Elektronische Aufzeichnungssysteme",
    "Kassensicherungsverordnung",
    "Meldepflicht",
    "Kassen Nachschau"
]

def fetch_news():
    print("Haberler Google News üzerinden aranıyor...")
    all_news = []
    
    for query in QUERIES:
        try:
            encoded_query = urllib.parse.quote(f"{query} when:30d")
            url = f"https://news.google.com/rss/search?q={encoded_query}&hl=de&gl=DE&ceid=DE:de"
            
            response = requests.get(url)
            response.raise_for_status()
            
            root = ET.fromstring(response.content)
            for item in root.findall('.//item')[:15]: # Take top 15 from each query
                title = item.find('title').text
                link = item.find('link').text
                pubDate = item.find('pubDate').text
                source = item.find('source').text if item.find('source') is not None else "Google News"
                
                # Check for duplicates by URL
                if not any(n['url'] == link for n in all_news):
                    all_news.append({
                        "title": title,
                        "url": link,
                        "date": pubDate,
                        "source": source
                    })
        except Exception as e:
            print(f"Arama sırasında hata ({query}): {e}")
                
    print(f"Toplam {len(all_news)} haber bulundu. Yapay zeka ile filtreleniyor...")
    return all_news

def filter_and_summarize_with_gemini(news_list):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("Hata: GEMINI_API_KEY bulunamadı.")
        return []
        
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.0-flash')
    
    prompt = """
    Aşağıda Almanya vergi sistemi, yazar kasa sistemleri (kassensystem, TSE, vb.), elektronik fatura (E-Rechnung), ELSTER, DATEV ve benzeri konularda son 1 ayda çıkmış çeşitli haberlerin bir listesi JSON formatında verilmektedir.
    
    Görevlerin:
    1. Bu haberleri incele ve vergi mükellefleri, işletmeler veya muhasebeciler için EN ÖNEMLİ, ANLAMLI ve TAZE olan en fazla 10 tanesini seç.
    2. Alakasız veya çok genel/önemsiz olanları ele.
    3. Seçtiğin haberlerin başlıklarını ve özetlerini Türkçe olarak kısaca çevir (kısa ve öz 1-2 cümle).
    4. Sonucu aşağıdaki JSON formatında döndür. BAŞKA HİÇBİR METİN YAZMA, SADECE JSON DÖNDÜR.
    
    [
        {
            "title": "Türkçe Haber Başlığı",
            "link": "Orijinal URL",
            "summary": "Türkçe kısa özet...",
            "source": "Haber Kaynağı",
            "date": "Tarih"
        }
    ]
    
    Haber Listesi:
    """
    
    prompt += json.dumps(news_list, ensure_ascii=False)
    
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:-3]
        elif text.startswith("```"):
            text = text[3:-3]
            
        selected_news = json.loads(text)
        return selected_news
    except Exception as e:
        print(f"Gemini API hatası veya JSON parse hatası: {e}")
        return []
