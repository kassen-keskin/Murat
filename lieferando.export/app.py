import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import cloudscraper
import json
import re
from bs4 import BeautifulSoup
import pandas as pd

class BaseScraper:
    def __init__(self):
        self.scraper = cloudscraper.create_scraper(browser={
            'browser': 'chrome',
            'platform': 'windows',
            'desktop': True
        })

    def check_url(self, url):
        """Returns True if the URL is accessible and valid for the platform, else False"""
        raise NotImplementedError

    def fetch_items(self, url):
        """
        Scrapes the URL and returns a list of dictionaries:
        [{'Kategori': str, 'Artikel': str, 'Fiyat (€)': float, 'Pfand (€)': float/None}]
        """
        raise NotImplementedError


class LieferandoScraper(BaseScraper):
    def check_url(self, url):
        res = self.scraper.get(url, timeout=15)
        return res.status_code == 200 and ('__NEXT_DATA__' in res.text or 'Lieferando' in res.text)

    def fetch_items(self, url):
        res = self.scraper.get(url, timeout=15)
        if res.status_code != 200:
            raise Exception(f"Sayfa yüklenemedi. HTTP Status: {res.status_code}")
            
        soup = BeautifulSoup(res.text, 'html.parser')
        script = soup.find('script', id='__NEXT_DATA__')
        
        if not script:
            raise Exception("Veri bulunamadı. Link yanlış olabilir veya sitenin altyapısı değişmiş olabilir.")
            
        data = json.loads(script.string)
        
        try:
            cdn = data['props']['appProps']['preloadedState']['menu']['restaurant']['cdn']
            menus = cdn['restaurant']['menus']
            items_dict = cdn['items']
        except KeyError:
            raise Exception("Sayfa verisi (JSON) beklenen formatta değil. Lieferando altyapıyı güncellemiş olabilir.")
            
        scraped_data = []
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
                        price = 0.0
                        pfand = 0.0
                        
                        if variations:
                            price = variations[0].get('basePrice', 0.0)
                            init_info = variations[0].get('initialProductInformation')
                            if init_info and 'deposit' in init_info:
                                pfand = init_info['deposit'].get('value', 0.0)
                        else:
                            init_info = item_info.get('initialProductInformation')
                            if init_info and 'deposit' in init_info:
                                pfand = init_info['deposit'].get('value', 0.0)
                        
                        scraped_data.append({
                            'Kategori': cat_name,
                            'Artikel': item_name,
                            'Fiyat (€)': price,
                            'Pfand (€)': pfand if pfand > 0 else None
                        })
        return scraped_data


class WoltScraper(BaseScraper):
    def check_url(self, url):
        res = self.scraper.get(url, timeout=15)
        return res.status_code == 200 and 'wolt.com' in url

    def fetch_items(self, url):
        res = self.scraper.get(url, timeout=15)
        if res.status_code != 200:
            raise Exception(f"Wolt sayfasına bağlanılamadı. HTTP Status: {res.status_code}")
            
        soup = BeautifulSoup(res.text, 'html.parser')
        
        target_script = None
        for script in soup.find_all('script'):
            if script.string and '"queries"' in script.string and '"mutations"' in script.string:
                target_script = script.string
                break
                
        if not target_script:
            raise Exception("Wolt verisi sayfada bulunamadı.")
            
        try:
            data = json.loads(target_script)
        except Exception as e:
            raise Exception("Wolt verisi JSON formatında ayrılamadı.")
            
        found_items = []
        def _find_wolt_items(obj):
            if isinstance(obj, dict):
                if 'name' in obj and 'price' in obj and 'id' in obj and 'description' in obj:
                    found_items.append(obj)
                for v in obj.values():
                    _find_wolt_items(v)
            elif isinstance(obj, list):
                for item in obj:
                    _find_wolt_items(item)
                    
        _find_wolt_items(data)
        
        scraped_data = []
        seen = set()
        for item in found_items:
            item_name = item.get('name')
            if item_name in seen:
                continue
            seen.add(item_name)
            
            price_cents = item.get('price', 0)
            price = price_cents / 100.0
            
            pfand = 0.0
            deposit_info = item.get('deposit')
            if isinstance(deposit_info, dict):
                pfand = deposit_info.get('amount', 0) / 100.0
                
            scraped_data.append({
                'Kategori': 'Menü',
                'Artikel': item_name,
                'Fiyat (€)': price,
                'Pfand (€)': pfand if pfand > 0 else None
            })
            
        if not scraped_data:
            raise Exception("Wolt sayfasında çekilebilecek ürün bulunamadı.")
            
        return scraped_data


class UberEatsScraper(BaseScraper):
    def check_url(self, url):
        res = self.scraper.get(url, timeout=15)
        return res.status_code == 200 and 'ubereats.com' in url

    def fetch_items(self, url):
        res = self.scraper.get(url, timeout=15)
        if res.status_code != 200:
            raise Exception(f"Sayfa yüklenemedi. HTTP Status: {res.status_code}")
            
        soup = BeautifulSoup(res.text, 'html.parser')
        script = soup.find('script', id='__REACT_QUERY_STATE__')
        
        if not script:
            raise Exception("Veri bulunamadı. UberEats altyapıyı değiştirmiş olabilir veya Cloudflare engelledi.")
            
        data_text = script.string
        if not data_text:
            raise Exception("JSON verisi boş.")
            
        # Decode the escaped strings
        decoded = data_text.replace('\\u0022', '"').replace('\\u0026', '&').replace('\\\\', '\\')
        
        # Regex to find item titles and prices. UberEats prices are in cents.
        matches = re.findall(r'\"title\":\"([^\"]+)\"(?:(?!\"title\").)*?\"price\":(\d+)', decoded)
        
        scraped_data = []
        # Filter duplicates just in case
        seen = set()
        for match in matches:
            title = match[0]
            price_cents = int(match[1])
            price = price_cents / 100.0
            
            if title not in seen:
                seen.add(title)
                # UberEats usually lacks exact categories in this regex scrape, and Pfand is not explicitly separated.
                scraped_data.append({
                    'Kategori': 'Menü',
                    'Artikel': title,
                    'Fiyat (€)': price,
                    'Pfand (€)': None
                })
                
        if not scraped_data:
            raise Exception("Ürünler bulunamadı. Regex eşleşmesi başarısız oldu.")
            
        return scraped_data


class MenuScraperApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Menu Exporter (Lieferando, Wolt, UberEats)")
        self.root.geometry("800x600")
        
        self.scraped_data = []
        
        self._build_ui()
        
    def get_scraper_for_url(self, url):
        if 'wolt.com' in url:
            return WoltScraper()
        elif 'ubereats.com' in url:
            return UberEatsScraper()
        else:
            # Default fallback
            return LieferandoScraper()
        
    def _build_ui(self):
        # Üst Panel (Girdiler ve Butonlar)
        frame_top = tk.Frame(self.root, padx=10, pady=10)
        frame_top.pack(fill=tk.X)
        
        tk.Label(frame_top, text="URL (Lieferando, Wolt, UberEats):", font=('Arial', 10, 'bold')).pack(side=tk.LEFT)
        self.url_var = tk.StringVar()
        self.valid_urls = [
            "https://www.lieferando.de/speisekarte/goltz-burger-berlin",
            "https://wolt.com/de/deu/berlin/venue/getrnke-brlin",
            "https://www.ubereats.com/store/kebab-haus-strausberg/vPOwO_4LUJCXwsbtPUJKfw"
        ]
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
        
        columns = ("Kategori", "Artikel", "Fiyat", "Pfand")
        self.tree = ttk.Treeview(frame_tree, columns=columns, show="headings", style="Custom.Treeview")
        
        # Tablo Sütun Ayarları
        self.tree.heading("Kategori", text="Kategori")
        self.tree.column("Kategori", width=200)
        
        self.tree.heading("Artikel", text="Artikel (Menü / Ürün Adı)")
        self.tree.column("Artikel", width=300)
        
        self.tree.heading("Fiyat", text="Fiyat (€)")
        self.tree.column("Fiyat", width=100, anchor=tk.E)

        self.tree.heading("Pfand", text="Pfand (€)")
        self.tree.column("Pfand", width=100, anchor=tk.E)
            
        scrollbar = ttk.Scrollbar(frame_tree, orient=tk.VERTICAL, command=self.tree.yview)
        self.tree.configure(yscroll=scrollbar.set)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
    def check_url(self):
        url = self.url_var.get().strip()
        if not url:
            messagebox.showerror("Hata", "Lütfen bir URL girin.")
            return
            
        self.btn_check.config(text="Kontrol Ediliyor...", state=tk.DISABLED)
        self.root.update()
            
        try:
            scraper = self.get_scraper_for_url(url)
            if scraper.check_url(url):
                self.add_valid_url(url)
                messagebox.showinfo("Başarılı", f"Link geçerli ve başarıyla ulaşıldı. Algılanan Platform: {scraper.__class__.__name__}")
            else:
                messagebox.showwarning("Uyarı", "Sayfa açıldı ama beklenen formatta değil veya ulaşılamadı.")
        except Exception as e:
            messagebox.showerror("Hata", f"Bağlantı hatası oluştu:\n{str(e)}")
        finally:
            self.btn_check.config(text="Kontrol Et", state=tk.NORMAL)

    def list_items(self):
        url = self.url_var.get().strip()
        if not url:
            messagebox.showerror("Hata", "Lütfen bir URL girin.")
            return
            
        self.btn_list.config(text="Yükleniyor...", state=tk.DISABLED)
        self.root.update()
            
        try:
            scraper = self.get_scraper_for_url(url)
            data = scraper.fetch_items(url)
            
            # Tabloyu temizle
            for row in self.tree.get_children():
                self.tree.delete(row)
                
            self.scraped_data = data
            
            for row in self.scraped_data:
                cat_name = row['Kategori']
                item_name = row['Artikel']
                price = row['Fiyat (€)']
                pfand = row['Pfand (€)']
                
                price_str = f"{price:.2f} €"
                pfand_str = f"{pfand:.2f} €" if pfand and pfand > 0 else "-"
                
                self.tree.insert('', tk.END, values=(cat_name, item_name, price_str, pfand_str))
            
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
        
        # Create a dynamic filename based on platform and name
        platform = "menu"
        if "lieferando.de" in url:
            platform = "lieferando"
            restaurant_name = url.strip('/').split('/')[-1]
        elif "wolt.com" in url:
            platform = "wolt"
            restaurant_name = url.strip('/').split('/')[-1]
        elif "ubereats.com" in url:
            platform = "ubereats"
            parts = url.strip('/').split('/')
            try:
                restaurant_name = parts[parts.index('store') + 1]
            except:
                restaurant_name = "restaurant"
        else:
            restaurant_name = "restaurant"
            
        default_filename = f"{restaurant_name}.{platform}.export.xlsx"
        
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
    
    app = MenuScraperApp(root)
    root.mainloop()
