@echo off
echo ============================================================
echo   Kassen Keskin - Web Sitesi Katalog Guncelleme Araci
echo ============================================================
echo.

set "PANEL_DIR=%~dp0..\panel"
set "WEB_KATALOG_DIR=%~dp0katalog"

if not exist "%PANEL_DIR%\catalog_data.json" (
    echo [HATA] Panel katalog verisi bulunamadi: %PANEL_DIR%\catalog_data.json
    pause
    exit /b 1
)

echo [1/3] Urun veritabani kopyalaniyor (catalog_data.json)...
copy /Y "%PANEL_DIR%\catalog_data.json" "%WEB_KATALOG_DIR%\catalog_data.json" >nul

echo [2/3] Hizli yerel calisma dosyasi uretiliyor (catalog_data.js)...
powershell -NoProfile -Command "$json = Get-Content -Raw -Encoding UTF8 '%PANEL_DIR%\catalog_data.json'; $js = 'window.KATALOG_DATA = ' + $json + ';'; [System.IO.File]::WriteAllText('%WEB_KATALOG_DIR%\catalog_data.js', $js, [System.Text.Encoding]::UTF8)"

echo [3/3] Yeni yuklenen urun gorselleri senkronize ediliyor (image)...
xcopy /E /I /Y /D "%PANEL_DIR%\public\katalog\image" "%WEB_KATALOG_DIR%\image" >nul

echo.
echo [BASARILI] Katalog urunleri ve gorselleri web sitesine basariyla aktarildi!
echo.
ping 127.0.0.1 -n 3 >nul
