$ErrorActionPreference = "Stop"

$script:Failed = $false

function Write-Pass {
    param([string]$Message)

    Write-Host "PASS: $Message" -ForegroundColor Green
}

function Write-Fail {
    param(
        [string]$Message,
        [string]$Fix
    )

    Write-Host "FAIL: $Message" -ForegroundColor Red
    Write-Host "  Fix: $Fix"
    $script:Failed = $true
}

function Get-CommandPath {
    param(
        [string]$Name,
        [string[]]$FallbackPaths = @()
    )

    $command = Get-Command $Name -ErrorAction SilentlyContinue

    if ($command) {
        return $command.Source
    }

    foreach ($path in $FallbackPaths) {
        if (Test-Path -LiteralPath $path) {
            return $path
        }
    }

    return $null
}

function Test-MinimumVersion {
    param(
        [string]$Name,
        [string]$Executable,
        [string[]]$Arguments,
        [version]$Minimum,
        [string]$InstallHelp
    )

    if (-not $Executable) {
        Write-Fail "$Name >= $Minimum" $InstallHelp
        return
    }

    $rawVersion = (& $Executable @Arguments 2>&1 | Select-Object -First 1)
    $match = [regex]::Match([string]$rawVersion, "\d+(?:\.\d+){1,3}")

    if (-not $match.Success) {
        Write-Fail "$Name version could not be read" $InstallHelp
        return
    }

    $version = [version]$match.Value

    if ($version -ge $Minimum) {
        Write-Pass "$Name $version"
    } else {
        Write-Fail "$Name $version (requires >= $Minimum)" $InstallHelp
    }
}

Write-Host "AI-ROS setup verification"
Write-Host "========================="
Write-Host ""

$python = Get-CommandPath "python"
Test-MinimumVersion `
    -Name "Python" `
    -Executable $python `
    -Arguments @("--version") `
    -Minimum ([version]"3.11") `
    -InstallHelp "Install Python 3.11+ from https://www.python.org/downloads/"

$node = Get-CommandPath "node"
Test-MinimumVersion `
    -Name "Node.js" `
    -Executable $node `
    -Arguments @("--version") `
    -Minimum ([version]"20.0.0") `
    -InstallHelp "Install Node.js 20+ from https://nodejs.org/"

$npm = Get-CommandPath "npm.cmd"
Test-MinimumVersion `
    -Name "npm" `
    -Executable $npm `
    -Arguments @("--version") `
    -Minimum ([version]"10.0.0") `
    -InstallHelp "Install npm 10+ with Node.js 20 or run npm install -g npm@latest"

$docker = Get-CommandPath "docker" @(
    "C:\Program Files\Docker\Docker\resources\bin\docker.exe"
)

if (-not $docker) {
    Write-Fail "Docker installed and running" "Install Docker Desktop from https://www.docker.com/products/docker-desktop/"
} else {
    & $docker info *> $null

    if ($LASTEXITCODE -eq 0) {
        $dockerVersion = & $docker version --format "{{.Server.Version}}"
        Write-Pass "Docker $dockerVersion with a reachable daemon"
    } else {
        Write-Fail "Docker daemon is not reachable" "Start Docker Desktop and rerun this script"
    }
}

$git = Get-CommandPath "git"

if ($git) {
    Write-Pass (& $git --version)
} else {
    Write-Fail "Git installed" "Install Git from https://git-scm.com/downloads"
}

$gcloud = Get-CommandPath "gcloud.cmd" @(
    "$env:LOCALAPPDATA\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
    "C:\Program Files\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd",
    "C:\Program Files (x86)\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd"
)

if (-not $gcloud) {
    Write-Fail "Google Cloud CLI installed" "Install it from https://cloud.google.com/sdk/docs/install"
} else {
    $previousErrorPreference = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $versionOutput = (& $gcloud version 2>$null | Select-Object -First 1)
    $ErrorActionPreference = $previousErrorPreference
    $versionMatch = [regex]::Match(
        [string]$versionOutput,
        "\d+(?:\.\d+){1,3}"
    )
    $gcloudVersion = if ($versionMatch.Success) {
        $versionMatch.Value
    } else {
        "installed"
    }
    Write-Pass "Google Cloud CLI $gcloudVersion"

    $ErrorActionPreference = "Continue"
    $activeAccount = (
        & $gcloud auth list `
            "--filter=status:ACTIVE" `
            "--format=value(account)" 2>$null |
            Select-Object -First 1
    )
    $ErrorActionPreference = $previousErrorPreference

    if ($activeAccount) {
        Write-Pass "Google Cloud authentication has an active account"
    } else {
        Write-Fail "Google Cloud authentication" "Run gcloud auth login"
    }
}

Write-Host ""

if ($script:Failed) {
    Write-Host "One or more setup checks failed." -ForegroundColor Red
    exit 1
}

Write-Host "All setup checks passed." -ForegroundColor Green
exit 0
