param(
  [string]$SiteRepo = "../mxd210.github.io",
  [string]$SiteBase = "https://mxd210.github.io",
  [switch]$DoCommit = $false
)

function Run-Node($script, $args) {
  $p = Join-Path $PSScriptRoot $script
  Write-Host ">> node $p $args" -ForegroundColor Cyan
  node $p $args
  if ($LASTEXITCODE -ne 0) { throw "Node script failed: $script" }
}

Write-Host "== MXD-Control v2 ==" -ForegroundColor Green
Write-Host "SiteRepo: $SiteRepo" -ForegroundColor Yellow
Write-Host "SiteBase: $SiteBase" -ForegroundColor Yellow

if (-not (Test-Path $SiteRepo)) { throw "Site repo not found: $SiteRepo" }
$Data = Join-Path $SiteRepo "assets/data"
if (-not (Test-Path $Data))   { New-Item -ItemType Directory -Force -Path $Data | Out-Null }

Run-Node "tasks/check-affiliates.js" "--repo `"$SiteRepo`""
Run-Node "tasks/prune-affiliates.js" "--repo `"$SiteRepo`" --write"
Run-Node "tasks/build-sitemaps.js" "--repo `"$SiteRepo`" --base `"$SiteBase`""
Run-Node "tasks/validate-images.js" "--repo `"$SiteRepo`""

if ($DoCommit) {
  Push-Location $SiteRepo
  git add assets/data/*.json sitemap*.xml out/sitemaps/*.xml 2>$null
  git add out/sitemaps/*.xml 2>$null
  git commit -m "chore(automation): mxd-control v2 — check/prune/sitemaps/image-validate" | Out-Null
  git push
  Pop-Location
  Write-Host "Committed and pushed." -ForegroundColor Green
}

Write-Host "All done."
