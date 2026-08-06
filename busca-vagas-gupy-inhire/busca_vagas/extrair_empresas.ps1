# Extrai a coluna de empresas do .xlsx para companies.json
# Uso: powershell -File extrair_empresas.ps1 [caminho_do_xlsx]
param(
  [string]$XlsxPath = (Join-Path (Split-Path -Parent $PSScriptRoot) 'empresas.xlsx')
)
$ErrorActionPreference = 'Stop'
$dir = $PSScriptRoot
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::OpenRead($XlsxPath)
$entry = $zip.Entries | Where-Object { $_.FullName -eq 'xl/sharedStrings.xml' }
$reader = New-Object System.IO.StreamReader($entry.Open())
$xml = $reader.ReadToEnd(); $reader.Close(); $zip.Dispose()
[xml]$doc = $xml
$names = @()
foreach ($si in $doc.sst.si) { if ($si.t) { $names += [string]$si.t } }
# remove um possivel cabecalho "Empresas"
$names = $names | Where-Object { $_ -and $_ -ne 'Empresas' }
# grava SEM BOM (o Node quebra com BOM)
[System.IO.File]::WriteAllText("$dir\companies.json", ($names | ConvertTo-Json), (New-Object System.Text.UTF8Encoding($false)))
Write-Output "companies.json gerado com $($names.Count) empresas"
