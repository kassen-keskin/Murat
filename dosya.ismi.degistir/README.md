# PDF Toplu İsim Değiştirici

Basit bir Windows/Tkinter GUI uygulaması. Klasör seçip klasör altındaki `.pdf` dosyalarının isimlerinde toplu değişiklik yapar.

Özellikler:
- Bir klasör seçin
- İsimde belirli bir ifadeyi değiştir (ör. `Juli` → `Juni`)
- Dosya adına sonuna ekleme yap (ör. `Kassenmiete Juli 26`)
- Ön izleme ve onay ardından yeniden adlandırma

Çalıştırma:

Python 3 yüklü olmalı. Terminalde:

```powershell
python rename_pdfs.py
```

Kullanım:
- "Klasör Seç" ile hedef klasörü seçin.
- "Değiştir" alanına eski ifadeyi, yanındaki alana yeni ifadeyi yazıp "Ön İzle (Replace)" ile sonuçları görün.
- Ya da "Ekle (sonuna)" alanına eklemek istediğiniz metni yazıp "Ön İzle (Append)" ile sonuçları görün.
- Ön izleme listesini kontrol edin, sonra "Tümünü Yeniden Adlandır" ile işlemi onaylayıp uygulayın.

Yeni seçenekler:
- "Alt klasörleri de tara" ile seçilen klasörün altındaki PDF'ler de işlenir.
- "Büyük/küçük harf duyarsız" seçeneği replace işlemi için eşleşmeyi küçültür.
- İşlem sırasında bir ilerleme çubuğu ve durum etiketi görünür.

Notlar:
- Aynı ada sahip dosya çakışmalarında ` (1)`, ` (2)` ... gibi sonuna numara eklenerek korunur.
- Bu araç alt klasörlerde arama yapmaz — sadece seçilen klasörün içindeki dosyaları işler.
