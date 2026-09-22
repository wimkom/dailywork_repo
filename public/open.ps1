param($url)
if (-not $url) { exit }

Add-Type -AssemblyName System.Windows.Forms

# Check if command is a file picker
if ($url -match '^dailywork:(//)?pick') {
    $dialog = New-Object System.Windows.Forms.OpenFileDialog
    $dialog.Title = "Pilih File untuk Daily Work Repo"
    $dialog.Filter = "Semua Berkas (*.*)|*.*|Dokumen (*.docx;*.pdf;*.xlsx;*.pptx)|*.docx;*.pdf;*.xlsx;*.pptx"
    $dialog.RestoreDirectory = $true
    
    # Topmost form to bring dialog to front
    $form = New-Object System.Windows.Forms.Form
    $form.TopMost = $true
    
    $result = $dialog.ShowDialog($form)
    if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
        $selectedPath = $dialog.FileName
        [System.Windows.Forms.Clipboard]::SetText($selectedPath)
        [System.Windows.Forms.MessageBox]::Show("Path berhasil disalin ke clipboard:`n$selectedPath`n`nSilakan klik tombol 'Tempel Path' di website.", "Daily Work Repo", 0, 64)
    }
    exit
}

# Extract path from URL parameter or string
$raw = $url

# Match ?path= or &path=
if ($raw -match '[?&]path=(.+)$') {
    $raw = $matches[1]
} else {
    # Strip dailywork:// or dailywork: or open/
    $raw = $raw -replace '^dailywork:(//)?',''
    $raw = $raw -replace '^open/?(\?path=)?',''
}

# Trim trailing slashes from browser URL normalization
$raw = $raw.TrimEnd('/')

# Decode URL encoded string
$path = [System.Uri]::UnescapeDataString($raw)

# Remove surrounding quotes if user copied as path
$path = $path.Trim('"').Trim("'")

# Normalize forward slashes to backslashes for Windows
$path = $path.Replace('/', '\')

if (Test-Path -LiteralPath $path) {
    if ((Get-Item -LiteralPath $path) -is [System.IO.DirectoryInfo]) {
        Start-Process explorer.exe ("`"$path`"")
    } else {
        Start-Process explorer.exe ("/select,`"$path`"")
    }
} else {
    [System.Windows.Forms.MessageBox]::Show("File atau folder tidak ditemukan di path:`n$path`n`nPastikan file/folder memang ada di komputer ini.", "Daily Work Repo", 0, 48)
}
