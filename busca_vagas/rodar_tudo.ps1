# =====================================================================
# Pipeline completo de busca de vagas Gupy + InHire
# Uso:  powershell -ExecutionPolicy Bypass -File rodar_tudo.ps1
# (opcional) atualize antes o arquivo empresas.xlsx com sua lista.
# =====================================================================
$ErrorActionPreference = 'Stop'
$dir = $PSScriptRoot
Set-Location $dir

function Step($n, $desc, $cmd) {
  Write-Host ""
  Write-Host "==== [$n] $desc ====" -ForegroundColor Cyan
  # Reset: passos em .ps1/COM (Excel) nao setam $LASTEXITCODE; sem isso o $null
  # herdado dispara falso "falhou". Assim so quebra quando um node retorna != 0.
  $global:LASTEXITCODE = 0
  & $cmd
  if ($LASTEXITCODE -ne 0) { throw "Falhou na etapa: $desc (exit $LASTEXITCODE)" }
}

# Verifica Node
try { $null = (Get-Command node -ErrorAction Stop) } catch { throw "Node.js nao encontrado no PATH. Instale o Node (https://nodejs.org)." }

$t0 = Get-Date

Step 1  "Extrair empresas do xlsx -> companies.json"        { & "$dir\extrair_empresas.ps1" }
Step 2  "Gupy: buscar vagas (API global) + presenca pool"   { node "$dir\gupy.js" }
Step 3  "Gupy: presenca real por subdominio"                { node "$dir\gupy_presence_full.js" }
Step 4  "InHire: chute de slug a partir da sua lista"       { node "$dir\inhire.js" }
Step 5  "InHire: coletar slugs da web (Wayback/urlscan/CC)" { node "$dir\harvest_inhire.js" }
Step 6  "InHire: validar todos os slugs na API"            { node "$dir\validate_inhire.js" }
Step 7  "InHire: gerar saidas (vagas + empresas novas)"     { node "$dir\inhire_saida.js" }
Step 8  "Consolidar e deduplicar vagas -> vagas_final.json" { node "$dir\merge.js" }
Step 8b "Carimbar data de deteccao (novas = hoje)"          { node "$dir\stamp_dates.js" }
Step 9  "Montar tabela de presenca"                         { node "$dir\presence.js" }
Step 10 "Gerar planilha final (Excel, 3 abas)"              { & "$dir\build_xlsx.ps1" }

$mins = [math]::Round(((Get-Date) - $t0).TotalMinutes, 1)
Write-Host ""
Write-Host "==== CONCLUIDO em $mins min ====" -ForegroundColor Green
Write-Host "Planilha: ..\vagas_gupy_inhire.xlsx" -ForegroundColor Green
