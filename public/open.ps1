param($url)
if (-not $url) { exit }
$raw = $url -replace '^dailywork://(open\?path=)?',''
$raw = $raw.TrimEnd('/')
$path = [System.Uri]::UnescapeDataString($raw)
if (Test-Path $path) {
    if ((Get-Item $path) -is [System.IO.DirectoryInfo]) {
        Start-Process explorer.exe ("`"$path`"")
    } else {
        Start-Process explorer.exe ("/select,`"$path`"")
    }
} else {
    Add-Type -AssemblyName System.Windows.Forms
    [System.Windows.Forms.MessageBox]::Show("File atau folder tidak ditemukan di path:`n$path", "Daily Work Repo", 0, 48)
}
