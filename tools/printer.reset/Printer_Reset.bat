@echo off
echo Druckerdienst wird gestoppt...
:: 'Spooler'-Dienst anhalten.
net stop spooler

:: Nach dem Stoppen des Spooler-Dienstes, wechseln wir zum Drucker-Warteschlangenordner.
echo Druckerwarteschlangen werden geleert...
:: Wechselt in das Verzeichnis, in dem sich die Druckwarteschlangendateien befinden.
del /Q /F %systemroot%\System32\spool\PRINTERS\*.*

:: Wenn es mehrere Netzwerkdrucker gibt, wird dieser Befehl die Warteschlangen für alle Drucker leeren.

echo Druckerdienst wird neu gestartet...
:: Startet den 'Spooler'-Dienst erneut.
net start spooler

echo Vorgang abgeschlossen.
pause
