@echo off
cd /d "%~dp0"
set PYTHON_EXE=

where py >nul 2>nul
if not errorlevel 1 (
    set PYTHON_EXE=py
) else (
    where python >nul 2>nul
    if not errorlevel 1 (
        set PYTHON_EXE=python
    )
)

if "%PYTHON_EXE%"=="" (
    echo Python bulunamadi. Python'i kurduktan sonra tekrar deneyin.
    pause
    exit /b 1
)

%PYTHON_EXE% rename_pdfs.py
if errorlevel 1 (
    echo Betik calistirilirken bir hata olustu.
    pause
)
