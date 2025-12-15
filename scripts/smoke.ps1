$fails = @()

# Secciones obligatorias
$sections = @("home","marketplace","products","providers","sponsors","security","contact")
foreach ($s in $sections) {
  if (-not (Select-String -Path ".\index.html" -SimpleMatch "id=""$s""" -Quiet)) {
    $fails += "section:$s"
  }
}

# Scripts clave
$scripts = @("js\spa-nav.js","js\god-ux.js","js\observability.js")
foreach ($p in $scripts) {
  if (-not (Test-Path ".\$p")) {
    $fails += "script:$p"
  }
}

if ($fails.Count -gt 0) {
  Write-Host "SMOKE FAIL:" -ForegroundColor Red
  $fails | ForEach-Object { Write-Host " - $_" }
  exit 1
} else {
  Write-Host "SMOKE OK" -ForegroundColor Green
}
