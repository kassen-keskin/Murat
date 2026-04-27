@echo off
echo Gerekli paketler kuruluyor...
pip install -r requirements.txt
echo.
echo Uygulama baslatiliyor...
python app.py
pause
