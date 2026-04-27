import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import cloudscraper
import json
from bs4 import BeautifulSoup
import pandas as pd

class LieferandoScraperApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Lieferando Menu Exporter")
        self.root.geometry("800x600")
        
        # Cloudflare'i aşmak için cloudscraper kullanıyoruz
        self.scraper = cloudscraper.create_scraper()
        self.scraped_data = [] # Çekilen verileri tutacak liste
        
        self._build_ui()
        
    def _build_ui(self):
        # Üst Panel (Girdiler ve Butonlar)
        frame_top = tk.Frame(self.root, padx=10, pady=10)
        frame_top.pack(fill=tk.X)
        
        tk.Label(frame_top, text="Lieferando URL:", font=('Arial', 10, 'bold')).pack(side=tk.LEFT)
        self.url_var = tk.StringVar()
        self.valid_urls = ["https://www.lieferando.de/speisekarte/goltz-burger-berlin"]
        self.url_var.set(self.valid_urls[0])
        self.url_entry = ttk.Combobox(frame_top, textvariable=self.url_var, width=48, font=('Arial', 10))
        self.url_entry['values'] = self.valid_urls
        self.url_entry.pack(side=tk.LEFT, padx=10)
        
        self.btn_check = tk.Button(frame_top, text="Kontrol Et", command=self.check_url, bg="#f0ad4e", fg="white", font=('Arial', 9, 'bold'))
        self.btn_check.pack(side=tk.LEFT, padx=5)
        
        self.btn_list = tk.Button(frame_top, text="Listele", command=self.list_items, bg="#5cb85c", fg="white", font=('Arial', 9, 'bold'))
        self.btn_list.pack(side=tk.LEFT, padx=5)
        
        self.btn_export = tk.Button(frame_top, text="Export (XLSX)", command=self.export_excel, bg="#0275d8", fg="white", font=('Arial', 9, 'bold'))
        self.btn_export.pack(side=tk.LEFT, padx=5)
        
        # Alt Panel (Tablo)
        frame_tree = tk.Frame(self.root, padx=10, pady=10)
        frame_tree.pack(fill=tk.BOTH, expand=True)
        
        columns = ("Kategori", "Artikel", "Fiyat")
        self.tree = ttk.Treeview(frame_tree, columns=columns, show="headings", style="Custom.Treeview")
        
        # Tablo Sütun Ayarları
        self.tree.heading("Kategori", text="Kategori")
        self.tree.column("Kategori", width=200)
        
        self.tree.heading("Artikel", text="Artikel (Menü / Ürün Adı)")
        self.tree.column("Artikel", width=350)
        
        self.tree.heading("Fiyat", text="Fiyat (€)")
        self.tree.column("Fiyat", width=100, anchor=tk.E)
            
        scrollbar = ttk.Scrollbar(frame_tree, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscroll=scrollbar.set)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
    def check_url(self):
        url = self.url_var.get().strip()
        if not url:
            messagebox.showerror("Hata", "Lütfen bir Lieferando URL'si girin.")
            return
            
        self.btn_check.config(text="Kontrol Ediliyor...", state=tk.DISABLED)
        self.root.update()
            
        try:
            res = self.scraper.get(url, timeout=15)
            if res.status_code == 200 and ('__NEXT_DATA__' in res.text or 'Lieferando' in res.text):
                self.add_valid_url(url)
                messagebox.showinfo("Başarılı", "Link geçerli ve Lieferando sayfasına başarıyla ulaşıldı.")
            else:
                messagebox.showwarning("Uyarı", f"Sayfa açıldı ama beklenen formatta değil. HTTP Status: {res.status_code}")
        except Exception as e:
            messagebox.showerror("Hata", f"Bağlantı hatası oluştu:\n{str(e)}")
        finally:
            self.btn_check.config(text="Kontrol Et", state=tk.NORMAL)

    def list_items(self):
        url = self.url_var.get().strip()
        if not url:
            messagebox.showerror("Hata", "Lütfen bir Lieferando URL'si girin.")
            return
            
        self.btn_list.config(text="Yükleniyor...", state=tk.DISABLED)
        self.root.update()
            
        try:
            res = self.scraper.get(url, timeout=15)
            if res.status_code != 200:
                messagebox.showerror("Hata", f"Sayfa yüklenemedi. HTTP Status: {res.status_code}")
                return
                
            soup = BeautifulSoup(res.text, 'html.parser')
            script = soup.find('script', id='__NEXT_DATA__')
            
            if not script:
                messagebox.showerror("Hata", "Veri bulunamadı. Link yanlış olabilir veya sitenin altyapısı değişmiş olabilir.")
                return
                
            data = json.loads(script.string)
            
            try:
                # Lieferando Next.js State Ağacı
                cdn = data['props']['appProps']['preloadedState']['menu']['restaurant']['cdn']
                menus = cdn['restaurant']['menus']
                items_dict = cdn['items']
            except KeyError:
                messagebox.showerror("Hata", "Sayfa verisi (JSON) beklenen formatta değil. Lieferando altyapıyı güncellemiş olabilir.")
                return
                
            # Tabloyu temizle
            for row in self.tree.get_children():
                self.tree.delete(row)
                
            self.scraped_data = []
            
            # İlk menüyü (genellikle ana restoran menüsü) alıyoruz
            if menus and len(menus) > 0:
                categories = menus[0].get('categories', [])
                for cat in categories:
                    cat_name = cat.get('name', 'Bilinmeyen Kategori')
                    item_ids = cat.get('itemIds', [])
                    
                    for iid in item_ids:
                        item_info = items_dict.get(iid)
                        if item_info:
                            item_name = item_info.get('name', 'Bilinmeyen Artikel')
                            variations = item_info.get('variations', [])
                            if variations:
                                price = variations[0].get('basePrice', 0.0)
                            else:
                                price = 0.0
                                
                            price_str = f"{price:.2f} €"
                            
                            self.scraped_data.append({
                                'Kategori': cat_name,
                                'Artikel': item_name,
                                'Fiyat (€)': price
                            })
                            
                            self.tree.insert('', tk.END, values=(cat_name, item_name, price_str))
            
            self.add_valid_url(url)
            
            if not self.scraped_data:
                messagebox.showinfo("Bilgi", "Bu sayfada çekilebilecek ürün bulunamadı.")
                
        except Exception as e:
            messagebox.showerror("Hata", f"Veri çekme işlemi sırasında bir hata oluştu:\n{str(e)}")
        finally:
            self.btn_list.config(text="Listele", state=tk.NORMAL)
            
    def export_excel(self):
        if not self.scraped_data:
            messagebox.showwarning("Uyarı", "Dışa aktarılacak veri bulunamadı! Önce 'Listele' butonuna basarak verileri çekin.")
            return
            
        url = self.url_var.get().strip()
        # Örnek: "https://www.lieferando.de/speisekarte/goltz-burger-berlin" -> "goltz-burger-berlin"
        restaurant_name = url.strip('/').split('/')[-1] if url else "menu"
        default_filename = f"{restaurant_name}.lieferando.export.xlsx"
        
        filepath = filedialog.asksaveasfilename(
            defaultextension=".xlsx",
            filetypes=[("Excel Dosyası", "*.xlsx")],
            title="Excel Dosyasını Kaydet",
            initialfile=default_filename
        )
        
        if filepath:
            try:
                df = pd.DataFrame(self.scraped_data)
                df.to_excel(filepath, index=False)
                messagebox.showinfo("Başarılı", f"Veriler başarıyla kaydedildi:\n{filepath}")
            except Exception as e:
                messagebox.showerror("Hata", f"Dosya kaydedilirken bir hata oluştu:\n{str(e)}")

    def add_valid_url(self, url):
        if url not in self.valid_urls:
            self.valid_urls.append(url)
            self.url_entry['values'] = self.valid_urls

if __name__ == "__main__":
    root = tk.Tk()
    
    # UI stili ayarları
    style = ttk.Style()
    style.theme_use('clam')
    style.configure("Treeview.Heading", font=('Arial', 10, 'bold'), background="#d9edf7")
    style.configure("Treeview", font=('Arial', 10), rowheight=25)
    
    app = LieferandoScraperApp(root)
    root.mainloop()
