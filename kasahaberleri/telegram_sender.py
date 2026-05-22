import os
import requests
from typing import List

def send_telegram_message(message: str):
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    
    if not bot_token or not chat_id:
        print("Hata: TELEGRAM_BOT_TOKEN veya TELEGRAM_CHAT_ID bulunamadı.")
        return False

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
        "disable_notification": True
    }
    
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        return True
    except Exception as e:
        print(f"Telegram mesajı gönderilirken hata oluştu: {e}")
        return False

def send_news_to_telegram(news_list: List[dict]):
    if not news_list:
        send_telegram_message("Bugün için yeni ve önemli bir haber bulunamadı.")
        return
        
    message = "📰 <b>Günün Vergi ve Kasa Sistemleri Haberleri</b>\n\n"
    
    for i, news in enumerate(news_list, 1):
        title = news.get("title", "Başlıksız")
        link = news.get("link", "")
        date = news.get("date", "")
        
        message += f"{i}. <b>{title}</b>\n"
        message += f"📅 <i>{date}</i>\n"
        message += f"🔗 <a href='{link}'>Haberin tamamını oku</a>\n\n"
        
    send_telegram_message(message)
