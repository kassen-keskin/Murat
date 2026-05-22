import os
import json
import requests
import urllib.parse
import xml.etree.ElementTree as ET

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
                
    print(f"Toplam {len(all_news)} haber bulundu. Tarihe göre sıralanmak üzere ana programa aktarılıyor...")
    return all_news
