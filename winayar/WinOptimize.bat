@echo off
TITLE Windows 10/11 Pro - POS Optimizasyon Araci
color 0B

:: Dosya yolundaki tirnak zafiyetlerini onlemek icin ortam degiskenine aliyoruz
set "BAT_FILE=%~f0"
set "PS_FILE=%temp%\Pos_Optimizasyon_v2.ps1"

:: 1. YONETICI KONTROLU VE OTOMATIK YUKSELTME (Auto-Elevate)
net session >nul 2>&1
if %errorLevel% == 0 goto :AdminYetkisiTamam

echo ============================================================
echo [BILGI] Yonetici yetkisi isteniyor...
echo Lutfen ekrana gelen UAC guvenlik uyarisi penceresine 'Evet' deyin.
echo ============================================================
powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath $env:BAT_FILE -Verb RunAs"
exit /b

:AdminYetkisiTamam

:: 2. GUVENLI TEMP DOSYASI OLUSTURMA ALANI
powershell -NoProfile -ExecutionPolicy Bypass -Command "$lines = Get-Content -LiteralPath $env:BAT_FILE; $match = $lines | Select-String -Pattern '^#---PS_BASLANGIC---' | Select-Object -First 1; if ($match) { $start = $match.LineNumber; $lines[$start..($lines.Count - 1)] | Out-File -FilePath $env:PS_FILE -Encoding UTF8 }"

:: 3. TEMP DOSYASINI BYPASS ILE CALISTIR
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS_FILE%"

:: 4. CIKISTA IZ BIRAKMADAN TEMIZLE VE EKRANI BEKLET
if exist "%PS_FILE%" del "%PS_FILE%"
echo.
echo ============================================================
echo [BILGI] Script basariyla sonlandi. (Log dosyasi Belgeler klasorundedir)
echo Cikmak icin bir tusa basin...
echo ============================================================
pause >nul
exit /b

#---PS_BASLANGIC---
# ==============================================================================
# POWERSHELL KOD BLOKLARI
# ==============================================================================

# --- LOGLAMA SISTEMI ---
# Evrensel ve kesin calisan Documents yolu
$script:LogFile = "$env:USERPROFILE\Documents\POS_Optimizasyon_Log.txt"

function Write-Log {
    param([string]$Message, [string]$Level="INFO")
    $TimeStamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $LogEntry = "[$TimeStamp] [$Level] $Message"
    Add-Content -Path $script:LogFile -Value $LogEntry -Encoding UTF8 -ErrorAction SilentlyContinue
}

function Log-SystemStatus {
    Write-Log "--- SISTEM DURUMU (ISLEM SONU RAPORU) ---" "STATUS"
    if ((powercfg /getactivescheme) -match "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c") { Write-Log "Guc Plani: Yuksek Performans" "OK" } else { Write-Log "Guc Plani: Farkli Plan" "WARN" }
    
    $wuReg = Get-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" -Name "NoAutoUpdate" -ErrorAction SilentlyContinue
    if ($null -ne $wuReg -and $wuReg.NoAutoUpdate -eq 1) { Write-Log "Windows Update: KAPALI" "OK" } else { Write-Log "Windows Update: ACIK" "WARN" }
    
    $telReg = Get-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection" -Name "AllowTelemetry" -ErrorAction SilentlyContinue
    if ($null -ne $telReg -and $telReg.AllowTelemetry -eq 0) { Write-Log "Telemetri: KAPALI" "OK" } else { Write-Log "Telemetri: ACIK" "WARN" }
    
    $net = Get-NetConnectionProfile -ErrorAction SilentlyContinue
    if ($net) {
        $isPrivate = $true
        foreach ($n in $net) { if ($n.NetworkCategory -ne 'Private') { $isPrivate = $false } }
        if ($isPrivate) { Write-Log "Ag Profili: Private" "OK" } else { Write-Log "Ag Profili: Public (Guvenlik Riski)" "WARN" }
    } else { Write-Log "Ag Profili: Aktif Ag Yok" "INFO" }
    
    $shareReg = Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa" -Name "everyoneincludesanonymous" -ErrorAction SilentlyContinue
    if ($null -ne $shareReg -and $shareReg.everyoneincludesanonymous -eq 1) { Write-Log "Dosya Paylasimi: Sifresiz (ACIK)" "OK" } else { Write-Log "Dosya Paylasimi: KAPALI/Sifreli" "WARN" }
    
    Write-Log "-----------------------------------------" "STATUS"
}

