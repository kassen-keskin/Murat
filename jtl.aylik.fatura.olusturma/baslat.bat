@echo off
cd /d "%~dp0"
echo JTL Aylik Siparis / Fatura Paneli baslatiliyor (http://localhost:3000)...
start "" "http://localhost:3000"
python app.py
pause
