
param([string]$File="../mxd210.github.io/tools/shopee-importer.html")
Write-Host "Applying MXD Importer Patch 4.0.1 Clean to $File" -ForegroundColor Cyan
node "$(Split-Path -Parent $MyInvocation.MyCommand.Path)\apply_patch_401.js" --file $File
if($LASTEXITCODE -eq 0){ Write-Host "Done." -ForegroundColor Green } else { Write-Error "Failed to apply patch." }
