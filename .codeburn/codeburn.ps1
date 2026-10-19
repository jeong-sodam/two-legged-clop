[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$CodeBurnArgs
)

$ErrorActionPreference = 'Stop'
$runtimePath = Join-Path $PSScriptRoot 'runtime\dist\cli.js'

if (-not (Test-Path $runtimePath -PathType Leaf)) {
    throw "CodeBurn runtime not found: $runtimePath"
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node.js 22.13.0 or newer is required.'
}

& node $runtimePath @CodeBurnArgs
if ($LASTEXITCODE -ne 0) {
    throw "CodeBurn exited with code $LASTEXITCODE."
}