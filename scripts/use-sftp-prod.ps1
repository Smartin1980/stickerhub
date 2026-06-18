$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$branch = git -C $repoRoot branch --show-current

if ($branch -ne "main") {
  Write-Error "Refusing to activate prod FTP config while current branch is '$branch'. Switch to branch 'main' first."
}

$source = Join-Path $repoRoot ".vscode\sftp.prod.example.json"
$target = Join-Path $repoRoot ".vscode\sftp.json"

Copy-Item -LiteralPath $source -Destination $target -Force
Write-Host "Activated Hostpoint prod FTP config for branch 'main'."
