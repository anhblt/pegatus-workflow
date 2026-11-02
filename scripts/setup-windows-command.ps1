$ErrorActionPreference = 'Stop'

try {
    $checkout = Split-Path -Parent $PSScriptRoot
    $node = Get-Command node.exe -ErrorAction Stop
    $npm = Get-Command npm.cmd -ErrorAction Stop
    $version = & $node.Source --version
    if ($LASTEXITCODE -ne 0 -or $version -notmatch '^v(\d+)' -or [int]$Matches[1] -lt 22) {
        throw 'Pegatus requires Node.js 22 or later.'
    }

    $prefix = (& $npm.Source prefix -g).Trim()
    if ($LASTEXITCODE -ne 0 -or -not $prefix -or -not [IO.Path]::IsPathRooted($prefix)) {
        throw 'Could not determine the npm global prefix.'
    }

    function Assert-CommandAvailable {
        $existing = @(Get-Command pegatus -All -ErrorAction SilentlyContinue)
        $paths = @(
            (Join-Path $prefix 'pegatus'),
            (Join-Path $prefix 'pegatus.cmd'),
            (Join-Path $prefix 'pegatus.ps1'),
            (Join-Path $prefix 'node_modules/@galliker/pegatus')
        )
        foreach ($path in $paths) {
            if (Test-Path -LiteralPath $path) { throw "Existing npm destination found: $path. Resolve the conflict before setup." }
        }
        if ($existing.Count -gt 0) { throw "Existing pegatus command found: $($existing[0].Source). Resolve the conflict before setup." }
    }

    Assert-CommandAvailable
    Push-Location $checkout
    try {
        & $npm.Source ci --ignore-scripts --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) { throw 'npm ci failed; command registration was not attempted.' }
        Assert-CommandAvailable
        & $npm.Source link --ignore-scripts --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) { throw 'npm link failed. Inspect npm output and global destinations before retrying.' }
    } finally { Pop-Location }

    Write-Host "Pegatus command linked to $checkout"
    Write-Host "Ensure this npm global directory is on PATH: $prefix"
    Write-Host 'Open a new terminal and run pegatus --help. In PowerShell, pegatus.cmd --help also works.'
} catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
}
