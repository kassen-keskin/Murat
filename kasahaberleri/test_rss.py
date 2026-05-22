import requests
import urllib.parse
import xml.etree.ElementTree as ET

def fetch_rss():
    query = "E-Rechnung Pflicht Deutschland"
    encoded_query = urllib.parse.quote(f"{query} when:30d")
    url = f"https://news.google.com/rss/search?q={encoded_query}&hl=de&gl=DE&ceid=DE:de"
    response = requests.get(url)
    print(response.status_code)
    
    root = ET.fromstring(response.content)
    for item in root.findall('.//item')[:5]:
        title = item.find('title').text
        pubDate = item.find('pubDate').text
        print(title, pubDate)
        
if __name__ == "__main__":
    fetch_rss()
