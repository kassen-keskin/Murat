import cloudscraper
import re
import json
from bs4 import BeautifulSoup

scraper = cloudscraper.create_scraper()
res = scraper.get('https://www.lieferando.de/speisekarte/goltz-burger-berlin')
text = res.text

soup = BeautifulSoup(text, 'html.parser')
script = soup.find('script', id='__NEXT_DATA__')
if script:
    print('Found __NEXT_DATA__ script!')
    data = json.loads(script.string)
    print('Keys:', data.keys())
    # Save it to a file to inspect
    with open('next_data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
else:
    print('No __NEXT_DATA__ found')
    with open('page_cloudscraper.html', 'w', encoding='utf-8') as f:
        f.write(text)
