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

echo Membuat script invisible (VBScript)...
echo Set objArgs = Wscript.Arguments > "%TARGET_DIR%\run.vbs"
echo If objArgs.Count ^> 0 Then >> "%TARGET_DIR%\run.vbs"
echo     url = objArgs(0) >> "%TARGET_DIR%\run.vbs"
echo     Set objShell = CreateObject("Wscript.Shell") >> "%TARGET_DIR%\run.vbs"
echo     scriptPath = Replace(WScript.ScriptFullName, "run.vbs", "open.ps1") >> "%TARGET_DIR%\run.vbs"
echo     command = "powershell.exe -WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File """ ^& scriptPath ^& """ """ ^& url ^& """" >> "%TARGET_DIR%\run.vbs"
echo     objShell.Run command, 0, False >> "%TARGET_DIR%\run.vbs"
echo End If >> "%TARGET_DIR%\run.vbs"

reg add "HKCU\Software\Classes\dailywork" /ve /d "URL:Daily Work Protocol" /f >nul
reg add "HKCU\Software\Classes\dailywork" /v "URL Protocol" /d "" /f >nul
reg add "HKCU\Software\Classes\dailywork\shell\open\command" /ve /d "wscript.exe \"%TARGET_DIR%\run.vbs\" \"%%1\"" /f >nul

echo.
echo [SUKSES] Fitur 'Buka di Explorer' sudah aktif!
echo Sekarang saat Anda mengklik 'Buka di Explorer' di website Daily Work,
echo Windows akan langsung otomatis membuka folder file terkait.
echo.
pause
