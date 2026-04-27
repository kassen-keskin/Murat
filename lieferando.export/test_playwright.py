from playwright.sync_api import sync_playwright

url = "https://www.lieferando.de/speisekarte/goltz-burger-berlin"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto(url, wait_until="networkidle")
    
    # Accept cookies if the button is there (optional for just reading the DOM, but good for cleanliness)
    # Lieferando usually has a __NEXT_DATA__ json object. Let's just grab the whole innerHTML.
    content = page.content()
    
    with open("page.html", "w", encoding="utf-8") as f:
        f.write(content)
        
    browser.close()
