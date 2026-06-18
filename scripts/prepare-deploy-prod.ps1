$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$branch = git -C $repoRoot branch --show-current

if ($branch -ne "main") {
  Write-Error "Refusing to activate prod FTP config while current branch is '$branch'. Switch to branch 'main' first."
}

$sftpSource = Join-Path $repoRoot ".vscode\sftp.prod.example.json"
$sftpTarget = Join-Path $repoRoot ".vscode\sftp.json"
$configSource = Join-Path $repoRoot "js\config.production.example.js"
$configTarget = Join-Path $repoRoot "js\config.js"

Copy-Item -LiteralPath $sftpSource -Destination $sftpTarget -Force
Copy-Item -LiteralPath $configSource -Destination $configTarget -Force

Write-Host "Activated Hostpoint prod FTP config for branch 'main'."
Write-Host "Activated Supabase production frontend config in js/config.js."
