$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$branch = git -C $repoRoot branch --show-current

if ($branch -ne "stg") {
  Write-Error "Refusing to activate stg FTP config while current branch is '$branch'. Switch to branch 'stg' first."
}

$source = Join-Path $repoRoot ".vscode\sftp.stg.example.json"
$target = Join-Path $repoRoot ".vscode\sftp.json"

Copy-Item -LiteralPath $source -Destination $target -Force
Write-Host "Activated Hostpoint stg FTP config for branch 'stg'."
