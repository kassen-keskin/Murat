#!/bin/bash
# Proxmox LXC Web Server Başlatma Scripti
cd "$(dirname "$0")"

# Eğer venv (sanal ortam) varsa onu kullan, yoksa sistem python'unu kullan
if [ -d "venv" ]; then
    echo "Sanal ortam (venv) algılandı, kullanılıyor..."
    source venv/bin/activate
    python3 app.py
else
    echo "Sanal ortam bulunamadı, varsayılan python kullanılıyor..."
    python3 app.py
fi
