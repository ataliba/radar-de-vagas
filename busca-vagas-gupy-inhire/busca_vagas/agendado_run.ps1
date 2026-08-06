# Wrapper chamado pela Tarefa Agendada do Windows.
# Roda o pipeline completo, grava log datado e nunca deixa a janela travar.
$dir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $dir

# Garante o Node no PATH (o ambiente da Tarefa Agendada pode nao herdar o PATH do usuario)
$env:Path = "C:\Program Files\nodejs;" + $env:Path

$log = Join-Path $dir ("scheduled_log_" + (Get-Date -Format "yyyy-MM") + ".txt")
$stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
Add-Content -Path $log -Encoding UTF8 -Value "`r`n===================== START $stamp ====================="

try {
  # Snapshot pra medir o que e novo nesta rodada
  if (Test-Path "$dir\vagas_final.json") { Copy-Item "$dir\vagas_final.json" "$dir\vagas_final_prev.json" -Force }

  & "$dir\rodar_tudo.ps1" *>&1 | Out-File -FilePath $log -Append -Encoding utf8

  # Quantas vagas foram detectadas hoje (novas) + total
  $novasHoje = & node -e "const v=require('./vagas_final.json');const t=new Date().toLocaleDateString('sv-SE');console.log(v.filter(x=>x.detectado_em===t).length+'/'+v.length)"
  Add-Content -Path $log -Encoding UTF8 -Value "===== OK $(Get-Date -Format 'HH:mm:ss') | detectadas hoje/total: $novasHoje ====="
}
catch {
  Add-Content -Path $log -Encoding UTF8 -Value "===== ERRO $(Get-Date -Format 'HH:mm:ss'): $($_.Exception.Message) ====="
  Add-Content -Path $log -Encoding UTF8 -Value "(dica: se falhou no passo 10, o vagas_gupy_inhire.xlsx provavelmente estava ABERTO no Excel)"
}
