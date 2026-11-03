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
        $launchers = @(
            (Join-Path $prefix 'pegatus'),
            (Join-Path $prefix 'pegatus.cmd'),
            (Join-Path $prefix 'pegatus.ps1')
        )
        $packages = @('pegatus-workflow')
        $paths = @($launchers) + @($packages | ForEach-Object { Join-Path $prefix "node_modules/$_" })
        $ownedPackage = $null
        foreach ($package in $packages) {
            $packagePath = Join-Path $prefix "node_modules/$package"
            $item = Get-Item -LiteralPath $packagePath -Force -ErrorAction SilentlyContinue
            if ($item -and $item.LinkType -and $item.Target -and
                [IO.Path]::GetFullPath($item.Target[0]).TrimEnd('\') -ieq [IO.Path]::GetFullPath($checkout).TrimEnd('\')) {
                if ($ownedPackage) { throw 'Multiple Pegatus package links found. Resolve the conflict before setup.' }
                $ownedPackage = $package
            } elseif ($item) {
                throw "Existing npm destination found: $packagePath. Resolve the conflict before setup."
            }
        }
        if ($ownedPackage) {
            $relativeTarget = "node_modules/$ownedPackage/bin/pegatus.mjs".Replace('/', '\')
            foreach ($launcher in $launchers) {
                if (-not (Test-Path -LiteralPath $launcher -PathType Leaf) -or
                    -not ((Get-Content -LiteralPath $launcher -Raw).Replace('/', '\').Contains($relativeTarget))) {
                    throw "Existing npm destination is missing or unexpected: $launcher. Resolve the conflict before setup."
                }
            }
            foreach ($command in $existing) {
                if ($command.Source -notin $launchers) { throw "Existing pegatus command found: $($command.Source). Resolve the conflict before setup." }
            }
            return $true
        }
        foreach ($path in $paths) {
            if (Test-Path -LiteralPath $path) { throw "Existing npm destination found: $path. Resolve the conflict before setup." }
        }
        if ($existing.Count -gt 0) { throw "Existing pegatus command found: $($existing[0].Source). Resolve the conflict before setup." }
        return $false
    }

    $alreadyLinked = Assert-CommandAvailable
    Push-Location $checkout
    try {
        & $npm.Source ci --ignore-scripts --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) { throw 'npm ci failed; command registration was not attempted.' }
        $stillLinked = Assert-CommandAvailable
        if ($alreadyLinked -ne $stillLinked) { throw 'Pegatus command destinations changed during setup. Inspect them before retrying.' }
        if (-not $stillLinked) {
            & $npm.Source link --ignore-scripts --no-audit --no-fund
            if ($LASTEXITCODE -ne 0) { throw 'npm link failed. Inspect npm output and global destinations before retrying.' }
        }
    } finally { Pop-Location }

    Write-Host "Pegatus command linked to $checkout"
    if ($alreadyLinked) { Write-Host 'Existing checkout link retained; locked dependencies refreshed and current checkout commands are active.' }
    Write-Host "Ensure this npm global directory is on PATH: $prefix"
    Write-Host 'Run pegatus for command help, or pegatus setup for guided installation. In PowerShell, pegatus.cmd also works.'
} catch {
    [Console]::Error.WriteLine($_.Exception.Message)
    exit 1
}
