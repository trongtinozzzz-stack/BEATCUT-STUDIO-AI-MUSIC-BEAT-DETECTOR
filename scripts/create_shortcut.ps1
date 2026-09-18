$scriptDir = Split-Path -Parent $PSScriptRoot
$targetBat = Join-Path $scriptDir "RUN_BEATCUT_STUDIO.bat"
$iconFile = Join-Path $scriptDir "build\icon.ico"

$wshShell = New-Object -ComObject WScript.Shell
$desktop = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
$shortcutPath = Join-Path $desktop "BEATCUT STUDIO.lnk"

$shortcut = $wshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $targetBat
$shortcut.WorkingDirectory = $scriptDir
$shortcut.IconLocation = $iconFile
$shortcut.Description = "BEATCUT STUDIO - AI Music Beat Detector"
$shortcut.Save()

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " TAO PHIM TAT BEATCUT STUDIO TREN DESKTOP THANH CONG!  " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "File shortcut: $shortcutPath" -ForegroundColor Yellow
Write-Host "Dich den:      $targetBat" -ForegroundColor Gray
