[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$runtimePath = Join-Path $PSScriptRoot 'runtime\dist\cli.js'
$mcpDirectory = Join-Path $projectRoot '.vscode'
$mcpPath = Join-Path $mcpDirectory 'mcp.json'

if (-not (Test-Path $runtimePath -PathType Leaf)) {
    throw "CodeBurn runtime not found: $runtimePath"
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node.js 22.13.0 or newer is required.'
}

$nodeVersionText = (& node --version).Trim().TrimStart('v')
$nodeVersion = [version]$nodeVersionText
if ($nodeVersion -lt [version]'22.13.0') {
    throw "Node.js 22.13.0 or newer is required. Current version: $nodeVersionText"
}

New-Item -ItemType Directory -Path $mcpDirectory -Force | Out-Null

if (Test-Path $mcpPath -PathType Leaf) {
    $rawConfig = Get-Content $mcpPath -Raw
    try {
        $config = $rawConfig | ConvertFrom-Json
    }
    catch {
        throw "Cannot safely merge $mcpPath because it is not strict JSON. Remove comments or register CodeBurn manually."
    }

    $backupPath = "$mcpPath.codeburn-backup"
    Copy-Item $mcpPath $backupPath -Force
}
else {
    $config = [pscustomobject]@{}
    $backupPath = $null
}

if (-not $config.PSObject.Properties['servers']) {
    $config | Add-Member -NotePropertyName servers -NotePropertyValue ([pscustomobject]@{})
}

$servers = $config.servers
if ($null -eq $servers) {
    $servers = [pscustomobject]@{}
    $config.servers = $servers
}

if ($servers.PSObject.Properties['codeburn']) {
    $servers.PSObject.Properties.Remove('codeburn')
}

$serverConfig = [pscustomobject][ordered]@{
    type = 'stdio'
    command = 'node'
    args = @(
        '${workspaceFolder}/.codeburn/runtime/dist/cli.js'
        'mcp'
    )
}
$servers | Add-Member -NotePropertyName codeburn -NotePropertyValue $serverConfig

$json = $config | ConvertTo-Json -Depth 20
[System.IO.File]::WriteAllText($mcpPath, $json + [Environment]::NewLine, [System.Text.UTF8Encoding]::new($false))

$codeBurnVersion = (& node $runtimePath --version).Trim()
Write-Host "CodeBurn $codeBurnVersion is ready."
Write-Host "MCP configuration: $mcpPath"
if ($backupPath) {
    Write-Host "Backup: $backupPath"
}
Write-Host 'Reload the VS Code window to start the project-scoped MCP server.'