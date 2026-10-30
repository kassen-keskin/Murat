import sys
import time
import schedule
from news_service import refresh_news

# Windows console encoding fix
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')


def job():
    print("Kasa Haberleri & Mevzuat güncellemesi başlatılıyor...")
    try:
        result = refresh_news(max_new_items=25, days=30)
        print(
            f"Güncelleme tamamlandı: {result.get('added_count', 0)} yeni haber eklendi. "
            f"Toplam arşiv: {result.get('total_count', 0)} haber. "
            f"Son güncelleme: {result.get('last_updated')}"
        )
    except Exception as e:
        print(f"Görev sırasında bir hata oluştu: {e}")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        job()
    else:
        print("Kasa Haberleri servisi başlatıldı (Panel entegrasyonu). Her gün 09:00 ve 21:00'da güncellenir.")
        print("Hemen güncellemek için 'python main.py --test' komutunu veya Panel içindeki 'Yeni Haberleri Çek' butonunu kullanabilirsiniz.")
        schedule.every().day.at("09:00").do(job)
        schedule.every().day.at("21:00").do(job)
        while True:
            schedule.run_pending()
            time.sleep(60)
