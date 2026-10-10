$ErrorActionPreference = 'Stop'
$workspace = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$renderer = Join-Path $workspace 'outputs/render-runtime/libreoffice/program/soffice.com'
if (-not (Test-Path -LiteralPath $renderer)) { throw 'Set up the workspace-only LibreOffice rendering runtime before rebuilding previews.' }
$manifest = Get-Content -Raw -LiteralPath (Join-Path $workspace 'outputs/hr-templates/word-manifest.json') | ConvertFrom-Json
$files = $manifest | ForEach-Object { (Resolve-Path (Join-Path $workspace ('outputs/hr-templates/word-current/' + $_.id + '.docx'))).Path }
$profile = 'file:///' + $workspace.Replace('\','/') + '/outputs/render-runtime/render-profile'
& $renderer ('-env:UserInstallation=' + $profile) --headless --convert-to pdf --outdir (Join-Path $workspace 'reports/hr-documents') @files
if ($LASTEXITCODE -ne 0) { throw 'Document conversion failed.' }
