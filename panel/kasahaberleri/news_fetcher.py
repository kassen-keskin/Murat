from news_service import fetch_raw_rss_items, DEFAULT_QUERIES

QUERIES = [q["query"] for q in DEFAULT_QUERIES]

def fetch_news(days: int = 30):
    """Google News RSS üzerinden kasa sistemleri, mevzuat ve teknoloji haberlerini çeker."""
    return fetch_raw_rss_items(days=days)
