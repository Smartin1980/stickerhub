$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$branch = git -C $repoRoot branch --show-current

if ($branch -ne "stg") {
  Write-Error "Refusing to activate stg FTP config while current branch is '$branch'. Switch to branch 'stg' first."
}

$sftpSource = Join-Path $repoRoot ".vscode\sftp.stg.example.json"
$sftpTarget = Join-Path $repoRoot ".vscode\sftp.json"
$configSource = Join-Path $repoRoot "js\config.stg.example.js"
$configTarget = Join-Path $repoRoot "js\config.js"

Copy-Item -LiteralPath $sftpSource -Destination $sftpTarget -Force
Copy-Item -LiteralPath $configSource -Destination $configTarget -Force

Write-Host "Activated Hostpoint stg FTP config for branch 'stg'."
Write-Host "Activated Supabase stg frontend config in js/config.js."
