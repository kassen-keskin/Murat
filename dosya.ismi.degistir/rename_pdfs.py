import os
import re
import shutil
import sys
from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - fallback for environments without python-dotenv
    load_dotenv = None


def load_panel_env():
    candidates = []
    script_dir = Path(__file__).resolve().parent
    candidates.append(script_dir / '.env')
    candidates.append(script_dir.parent / 'panel' / '.env')
    candidates.append(script_dir / 'panel' / '.env')
    candidates.append(Path.cwd() / '.env')
    candidates.append(Path.cwd().parent / 'panel' / '.env')

    for candidate in candidates:
        if candidate.exists():
            if load_dotenv is not None:
                load_dotenv(candidate, override=False)
            else:
                for line in candidate.read_text(encoding='utf-8').splitlines():
                    line = line.strip()
                    if not line or line.startswith('#') or '=' not in line:
                        continue
                    key, value = line.split('=', 1)
                    os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))
            return str(candidate)
    return None


load_panel_env()


def find_pdfs(folder: Path, recursive: bool = False):
    if recursive:
        return sorted(p for p in folder.rglob('*.pdf') if p.is_file())
    return sorted(p for p in folder.iterdir() if p.is_file() and p.suffix.lower() == '.pdf')


def make_new_name_replace(path: Path, old: str, new: str):
    name = path.stem
    if old == '':
        return path
    new_name = name.replace(old, new)
    return path.with_name(new_name + path.suffix)


def make_new_name_append(path: Path, append_text: str, add_space: bool):
    name = path.stem
    sep = ' ' if add_space else ''
    new_name = name + (sep + append_text if append_text else '')
    return path.with_name(new_name + path.suffix)


def unique_path(path: Path):
    if not path.exists():
        return path
    base = path.stem
    suffix = path.suffix
    i = 1
    while True:
        candidate = path.with_name(f"{base} ({i}){suffix}")
        if not candidate.exists():
            return candidate
        i += 1


def extract_first_four_digits(filename: str):
    stem = Path(filename).stem
    match = re.match(r'(\d{4})', stem)
    return match.group(1) if match else ''


def normalize_customer_number(value):
    if value is None:
        return ''
    return str(value).strip()


def fetch_customer_rows_from_view():
    try:
        import pyodbc
    except ImportError as exc:
        raise RuntimeError('pyodbc yüklü değil') from exc

    server = os.getenv('DB_SERVER')
    database = os.getenv('DB_DATABASE')
    username = os.getenv('DB_USER')
    password = os.getenv('DB_PASSWORD')
    driver = os.getenv('DB_DRIVER', '{ODBC Driver 17 for SQL Server}')
    connection_string = f'DRIVER={driver};SERVER={server};DATABASE={database};UID={username};PWD={password};TrustServerCertificate=yes;'

    conn = pyodbc.connect(connection_string)
    try:
        cursor = conn.cursor()
        cursor.execute("""
        SELECT [Kundennummer], [Zahlungsart Auftrag]
        FROM [Custom].[MieteKundenSonFaturaDetay] WITH (NOLOCK)
        """)
        columns = [column[0] for column in cursor.description]
        return [dict(zip(columns, row)) for row in cursor.fetchall()]
    finally:
        conn.close()


def apply_customer_folder_mapping(folder: Path, customer_rows, recursive: bool = False):
    folder = Path(folder)
    files = find_pdfs(folder, recursive=recursive)
    moved = []
    for pdf_path in files:
        prefix = extract_first_four_digits(pdf_path.name)
        if not prefix:
            continue

        match_row = None
        for row in customer_rows:
            if normalize_customer_number(row.get('Kundennummer')) == prefix:
                match_row = row
                break
        if not match_row:
            continue

        payment_type = str(match_row.get('Zahlungsart Auftrag', '')).strip().lower()
        if payment_type == 'bank':
            target_dir = folder / 'Bank'
        elif payment_type == 'rechnung':
            target_dir = folder / 'Rechnung'
        else:
            continue

        target_dir.mkdir(parents=True, exist_ok=True)
        target_path = unique_path(target_dir / pdf_path.name)
        shutil.move(str(pdf_path), str(target_path))
        moved.append((pdf_path, target_path))

    return moved


