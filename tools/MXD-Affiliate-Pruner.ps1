<#  MXD-Affiliate-Pruner.ps1
    Quét affiliates.json → kiểm tra link Shopee → loại bỏ link chết
    Tự động: xuất báo cáo CSV/JSON, thay affiliates.json = GOOD, bump SW VERSION, commit + push.

    Yêu cầu: PowerShell 5+, Git đã config, repo đã clone.
#>

param(
  [string]$RepoRoot = "D:\github\mxd210.github.io",
  [int]$TimeoutSec = 25,
  [int]$SleepMs = 500,
  [switch]$DryRun  # nếu bật, chỉ xuất report, KHÔNG sửa file/commit
)

$ErrorActionPreference = 'Stop'
Push-Location $RepoRoot

# === Config đường dẫn
$affPath   = "assets\data\affiliates.json"
$reportDir = "assets\data"
$ts        = Get-Date -Format "yyyyMMdd-HHmmss"
$backup    = Join-Path $reportDir ("affiliates.backup.{0}.json" -f $ts)
$checked   = Join-Path $reportDir "affiliates.checked.json"
$goodPath  = Join-Path $reportDir "affiliates.good.json"
$badPath   = Join-Path $reportDir "affiliates.bad.json"
$csvPath   = Join-Path $reportDir "affiliates.report.csv"
$logPath   = Join-Path $reportDir ("affiliates.scan.{0}.log" -f $ts)

# === Helper
function Normalize([string]$u){
  try { $uri=[uri]$u; return ($uri.Scheme + '://' + $uri.Host + $uri.AbsolutePath).TrimEnd('/') }
  catch { return $u.TrimEnd('/') }
}

function Test-Shopee {
  param([string]$url,[int]$TimeoutSec=25)
  $out = [ordered]@{ url=$url; ok=$false; status=0; final=""; note="" }
  try {
    $resp = Invoke-WebRequest -Uri $url -MaximumRedirection 10 -Headers @{
      'User-Agent'='Mozilla/5.0 (Windows NT 10.0; Win64; x64) MXD-LinkChecker'
      'Accept'='text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    } -TimeoutSec $TimeoutSec -UseBasicParsing
    $out.status = $resp.StatusCode
    $out.final  = ($resp.BaseResponse.ResponseUri).AbsoluteUri
    $html = $resp.Content

    $badPats = @(
      'Sản phẩm không tồn tại',
      'Product not found',
      'Trang bạn tìm kiếm không tồn tại',
      '/search\?',
      'shopee\.vn/$'
    )

    $isBad = $false
    foreach($p in $badPats){ if($html -match $p -or $out.final -match $p){ $isBad=$true; break } }

    if (($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 300) -and -not $isBad) {
      $out.ok   = $true
      $out.note = "OK"
    } else {
      $out.ok   = $false
      $out.note = if ($isBad) { "content/redirect-bad" } else { "http-" + $resp.StatusCode }
    }
  } catch {
    $out.ok   = $false
    $out.note = "ERR: " + $_.Exception.Message
  }
  return ([pscustomobject]$out)
}

# === Bắt đầu
"=== MXD Auto-Pruner @ $ts ===" | Tee-Object -FilePath $logPath

if (-not (Test-Path $affPath)) { throw "Không thấy $affPath" }
$items = Get-Content $affPath -Raw | ConvertFrom-Json
$items | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 $backup

$good=@(); $bad=@(); $report=@()
$i=0; $n=$items.Count
foreach($p in $items){
  $i++
  $sku = $p.sku
  $url = $p.origin
  if([string]::IsNullOrWhiteSpace($url)){
    $bad += $p
    $report += [pscustomobject]@{ sku=$sku; origin=$url; ok=$false; status=0; final=""; note="missing-origin" }
    continue
  }
  Write-Host ("[{0}/{1}] {2}" -f $i,$n,$sku)
  $t = Test-Shopee -url $url -TimeoutSec $TimeoutSec
  if($t.ok){ $good += $p } else { $bad += $p }
  $report += [pscustomobject]@{ sku=$sku; origin=$url; ok=$t.ok; status=$t.status; final=$t.final; note=$t.note }
  Start-Sleep -Milliseconds $SleepMs
}

# === Xuất báo cáo
$report | ConvertTo-Csv -NoTypeInformation | Set-Content -Encoding UTF8 $csvPath
$items  | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 $checked
$good   | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 $goodPath
$bad    | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 $badPath

$sum = "GOOD={0} | BAD={1}" -f $good.Count,$bad.Count
$sum | Tee-Object -FilePath $logPath -Append | Out-Host
"Report: $csvPath" | Tee-Object -FilePath $logPath -Append | Out-Host

if ($DryRun) {
  "DryRun=ON → KHÔNG sửa affiliates.json" | Tee-Object -FilePath $logPath -Append | Out-Host
  Pop-Location; exit 0
}

# === Thay affiliates.json = GOOD, commit + push
$good | ConvertTo-Json -Depth 6 | Set-Content -Encoding UTF8 $affPath

# Bump sw VERSION nếu có
$sw = ".\sw.js"
if (Test-Path $sw) {
  $src = Get-Content $sw -Raw
  if ($src -match "const VERSION = 'v(\d+)'") {
    $v=[int]$Matches[1]; $nv=$v+1
    $src = $src -replace "const VERSION = 'v\d+'", ("const VERSION = 'v{0}'" -f $nv)
    Set-Content $sw $src -Encoding UTF8
    git add $sw | Out-Null
    "Bumped SW: v$($v)->v$($nv)" | Tee-Object -FilePath $logPath -Append | Out-Host
  } else {
    "SW: no VERSION line" | Tee-Object -FilePath $logPath -Append | Out-Host
  }
}

git add $affPath,$checked,$goodPath,$badPath,$csvPath | Out-Null

# Nếu không có thay đổi, đừng commit
$st = (git status --porcelain)
if ([string]::IsNullOrWhiteSpace($st)) {
  "Git: no changes to commit" | Tee-Object -FilePath $logPath -Append | Out-Host
} else {
  git commit -m ("chore(data): auto-prune Shopee links (GOOD={0}, BAD={1})" -f $good.Count,$bad.Count) | Out-Null
  git push | Out-Null
  "Git: committed & pushed" | Tee-Object -FilePath $logPath -Append | Out-Host
}

Pop-Location
"Done." | Tee-Object -FilePath $logPath -Append | Out-Host
