@echo off
setlocal
echo ==========================================================
echo   Daily Work Repo - Windows Protocol Activator
echo ==========================================================
echo.
echo Sedang mendaftarkan protokol dailywork:// di Windows Anda...

set "TARGET_DIR=%LOCALAPPDATA%\DailyWorkRepo"
if not exist "%TARGET_DIR%" mkdir "%TARGET_DIR%"

if exist "%~dp0open.ps1" (
    copy /Y "%~dp0open.ps1" "%TARGET_DIR%\open.ps1" >nul
) else (
    echo Mengunduh script pembuka terbaru...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://daily-work-repo.vercel.app/open.ps1' -OutFile '%TARGET_DIR%\open.ps1' } catch { }"
)

reg add "HKCU\Software\Classes\dailywork" /ve /d "URL:Daily Work Protocol" /f >nul
reg add "HKCU\Software\Classes\dailywork" /v "URL Protocol" /d "" /f >nul
reg add "HKCU\Software\Classes\dailywork\shell\open\command" /ve /d "powershell.exe -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File \"%TARGET_DIR%\open.ps1\" \"%%1\"" /f >nul

echo.
echo [SUKSES] Fitur 'Buka di Explorer' sudah aktif!
echo Sekarang saat Anda mengklik 'Buka di Explorer' di website Daily Work,
echo Windows akan langsung otomatis membuka folder file terkait.
echo.
pause
