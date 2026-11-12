@echo off
color 0A
echo ==========================================
echo Ag Baglantilari Sifirlaniyor...
echo ==========================================
echo.
echo Eski hatali baglantilar (kirmizi carpi) temizleniyor...
net use O: /delete /yes >nul 2>&1
net use M: /delete /yes >nul 2>&1
echo.
echo IP Adresi ve DNS onbellegi temizleniyor...
ipconfig /flushdns >nul 2>&1
echo.
echo Ortak_Alan (O:) yeniden baglaniyor...
net use O: \\192.168.178.171\Ortak_Alan /persistent:yes
echo.
echo Kisisel Alan (M:) yeniden baglaniyor...
net use M: \\192.168.178.171\Murat_Kisisel /persistent:yes
echo.
echo ==========================================
echo Baglanti Basarili! Bu pencereyi kapatabilirsiniz.
pause >nul