Write-Log "POS Optimizasyon Araci Baslatildi." "START"

function Show-Dashboard {
    $power = powercfg /getactivescheme
    if ($power -match "8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c") { $pwStatus = "[OK] Yuksek Performans"; $pwColor = "Green" }
    else { $pwStatus = "[!] Farkli Plan (Uygulanmali)"; $pwColor = "Yellow" }

    $wuReg = Get-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" -Name "NoAutoUpdate" -ErrorAction SilentlyContinue
    if ($null -ne $wuReg -and $wuReg.NoAutoUpdate -eq 1) { $wuStatus = "[OK] KAPALI (Guvenli Durum)"; $wuColor = "Green" }
    else { $wuStatus = "[!] ACIK VEYA VARSAYILAN"; $wuColor = "Yellow" }

    $telReg = Get-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection" -Name "AllowTelemetry" -ErrorAction SilentlyContinue
    if ($null -ne $telReg -and $telReg.AllowTelemetry -eq 0) { $telStatus = "[OK] KAPALI"; $telColor = "Green" }
    else { $telStatus = "[!] ACIK (Kapatilmasi Onerilir)"; $telColor = "Yellow" }

    $net = Get-NetConnectionProfile -ErrorAction SilentlyContinue
    if ($net) {
        $isPrivate = $true
        foreach ($n in $net) { if ($n.NetworkCategory -ne 'Private') { $isPrivate = $false } }
        if ($isPrivate) { $netStatus = "[OK] Tum Aglar Private"; $netColor = "Green" }
        else { $netStatus = "[!] Public Ag Bulundu (Acik Tehlike)"; $netColor = "Yellow" }
    } else { $netStatus = "Aktif Ag Yok"; $netColor = "DarkGray" }

    $shareReg = Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa" -Name "everyoneincludesanonymous" -ErrorAction SilentlyContinue
    if ($null -ne $shareReg -and $shareReg.everyoneincludesanonymous -eq 1) { $shareStatus = "[OK] Sifresiz Paylasim (Freigabe) ACIK"; $shareColor = "Green" }
    else { $shareStatus = "[!] KAPALI veya Sifreli"; $shareColor = "Yellow" }

    Write-Host "  [ CANLI SISTEM DURUMU ]" -ForegroundColor White
    Write-Host -NoNewline "  * Guc Plani    : "; Write-Host $pwStatus -ForegroundColor $pwColor
    Write-Host -NoNewline "  * Win Update   : "; Write-Host $wuStatus -ForegroundColor $wuColor
    Write-Host -NoNewline "  * Telemetri    : "; Write-Host $telStatus -ForegroundColor $telColor
    Write-Host -NoNewline "  * Ag Profili   : "; Write-Host $netStatus -ForegroundColor $netColor
    Write-Host -NoNewline "  * Ag Paylasimi : "; Write-Host $shareStatus -ForegroundColor $shareColor
    Write-Host "============================================================" -ForegroundColor Cyan
}

