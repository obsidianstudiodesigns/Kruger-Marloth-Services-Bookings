# Weekly backup of the owner dashboard's bookings to Google Drive.
#
# Downloads the encrypted bookings file (and the public availability file) from the bookings
# repository and saves dated copies in the Drive "Backups" folder. Google Drive for desktop then
# uploads them to drive.google.com. The bookings copy stays encrypted with the owner's password;
# restore it in the dashboard under Settings -> Backup -> Restore backup.
#
# Run by hand:   powershell -NoProfile -ExecutionPolicy Bypass -File tools\backup-bookings.ps1
# Scheduled as the Windows task "Kruger Marloth bookings backup" (weekly, catches up if the PC was off).

param(
  [string]$Dest = 'G:\My Drive\krugermarlothservicesandbookings.co.za\Backups',
  [string]$Repo = 'obsidianstudiodesigns/Kruger-Marloth-Bookings-Data',
  [int]$KeepDays = 400
)

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$stamp = Get-Date -Format 'yyyy-MM-dd'
$log = Join-Path $Dest 'backup-log.txt'

function Write-Log($text) {
  try { Add-Content -Path $log -Value ("{0}  {1}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm'), $text) -Encoding UTF8 } catch { }
}

try {
  if (-not (Test-Path $Dest)) { New-Item -ItemType Directory -Force -Path $Dest | Out-Null }

  $files = @(
    @{ Remote = 'bookings.vault.json'; Local = "bookings-$stamp (encrypted).json" },
    @{ Remote = 'availability.json';   Local = "availability-$stamp.json" }
  )
  foreach ($f in $files) {
    $tmp = Join-Path $env:TEMP ("kms-" + $f.Remote)
    Invoke-WebRequest -UseBasicParsing -TimeoutSec 60 -OutFile $tmp `
      -Uri "https://api.github.com/repos/$Repo/contents/$($f.Remote)?ref=main" `
      -Headers @{ Accept = 'application/vnd.github.raw+json'; 'User-Agent' = 'kms-bookings-backup' }
    $json = Get-Content -Raw -Path $tmp | ConvertFrom-Json        # fails if the download isn't valid JSON
    if ($f.Remote -eq 'bookings.vault.json' -and -not $json.data) { throw 'the bookings file does not look like an encrypted vault' }
    Move-Item -Force -Path $tmp -Destination (Join-Path $Dest $f.Local)
  }

  # Keep about a year of weekly copies
  Get-ChildItem -Path $Dest -File | Where-Object {
    ($_.Name -like 'bookings-*.json' -or $_.Name -like 'availability-*.json') -and $_.LastWriteTime -lt (Get-Date).AddDays(-$KeepDays)
  } | Remove-Item -Force

  $size = [math]::Round((Get-Item (Join-Path $Dest "bookings-$stamp (encrypted).json")).Length / 1KB, 1)
  Write-Log "OK  bookings-$stamp (encrypted).json ($size KB) and availability-$stamp.json saved"
  exit 0
}
catch {
  Write-Log "FAILED  $($_.Exception.Message)"
  exit 1
}
