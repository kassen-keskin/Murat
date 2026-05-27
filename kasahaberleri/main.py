import os
import sys
import time
import json
from datetime import datetime
import schedule
from dotenv import load_dotenv

# Windows console encoding fix
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

from news_fetcher import fetch_news
from telegram_sender import send_news_to_telegram

# Çevresel değişkenleri (.env) yükle
load_dotenv()

SENT_NEWS_FILE = "sent_news.json"

def load_sent_news():
    if os.path.exists(SENT_NEWS_FILE):
        with open(SENT_NEWS_FILE, "r", encoding="utf-8") as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return []
    return []

def save_sent_news(sent_list):
    with open(SENT_NEWS_FILE, "w", encoding="utf-8") as f:
        json.dump(sent_list, f, ensure_ascii=False, indent=4)

def job():
    print("Günlük görev başlatılıyor...")
    try:
        # 1. Haberleri Çek
        news_list = fetch_news()
        
        if not news_list:
            print("Hiç haber bulunamadı.")
            return
            
        # Önceden gönderilmiş haberleri yükle ve filtrele
        sent_news_urls = load_sent_news()
        new_news_list = [n for n in news_list if n.get("url") not in sent_news_urls]
        
        if not new_news_list:
            print("Daha önce gönderilmemiş yeni haber bulunamadı.")
            return
            
        # 2. Gemini olmadan doğrudan en yeni 10 haberi hazırla
        print(f"Bulunan {len(new_news_list)} yeni haber tarihe göre sıralanıp en yeni 10 tanesi seçiliyor...")
        
        from email.utils import parsedate_to_datetime
        
        def get_date(n):
            try:
                return parsedate_to_datetime(n.get("date", ""))
            except:
                return datetime.now()
                
        new_news_list.sort(key=get_date, reverse=True)
        
        from deep_translator import GoogleTranslator
        translator = GoogleTranslator(source='auto', target='tr')
        
        selected_news = []
        for n in new_news_list[:10]:
            original_title = n.get("title", "")
            try:
                title_tr = translator.translate(original_title) if original_title else ""
            except:
                title_tr = original_title
                
            selected_news.append({
                "title": title_tr,
                "link": n.get("url", ""),
                "date": n.get("date", ""),
                "source": n.get("source", ""),
                "summary": f"Orijinal başlık: {original_title}"
            })
        
        # 3. Telegram'a Gönder
        if selected_news:
            print(f"{len(selected_news)} adet haber Telegram'a gönderiliyor...")
            send_news_to_telegram(selected_news)
            
            # Gönderilenleri listeye ekle ve kaydet
            for n in selected_news:
                sent_news_urls.append(n["link"])
            
            # Dosya çok büyümesin diye son 1000 kaydı tut
            if len(sent_news_urls) > 1000:
                sent_news_urls = sent_news_urls[-1000:]
                
            save_sent_news(sent_news_urls)
            print("Gönderim başarılı.")
        else:
            print("Gönderilecek uygun haber bulunamadı.")
            
    except Exception as e:
        print(f"Görev sırasında bir hata oluştu: {e}")

def run_now():
    """Hemen test etmek için çalıştırır"""
    print("Hemen çalıştırma modu...")
    job()

if __name__ == "__main__":
    # Eğer komut satırından --test argümanı verilirse beklemeden hemen çalıştırır
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_now()
    else:
        # Zamanlayıcı ayarı: Her gün 21:00'da çalışır
        print("Bot başlatıldı. Her gün 21:00'da çalışacak şekilde zamanlandı.")
        print("Hemen test etmek için 'python main.py --test' komutunu kullanabilirsiniz.")
        
        schedule.every().day.at("21:00").do(job)
        
        # Sonsuz döngü: Zamanlayıcıyı kontrol eder
        while True:
            schedule.run_pending()
            time.sleep(60)
