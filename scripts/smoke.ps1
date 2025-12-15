\ = @()
# Secciones
'home','marketplace','products','providers','sponsors','security','contact' | %{
  if(-not (Select-String -Path .\index.html -Pattern \"id=\\\"\\\"\")){ \ += \"section:\" }
}
# Scripts clave
'js/spa-nav.js','js/god-ux.js','js/observability.js' | %{
  if(-not (Test-Path .\\)){ \ += \"script:\" }
}
if(\.Count){
  Write-Host \"SMOKE FAIL:\" -ForegroundColor Red
  \ | % { Write-Host \" - \" }
  exit 1
}else{
  Write-Host \"SMOKE OK\" -ForegroundColor Green
}