function Show-Menu {
    Clear-Host
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "         WINDOWS 10/11 PRO - POS & SISTEM OPTIMIZASYONU" -ForegroundColor Yellow
    Write-Host "============================================================" -ForegroundColor Cyan
    Show-Dashboard
    Write-Host "Lutfen uygulamak istediginiz islemi secin:"
    Write-Host ""
    Write-Host "  [0] DURUMU ANALIZ ET / EKRANI YENILE" -ForegroundColor DarkCyan
    Write-Host "------------------------------------------------------------"
    Write-Host "  [1] TUM OPTIMIZASYONLARI UYGULA (2, 3, 4, 5 ve 8. Adimlar)" -ForegroundColor Green
    Write-Host "  [2] Enerji, Performans ve Arayuz Ayarlarini Yap"
    Write-Host "  [3] Gereksiz Uygulamalari (Bloatware) ve OneDrive'i Kaldir"
    Write-Host "  [4] Telemetri ve Hizli Baslatmayi (Fast Startup) Kapat"
    Write-Host "  [5] Agi 'Private' Yap ve LotusPecas Portlarini Ac"
    Write-Host "------------------------------------------------------------"
    Write-Host "  [6] Windows Update KAPAT (Sistemi Dondur)" -ForegroundColor Red
    Write-Host "  [7] Windows Update AC ve Guncelleme Ekranini Goster" -ForegroundColor Magenta
    Write-Host "  [8] Agda Gorunurluk ve Sifresiz Paylasimi (Freigabe) Ac" -ForegroundColor DarkCyan
    Write-Host "------------------------------------------------------------"
    Write-Host "  [9] Smart App Control'u Manuel Kapatma Ekranini Ac" -ForegroundColor DarkCyan
    Write-Host "------------------------------------------------------------"
    Write-Host " [10] YAPILANLARI GERI AL (Goruntu, Telemetri ve Cekirdek Ayarlari)" -ForegroundColor DarkYellow
    Write-Host " [99] CIKIS"
    Write-Host "============================================================" -ForegroundColor Cyan
}