class App:
    def __init__(self, root):
        self.root = root
        root.title('PDF Toplu İsim Değiştirici')

        frm = tk.Frame(root)
        frm.pack(padx=10, pady=10)

        tk.Button(frm, text='Klasör Seç', command=self.select_folder).grid(row=0, column=0)
        self.folder_label = tk.Label(frm, text='(Henüz klasör seçilmedi)')
        self.folder_label.grid(row=0, column=1, sticky='w')
        self.subfolder_var = tk.IntVar(value=0)
        tk.Checkbutton(frm, text='Alt klasörleri de tara', variable=self.subfolder_var).grid(row=0, column=2, columnspan=2, sticky='w')

        # Replace
        tk.Label(frm, text='Değiştir:').grid(row=1, column=0, sticky='e')
        self.old_entry = tk.Entry(frm, width=30)
        self.old_entry.grid(row=1, column=1, sticky='w')
        tk.Label(frm, text='→').grid(row=1, column=2)
        self.new_entry = tk.Entry(frm, width=30)
        self.new_entry.grid(row=1, column=3, sticky='w')
        self.case_var = tk.IntVar(value=1)
        tk.Checkbutton(frm, text='Büyük/küçük harf duyarsız', variable=self.case_var).grid(row=1, column=4, sticky='w')

        tk.Button(frm, text='Ön İzle (Replace)', command=self.preview_replace).grid(row=1, column=5, padx=6)

        # Append
        tk.Label(frm, text='Ekle (sonuna):').grid(row=2, column=0, sticky='e')
        self.append_entry = tk.Entry(frm, width=30)
        self.append_entry.grid(row=2, column=1, sticky='w')
        self.space_var = tk.IntVar(value=1)
        tk.Checkbutton(frm, text='Boşluk ekle', variable=self.space_var).grid(row=2, column=2, columnspan=2, sticky='w')
        tk.Button(frm, text='Ön İzle (Append)', command=self.preview_append).grid(row=2, column=4, padx=6)

        tk.Button(frm, text='View’e Göre Klasörle', command=self.organize_by_customer_view).grid(row=3, column=0, columnspan=3, sticky='w', pady=(8, 0))

        # Preview list
        self.listbox = tk.Listbox(root, width=120, height=20)
        self.listbox.pack(padx=10, pady=(0,10))

        btn_frame = tk.Frame(root)
        btn_frame.pack(pady=(0,10))
        tk.Button(btn_frame, text='Tümünü Yeniden Adlandır', command=self.apply_rename).pack(side='left')
        tk.Button(btn_frame, text='Çıkış', command=root.quit).pack(side='left', padx=6)
        self.progress = ttk.Progressbar(btn_frame, length=300, mode='determinate')
        self.progress.pack(side='left', padx=10)
        self.status_label = tk.Label(root, text='Hazır')
        self.status_label.pack(pady=(0,10))

        self.folder = None
        self.preview_pairs = []

    def select_folder(self):
        d = filedialog.askdirectory()
        if not d:
            return
        self.folder = Path(d)
        self.folder_label.config(text=str(self.folder))

    def preview_replace(self):
        if not self.folder:
            messagebox.showwarning('Uyarı', 'Önce bir klasör seçin')
            return
        old = self.old_entry.get()
        new = self.new_entry.get()
        recursive = bool(self.subfolder_var.get())
        files = find_pdfs(self.folder, recursive=recursive)
        pairs = []
        ci = bool(self.case_var.get())
        for p in files:
            # only consider files that contain old text when replacing
            name = p.stem
            if old:
                if ci:
                    if old.lower() not in name.lower():
                        continue
                else:
                    if old not in name:
                        continue
            newp = make_new_name_replace(p, old, new)
            if newp != p:
                newp = unique_path(newp)
            pairs.append((p, newp))
        self.show_preview(pairs)

    def preview_append(self):
        if not self.folder:
            messagebox.showwarning('Uyarı', 'Önce bir klasör seçin')
            return
        text = self.append_entry.get()
        add_space = bool(self.space_var.get())
        recursive = bool(self.subfolder_var.get())
        files = find_pdfs(self.folder, recursive=recursive)
        pairs = []
        for p in files:
            newp = make_new_name_append(p, text, add_space)
            if newp != p:
                newp = unique_path(newp)
            pairs.append((p, newp))
        self.show_preview(pairs)

    def show_preview(self, pairs):
        self.preview_pairs = pairs
        self.listbox.delete(0, tk.END)
        for old, new in pairs:
            self.listbox.insert(tk.END, f"{old.name}  →  {new.name}")
        self.status_label.config(text=f'Önizleme: {len(pairs)} dosya')

    def organize_by_customer_view(self):
        if not self.folder:
            messagebox.showwarning('Uyarı', 'Önce bir klasör seçin')
            return

        try:
            customer_rows = fetch_customer_rows_from_view()
        except Exception as exc:
            messagebox.showerror('Hata', f'View verisi alınamadı:\n{exc}')
            return

        recursive = bool(self.subfolder_var.get())
        moved = apply_customer_folder_mapping(self.folder, customer_rows, recursive=recursive)
        self.show_preview(moved)

        if not moved:
            messagebox.showinfo('Bilgi', 'Eşleşen PDF bulunamadı veya hiç taşınma yapılmadı.')
            return

        messagebox.showinfo('Başarılı', f'{len(moved)} PDF dosyası ilgili klasöre taşındı.')

    def apply_rename(self):
        if not self.preview_pairs:
            messagebox.showinfo('Bilgi', 'Önce ön izleme yapın')
            return
        confirm = messagebox.askyesno('Onay', 'Tüm dosyalar yeniden adlandırılsın mı?')
        if not confirm:
            return
        errors = []
        total = len(self.preview_pairs)
        self.progress['maximum'] = total
        self.progress['value'] = 0
        i = 0
        for old, new in self.preview_pairs:
            try:
                if old.resolve() == new.resolve():
                    i += 1
                    self.progress['value'] = i
                    self.status_label.config(text=f'İşleniyor: {i}/{total}')
                    self.root.update_idletasks()
                    continue
                target = unique_path(new)
                old.rename(target)
            except Exception as e:
                errors.append(f"{old.name}: {e}")
            i += 1
            self.progress['value'] = i
            self.status_label.config(text=f'İşleniyor: {i}/{total}')
            self.root.update_idletasks()
        if errors:
            messagebox.showerror('Hata', 'Bazı dosyalar yeniden adlandırılamadı:\n' + '\n'.join(errors))
        else:
            messagebox.showinfo('Başarılı', 'Tüm dosyalar yeniden adlandırıldı')
        # refresh list
        self.preview_pairs = []
        self.listbox.delete(0, tk.END)
        self.progress['value'] = 0
        self.status_label.config(text='Tamamlandı')


def main():
    try:
        root = tk.Tk()
        root.iconbitmap(default='')
        app = App(root)
        root.mainloop()
    except Exception as exc:
        messagebox.showerror('Hata', f'Uygulama başlatılamadı:\n{exc}')
        raise


if __name__ == '__main__':
    main()
