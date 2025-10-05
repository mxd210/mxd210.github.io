# scripts/add-gsc-meta.ps1
# Insert Google Search Console verification meta into HTML files (idempotent).
# Usage: pwsh -File scripts/add-gsc-meta.ps1

$ErrorActionPreference = "Stop"

$TOKEN = '84L0tRVs_wNPAyXii38-OaeGi8TyJdMlkZXVIHcnj0o'
$META  = "<meta name=`"google-site-verification`" content=`"$TOKEN`" />"

# Lọc các tệp HTML (mặc định toàn repo). Có thể thu hẹp nếu muốn.
$files = Get-ChildItem -Recurse -File -Include *.html

$changed = 0
foreach ($f in $files) {
  $path = $f.FullName
  $content = Get-Content -Raw -Encoding UTF8 -Path $path

  # Bỏ qua nếu đã có thẻ verify
  if ($content -match '(?i)name\s*=\s*["'']google-site-verification["'']') {
    continue
  }

  $anchorUsed = $null
  $new = $content

  # 1) Cố gắng chèn ngay sau robots
  if ($new -match '(?is)<meta\s+name=["'']robots["''][^>]*>') {
    $new = [regex]::Replace(
      $new,
      '(?is)(<meta\s+name=["'']robots["''][^>]*>\s*)',
      "`$1  $META`r`n",
      1,
      [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
    )
    $anchorUsed = 'robots'
  }
  # 2) Nếu không có robots, chèn sau canonical
  elseif ($new -match '(?is)<link\s+rel=["'']canonical["''][^>]*>') {
    $new = [regex]::Replace(
      $new,
      '(?is)(<link\s+rel=["'']canonical["''][^>]*>\s*)',
      "`$1  $META`r`n",
      1,
      [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
    )
    $anchorUsed = 'canonical'
  }
  # 3) Nếu không có cả hai, chèn trước </head>
  elseif ($new -match '(?is)</head>') {
    $new = [regex]::Replace(
      $new,
      '(?is)</head>',
      "  $META`r`n</head>",
      1,
      [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
    )
    $anchorUsed = 'head-close'
  }

  if ($anchorUsed -ne $null -and $new -ne $content) {
    # Sao lưu .bak một lần (nếu chưa có)
    if (-not (Test-Path "$path.bak")) {
      Copy-Item -Path $path -Destination "$path.bak" -Force
    }
    # Ghi lại với UTF-8
    Set-Content -Path $path -Value $new -Encoding UTF8
    Write-Host "[OK] $path  (anchor: $anchorUsed)"
    $changed++
  }
}

Write-Host "`nDone. Files changed: $changed"
if ($changed -eq 0) {
  Write-Host "Nothing to do (either already inserted or no matching <head> found)."
}