function Set-PowerAndVisuals {
    Write-Host "`n[*] Enerji ve Performans Ayarlari Yapiliyor..." -ForegroundColor Cyan
    powercfg -setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c
    powercfg -change -disk-timeout-ac 0
    powercfg -change -disk-timeout-dc 0
    powercfg -change -monitor-timeout-ac 0
    powercfg -change -monitor-timeout-dc 0
    powercfg -change -standby-timeout-ac 0
    powercfg -change -standby-timeout-dc 0
    powercfg /SETACVALUEINDEX SCHEME_CURRENT 2a737441-1930-4402-8d77-b2bea2878d09 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0
    powercfg /SETDCVALUEINDEX SCHEME_CURRENT 2a737441-1930-4402-8d77-b2bea2878d09 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0
    powercfg -setactive SCHEME_CURRENT
    
    Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects" -Name "VisualFXSetting" -Value 2 -ErrorAction SilentlyContinue
    Set-ItemProperty -Path "HKCU:\Control Panel\Desktop\WindowMetrics" -Name "MinAnimate" -Value "0" -ErrorAction SilentlyContinue
    Set-ItemProperty -Path "HKCU:\Control Panel\Desktop" -Name "FontSmoothing" -Value "2" -ErrorAction SilentlyContinue
    
    Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\PushNotifications" -Name "ToastEnabled" -Value 0 -ErrorAction SilentlyContinue
    Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" -Name "SystemPaneSuggestionsEnabled" -Value 0 -ErrorAction SilentlyContinue
    Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" -Name "SubscribedContent-338389Enabled" -Value 0 -ErrorAction SilentlyContinue

    Write-Host "[*] Arka Plan UWP Uygulamalari Kapatiliyor..." -ForegroundColor Cyan
    if (!(Test-Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications")) { New-Item -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications" -Force | Out-Null }
    Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications" -Name "GlobalUserDisabled" -Value 1 -ErrorAction SilentlyContinue
    if (!(Test-Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Search")) { New-Item -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Search" -Force | Out-Null }
    Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Search" -Name "BackgroundAppGlobalToggle" -Value 0 -ErrorAction SilentlyContinue

    Write-Host "[*] Xbox Game DVR (Oyun Cubugu) Kapatiliyor..." -ForegroundColor Cyan
    if (!(Test-Path "HKCU:\System\GameConfigStore")) { New-Item -Path "HKCU:\System\GameConfigStore" -Force | Out-Null }
    Set-ItemProperty -Path "HKCU:\System\GameConfigStore" -Name "GameDVR_Enabled" -Value 0 -ErrorAction SilentlyContinue
    if (!(Test-Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\GameDVR")) { New-Item -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\GameDVR" -Force | Out-Null }
    Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\GameDVR" -Name "AllowGameDVR" -Value 0 -ErrorAction SilentlyContinue

    Write-Host "[*] VBS ve Cekirdek Yalitim (Memory Integrity) Kapatiliyor..." -ForegroundColor Cyan
    if (!(Test-Path "HKLM:\SYSTEM\CurrentControlSet\Control\DeviceGuard")) { New-Item -Path "HKLM:\SYSTEM\CurrentControlSet\Control\DeviceGuard" -Force | Out-Null }
    Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\DeviceGuard" -Name "EnableVirtualizationBasedSecurity" -Value 0 -ErrorAction SilentlyContinue
    if (!(Test-Path "HKLM:\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity")) { New-Item -Path "HKLM:\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity" -Force | Out-Null }
    Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity" -Name "Enabled" -Value 0 -ErrorAction SilentlyContinue

    Write-Host "[*] Koyu Tema (Dark Mode) Aktif Ediliyor..." -ForegroundColor Cyan
    if (!(Test-Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize")) { New-Item -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize" -Force | Out-Null }
    Set-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize" -Name "AppsUseLightTheme" -Value 0 -ErrorAction SilentlyContinue
    Set-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize" -Name "SystemUsesLightTheme" -Value 0 -ErrorAction SilentlyContinue

    Write-Host "[*] Windows 11 Klasik Sag Tus Menusu Aktif Ediliyor..." -ForegroundColor Cyan
    New-Item -Path "HKCU:\Software\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\InprocServer32" -Force | Out-Null
    Set-Item -Path "HKCU:\Software\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}\InprocServer32" -Value "" -Force | Out-Null
    
    Write-Host "[*] Ayarlarin Gecerli Olmasi Icin Explorer Yeniden Baslatiliyor..." -ForegroundColor Yellow
    Stop-Process -Name explorer -Force
    Write-Host "[OK] Enerji, Arayuz ve Bildirim ayarlari tamamlandi." -ForegroundColor Green
    Write-Log "Enerji, Arayuz ve Bildirim ayarlari optimize edildi." "SUCCESS"
}

function Remove-Bloatware {
    Write-Host "`n[*] Gereksiz Uygulamalar Kaldiriliyor..." -ForegroundColor Cyan
    $apps = @("*bing*", "*zune*", "*solitaire*", "*candycrush*", "*xbox*", "*skypeapp*", "*getstarted*", "*officehub*", "*outlook*", "*todos*", "*copilot*", "*powerautomate*", "*clipchamp*", "*windowscamera*", "*stickynotes*", "*feedbackhub*")
    foreach ($app in $apps) {
        Get-AppxPackage -Name $app -AllUsers -ErrorAction SilentlyContinue | Remove-AppxPackage -ErrorAction SilentlyContinue
    }

    Write-Host "[*] OneDrive Sistemden Temizleniyor..." -ForegroundColor Cyan
    taskkill /f /im OneDrive.exe 2>$null | Out-Null
    $onedrive32 = "$env:SystemRoot\System32\OneDriveSetup.exe"
    $onedrive64 = "$env:SystemRoot\SysWOW64\OneDriveSetup.exe"
    
    if (Test-Path $onedrive64) { Start-Process $onedrive64 -ArgumentList "/uninstall" -Wait -NoNewWindow }
    elseif (Test-Path $onedrive32) { Start-Process $onedrive32 -ArgumentList "/uninstall" -Wait -NoNewWindow }
    Write-Host "[OK] Temizlik tamamlandi." -ForegroundColor Green
    Write-Log "Gereksiz UWP uygulamalari ve OneDrive sistemden temizlendi." "SUCCESS"
}

function Set-TelemetryAndFastboot {
    Write-Host "`n[*] Telemetri (Veri Gonderimi) Kapatiliyor..." -ForegroundColor Cyan
    if (!(Test-Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection")) {
        New-Item -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection" -Force | Out-Null
    }
    Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection" -Name "AllowTelemetry" -Value 0 -ErrorAction SilentlyContinue
    Stop-Service -Name "DiagTrack" -Force -ErrorAction SilentlyContinue
    Set-Service -Name "DiagTrack" -StartupType Disabled -ErrorAction SilentlyContinue

    Write-Host "[*] Hizli Baslatma (Fast Startup) Kapatiliyor..." -ForegroundColor Cyan
    Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power" -Name "HiberbootEnabled" -Value 0 -ErrorAction SilentlyContinue
    Write-Host "[OK] Telemetri ve Hizli Baslatma kapatildi." -ForegroundColor Green
    Write-Log "Telemetri ve Hizli Baslatma devre disi birakildi." "SUCCESS"
}

function Set-NetworkAndFirewall {
    Write-Host "`n[*] Ag Profilleri 'Private' Olarak Degistiriliyor..." -ForegroundColor Cyan
    $networkProfiles = Get-NetConnectionProfile -ErrorAction SilentlyContinue
    if ($networkProfiles) {
        foreach ($profile in $networkProfiles) {
            Set-NetConnectionProfile -InterfaceAlias $profile.InterfaceAlias -NetworkCategory Private -ErrorAction SilentlyContinue
        }
    } else {
        Write-Host "[!] Aktif bir ag baglantisi bulunamadi, profil atlandi." -ForegroundColor Yellow
        Write-Log "Ag profili Private yapilamadi (Aktif ag yok)." "WARN"
    }

    Write-Host "[*] LotusPecas_Service Portlari Aciliyor..." -ForegroundColor Cyan
    $ports = "443,1453,1454,19231,3455,9000,9002,4200,5000,5002,5003,44444,6000,6001,6002,6003"
    netsh advfirewall firewall add rule name=LotusPecas_Service dir=in action=allow protocol=TCP localport=$ports | Out-Null
    netsh advfirewall firewall add rule name=LotusPecas_Service dir=out action=allow protocol=TCP localport=$ports | Out-Null
    Write-Host "[OK] Ag ayarlari ve port kurallari eklendi." -ForegroundColor Green
    Write-Log "Ag Private yapildi ve Firewall portlari (LotusPecas) acildi." "SUCCESS"
}

function Disable-WindowsUpdate {
    Write-Host "`n[*] Windows Update Servisleri Kapatiliyor..." -ForegroundColor Yellow
    if (!(Test-Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU")) {
        New-Item -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" -Force | Out-Null
    }
    Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" -Name "NoAutoUpdate" -Value 1 -ErrorAction SilentlyContinue
    
    Stop-Service -Name "wuauserv" -Force -ErrorAction SilentlyContinue
    Set-Service -Name "wuauserv" -StartupType Disabled -ErrorAction SilentlyContinue
    Stop-Service -Name "UsoSvc" -Force -ErrorAction SilentlyContinue
    Set-Service -Name "UsoSvc" -StartupType Disabled -ErrorAction SilentlyContinue
    Stop-Service -Name "bits" -Force -ErrorAction SilentlyContinue
    Set-Service -Name "bits" -StartupType Disabled -ErrorAction SilentlyContinue
    Stop-Service -Name "dosvc" -Force -ErrorAction SilentlyContinue
    Set-Service -Name "dosvc" -StartupType Disabled -ErrorAction SilentlyContinue

    Write-Host "[OK] Windows Update tamamen KAPATILDI." -ForegroundColor Red
    Write-Log "Windows Update servisleri ve otomatik guncellemeler kapatildi." "SUCCESS"
}

function Enable-WindowsUpdate {
    Write-Host "`n[*] Windows Update Servisleri Aciliyor..." -ForegroundColor Cyan
    if (Test-Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU") {
        Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU" -Name "NoAutoUpdate" -Value 0 -ErrorAction SilentlyContinue
    }
    
    Set-Service -Name "wuauserv" -StartupType Manual -ErrorAction SilentlyContinue
    Start-Service -Name "wuauserv" -ErrorAction SilentlyContinue
    Set-Service -Name "UsoSvc" -StartupType Manual -ErrorAction SilentlyContinue
    Start-Service -Name "UsoSvc" -ErrorAction SilentlyContinue
    Set-Service -Name "bits" -StartupType Manual -ErrorAction SilentlyContinue
    Start-Service -Name "bits" -ErrorAction SilentlyContinue
    Set-Service -Name "dosvc" -StartupType Manual -ErrorAction SilentlyContinue
    Start-Service -Name "dosvc" -ErrorAction SilentlyContinue

    Write-Host "[OK] Windows Update ACILDI." -ForegroundColor Green
    Write-Log "Windows Update servisleri acildi." "SUCCESS"
    Write-Host "Guncelleme penceresi aciliyor, lutfen guncellemeleri manuel olarak denetleyin..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
    Start-Process "ms-settings:windowsupdate"
}

function Enable-NetworkSharing {
    Write-Host "`n[*] Agda Gorunurluk ve Sifresiz Dosya Paylasimi (Freigabe) Aciliyor..." -ForegroundColor Cyan
    
    Set-Service -Name fdPHost -StartupType Automatic -ErrorAction SilentlyContinue
    Start-Service -Name fdPHost -ErrorAction SilentlyContinue
    Set-Service -Name FDResPub -StartupType Automatic -ErrorAction SilentlyContinue
    Start-Service -Name FDResPub -ErrorAction SilentlyContinue

    Enable-NetFirewallRule -DisplayGroup "Network Discovery" -ErrorAction SilentlyContinue
    Enable-NetFirewallRule -DisplayGroup "File and Printer Sharing" -ErrorAction SilentlyContinue
    Enable-NetFirewallRule -DisplayGroup "Netzwerkerkennung" -ErrorAction SilentlyContinue
    Enable-NetFirewallRule -DisplayGroup "Datei- und Druckerfreigabe" -ErrorAction SilentlyContinue
    Enable-NetFirewallRule -DisplayGroup "Ağ Bulma" -ErrorAction SilentlyContinue
    Enable-NetFirewallRule -DisplayGroup "Dosya ve Yazıcı Paylaşımı" -ErrorAction SilentlyContinue

    net user guest /active:yes | Out-Null

    if (!(Test-Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa")) { New-Item -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa" -Force | Out-Null }
    Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Lsa" -Name "everyoneincludesanonymous" -Value 1 -ErrorAction SilentlyContinue
    
    if (!(Test-Path "HKLM:\SYSTEM\CurrentControlSet\Services\LanmanServer\Parameters")) { New-Item -Path "HKLM:\SYSTEM\CurrentControlSet\Services\LanmanServer\Parameters" -Force | Out-Null }
    Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\LanmanServer\Parameters" -Name "restrictnullsessaccess" -Value 0 -ErrorAction SilentlyContinue
    
    if (!(Test-Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\LanmanWorkstation")) { New-Item -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\LanmanWorkstation" -Force | Out-Null }
    Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\LanmanWorkstation" -Name "AllowInsecureGuestAuth" -Value 1 -ErrorAction SilentlyContinue

    Write-Host "[OK] Agda gorunurluk (Freigabe) ve sifresiz paylasim aktif edildi." -ForegroundColor Green
    Write-Log "Agda gorunurluk ve sifresiz paylasim acildi." "SUCCESS"
}

function Show-SmartAppControl {
    Write-Host "`n[*] Smart App Control ayar sayfasi aciliyor..." -ForegroundColor Cyan
    Write-Host "Lutfen acilan pencereden 'Akilli Uygulama Kontrolu' (Smart App Control) ayarini KAPALI konuma getirin." -ForegroundColor Yellow
    Write-Log "Smart App Control manuel kapatma sayfasi acildi." "INFO"
    Start-Sleep -Seconds 2
    Start-Process "windowsdefender://smartappcontrol" -ErrorAction SilentlyContinue
}

function Undo-Changes {
    Write-Host "`n[*] Arayuz, Telemetri ve Cekirdek Ayarlari Geri Aliniyor..." -ForegroundColor Yellow
    Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects" -Name "VisualFXSetting" -Value 0 -ErrorAction SilentlyContinue
    Remove-ItemProperty -Path "HKCU:\Control Panel\Desktop\WindowMetrics" -Name "MinAnimate" -ErrorAction SilentlyContinue

    Set-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize" -Name "AppsUseLightTheme" -Value 1 -ErrorAction SilentlyContinue
    Set-ItemProperty -Path "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize" -Name "SystemUsesLightTheme" -Value 1 -ErrorAction SilentlyContinue

    Remove-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\BackgroundAccessApplications" -Name "GlobalUserDisabled" -ErrorAction SilentlyContinue
    Remove-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Search" -Name "BackgroundAppGlobalToggle" -ErrorAction SilentlyContinue
    
    Set-ItemProperty -Path "HKCU:\System\GameConfigStore" -Name "GameDVR_Enabled" -Value 1 -ErrorAction SilentlyContinue
    Remove-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\GameDVR" -Name "AllowGameDVR" -ErrorAction SilentlyContinue
    
    Remove-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\DeviceGuard" -Name "EnableVirtualizationBasedSecurity" -ErrorAction SilentlyContinue
    Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\DeviceGuard\Scenarios\HypervisorEnforcedCodeIntegrity" -Name "Enabled" -Value 1 -ErrorAction SilentlyContinue

    Remove-Item -Path "HKCU:\Software\Classes\CLSID\{86ca1aa0-34aa-4e8b-a509-50c905bae2a2}" -Recurse -ErrorAction SilentlyContinue

    Remove-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection" -Name "AllowTelemetry" -ErrorAction SilentlyContinue
    Set-Service -Name "DiagTrack" -StartupType Automatic -ErrorAction SilentlyContinue
    Start-Service -Name "DiagTrack" -ErrorAction SilentlyContinue

    Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power" -Name "HiberbootEnabled" -Value 1 -ErrorAction SilentlyContinue
    Write-Host "[OK] Goruntu ve sistem ayarlari fabrika varsayilanlarina donduruldu." -ForegroundColor Green
    Write-Log "Yapilan goruntu, telemetri ve hizli baslatma ayarlari geri alindi (Undo)." "SUCCESS"
}

# ==============================================================================
# ANA DONGU
# ==============================================================================

while ($true) {
    Show-Menu
    $choice = Read-Host "Seciminiz (0-99)"
    Write-Log "Kullanici Secimi: [$choice]" "INPUT"
    
    switch ($choice) {
        '0' { 
            Write-Host "`nSistem durumu taraniriyor..." -ForegroundColor Cyan
            Write-Log "Sistem durumu yenilendi." "INFO"
            Start-Sleep -Milliseconds 500
        }
        '1' {
            Set-PowerAndVisuals
            Remove-Bloatware
            Set-TelemetryAndFastboot
            Set-NetworkAndFirewall
            Enable-NetworkSharing
            Log-SystemStatus
            Write-Host "`n>>> TEMEL OPTIMIZASYONLAR BASARIYLA TAMAMLANDI! <<<" -ForegroundColor Yellow
            Read-Host "Ana menuye donmek icin Enter'a basin..."
        }
        '2' { Set-PowerAndVisuals; Log-SystemStatus; Read-Host "Ana menuye donmek icin Enter'a basin..." }
        '3' { Remove-Bloatware; Log-SystemStatus; Read-Host "Ana menuye donmek icin Enter'a basin..." }
        '4' { Set-TelemetryAndFastboot; Log-SystemStatus; Read-Host "Ana menuye donmek icin Enter'a basin..." }
        '5' { Set-NetworkAndFirewall; Log-SystemStatus; Read-Host "Ana menuye donmek icin Enter'a basin..." }
        '6' { Disable-WindowsUpdate; Log-SystemStatus; Read-Host "Ana menuye donmek icin Enter'a basin..." }
        '7' { Enable-WindowsUpdate; Log-SystemStatus; Read-Host "Ana menuye donmek icin Enter'a basin..." }
        '8' { Enable-NetworkSharing; Log-SystemStatus; Read-Host "Ana menuye donmek icin Enter'a basin..." }
        '9' { Show-SmartAppControl; Read-Host "Ana menuye donmek icin Enter'a basin..." }
        '10' { Undo-Changes; Log-SystemStatus; Read-Host "Ana menuye donmek icin Enter'a basin..." }
        '99' { 
            Write-Host "`nCikis yapiliyor..." -ForegroundColor Green
            Write-Log "POS Optimizasyon Araci Kapatildi." "EXIT"
            Start-Sleep -Seconds 1
            exit 
        }
        default { 
            Write-Host "`nGecersiz secim!" -ForegroundColor Red
            Write-Log "Gecersiz menu secimi yapildi." "WARN"
            Start-Sleep -Seconds 1 
        }
    }
}