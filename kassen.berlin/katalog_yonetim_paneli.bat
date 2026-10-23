@echo off
chcp 65001 >nul
title Kassen.Berlin - Katalog ve Web Yayin Merkezi
echo ============================================================
echo   Kassen Keskin - Katalog ve Web Yayin Merkezi Baslatiliyor
echo   Tarayicinizda otomatik olarak acilacaktir:
echo   http://127.0.0.1:5055
echo ============================================================
echo.

set "VENV_PYTHON=%~dp0..\.venv\Scripts\python.exe"

if exist "%VENV_PYTHON%" (
    "%VENV_PYTHON%" "%~dp0_deploy_panel\server.py"
) else (
    python "%~dp0_deploy_panel\server.py"
)
pause
