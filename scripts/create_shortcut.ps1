$scriptDir = Split-Path -Parent $PSScriptRoot
$exeTarget = Join-Path $scriptDir "release\win-unpacked\BeatCut Studio.exe"
$targetBat = Join-Path $scriptDir "RUN_BEATCUT_STUDIO.bat"

$finalTarget = if (Test-Path $exeTarget) { $exeTarget } else { $targetBat }
$workingDir = if (Test-Path $exeTarget) { Split-Path -Parent $exeTarget } else { $scriptDir }
$iconFile = Join-Path $scriptDir "build\icon.ico"

$wshShell = New-Object -ComObject WScript.Shell
$desktop = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
$shortcutPath = Join-Path $desktop "BEATCUT STUDIO.lnk"

$shortcut = $wshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $finalTarget
$shortcut.WorkingDirectory = $workingDir
$shortcut.IconLocation = "$iconFile,0"
$shortcut.Description = "BEATCUT STUDIO - AI Music Beat Detector"
$shortcut.Save()

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host " TAO PHIM TAT BEATCUT STUDIO TREN DESKTOP THANH CONG!  " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "File shortcut: $shortcutPath" -ForegroundColor Yellow
Write-Host "Dich den:      $finalTarget" -ForegroundColor Gray
