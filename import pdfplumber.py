import pdfplumber
import re
import pandas as pd

pdf_path = "Z:\5-Lacash\1-Service Paket individuel-Update Liste\Kunden-Liste-2025\lacash.murat.pdf"   # PDF dosya adı
records = []

with pdfplumber.open(pdf_path) as pdf:
    text = "\n".join(page.extract_text() for page in pdf.pages)

# Bloklara ayır (her kayıt çizgiyle bitiyor)
blocks = re.split(r"-{5,}", text)

for block in blocks:
    block = block.strip()
    if not block:
        continue

    # Nr, Branche, Version, Module
    m1 = re.search(r"^(\d+)\.\s+(\S+)\s+([\d.]+)\s+(.+)", block, re.MULTILINE)
    if not m1:
        continue
    nr, branche, version, module = m1.groups()

    # Lizenz ve Firma/Ort
    m2 = re.search(r"\n\s*([\d-]+)\s+([^\n]+)", block)
    lizenz, firma = (m2.groups() if m2 else ("", ""))

    # Update-Preis EK, VK, Details
    m3 = re.search(r"Update-Preis:\s*EK=([^/]+)\s*/\s*VK=([^\s]+)(?:\s*\((.*?)\))?", block)
    if m3:
        up_ek, up_vk, up_details = m3.groups()
    else:
        up_ek = up_vk = up_details = ""

    # mtl. Update-Service EK, VK
    m4 = re.search(r"mtl\. Update-Service:\s*EK=([^/]+)\s*/\s*VK=([^\s]+)", block)
    if m4:
        ms_ek, ms_vk = m4.groups()
    else:
        ms_ek = ms_vk = ""

    # Bemerkungen = tüm # ile başlayan satırlar
    remarks = "\n".join([l.strip("# ").strip() for l in block.splitlines() if l.strip().startswith("#")])

    records.append({
        "Nr": int(nr),
        "Branche": branche,
        "Version": version,
        "Module": module.strip(),
        "Lizenz": lizenz.strip(),
        "Firma/Ort": firma.strip(),
        "Update-Preis EK": up_ek.strip(),
        "Update-Preis VK": up_vk.strip(),
        "Update-Preis Details": (up_details or "").strip(),
        "mtl. Update-Service EK": ms_ek.strip(),
        "mtl. Update-Service VK": ms_vk.strip(),
        "Bemerkungen": remarks
    })

df = pd.DataFrame(records)

# Sondan başa sırala
df_sorted = df.sort_values("Nr", ascending=False).reset_index(drop=True)

# Excel’e yaz
df_sorted.to_excel("lacash_105_full.xlsx", index=False)
print("Excel dosyası hazır: lacash_105_full.xlsx")
