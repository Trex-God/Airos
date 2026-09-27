param(
  [string]$Source = "C:\Users\addy2\OneDrive\Desktop\AIROS2",
  [string]$Destination = "W:\AIROS2",
  [switch]$Resume,
  [switch]$RemoveOriginal
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-Section {
  param([string]$Title)
  Write-Host ""
  Write-Host "==== $Title ===="
}

function Resolve-FullPath {
  param([string]$Path)
  $executionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Path)
}

function Get-RelativePathCompat {
  param(
    [string]$BasePath,
    [string]$FullPath
  )

  $baseUri = [System.Uri]::new(($BasePath.TrimEnd("\") + "\"))
  $fullUri = [System.Uri]::new($FullPath)
  [System.Uri]::UnescapeDataString($baseUri.MakeRelativeUri($fullUri).ToString()).Replace("/", "\")
}

Write-Section "Validate paths"
$sourcePath = Resolve-FullPath $Source
$destinationPath = Resolve-FullPath $Destination
$destinationParent = Split-Path -Parent $destinationPath

if (-not (Test-Path -LiteralPath $sourcePath -PathType Container)) {
  throw "Source directory not found: $sourcePath"
}

if (-not (Test-Path -LiteralPath $destinationParent -PathType Container)) {
  throw "Destination parent does not exist: $destinationParent"
}

if ($sourcePath.TrimEnd("\") -ieq $destinationPath.TrimEnd("\")) {
  throw "Source and destination are the same path."
}

if (-not ($destinationPath -like "W:\*")) {
  throw "Refusing to write outside W:\. Destination was: $destinationPath"
}

if ((Test-Path -LiteralPath $destinationPath) -and (Get-ChildItem -Force -LiteralPath $destinationPath | Select-Object -First 1)) {
  if (-not $Resume) {
    throw "Destination already exists and is not empty: $destinationPath. Use -Resume to verify and finish an existing copy."
  }

  Write-Host "Destination already exists; resuming verification/copy reconciliation because -Resume was supplied."
}

Write-Host "Source:      $sourcePath"
Write-Host "Destination: $destinationPath"

Write-Section "Inventory source"
$sourceFiles = Get-ChildItem -LiteralPath $sourcePath -Force -Recurse -File
$sourceDirs = Get-ChildItem -LiteralPath $sourcePath -Force -Recurse -Directory
$sourceBytes = ($sourceFiles | Measure-Object Length -Sum).Sum

Write-Host "Files:       $($sourceFiles.Count)"
Write-Host "Directories: $($sourceDirs.Count)"
Write-Host "Bytes:       $sourceBytes"

Write-Section "Copy project to W drive"
New-Item -ItemType Directory -Force -Path $destinationPath | Out-Null

$logPath = Join-Path $env:TEMP ("airos2-robocopy-{0}.log" -f (Get-Date -Format "yyyyMMdd-HHmmss"))
$robocopyArgs = @(
  $sourcePath,
  $destinationPath,
  "/E",
  "/COPY:DAT",
  "/DCOPY:DAT",
  "/R:2",
  "/W:2",
  "/XJ",
  "/FFT",
  "/TEE",
  "/LOG:$logPath"
)

& robocopy @robocopyArgs
$robocopyExit = $LASTEXITCODE

if ($robocopyExit -ge 8) {
  throw "Robocopy failed with exit code $robocopyExit. Log: $logPath"
}

Write-Host "Robocopy completed with exit code $robocopyExit."
Write-Host "Log: $logPath"

Write-Section "Verify copied project"
$destinationFiles = Get-ChildItem -LiteralPath $destinationPath -Force -Recurse -File
$destinationDirs = Get-ChildItem -LiteralPath $destinationPath -Force -Recurse -Directory
$destinationBytes = ($destinationFiles | Measure-Object Length -Sum).Sum

$fileCountMatches = $sourceFiles.Count -eq $destinationFiles.Count
$directoryCountMatches = $sourceDirs.Count -eq $destinationDirs.Count
$byteCountMatches = $sourceBytes -eq $destinationBytes

Write-Host "File count match:      $fileCountMatches ($($sourceFiles.Count) -> $($destinationFiles.Count))"
Write-Host "Directory count match: $directoryCountMatches ($($sourceDirs.Count) -> $($destinationDirs.Count))"
Write-Host "Byte count match:      $byteCountMatches ($sourceBytes -> $destinationBytes)"

if (-not ($fileCountMatches -and $directoryCountMatches -and $byteCountMatches)) {
  throw "Verification failed. Original was not removed."
}

Write-Section "Verify environment files"
$envFiles = Get-ChildItem -LiteralPath $sourcePath -Force -Recurse -File -Include ".env", ".env.*", "*.env"
$envManifest = foreach ($envFile in $envFiles) {
  $relativePath = Get-RelativePathCompat -BasePath $sourcePath -FullPath $envFile.FullName
  $copiedPath = Join-Path $destinationPath $relativePath

  if (-not (Test-Path -LiteralPath $copiedPath -PathType Leaf)) {
    throw "Environment file missing after copy: $relativePath"
  }

  $sourceHash = (Get-FileHash -LiteralPath $envFile.FullName -Algorithm SHA256).Hash
  $destinationHash = (Get-FileHash -LiteralPath $copiedPath -Algorithm SHA256).Hash

  if ($sourceHash -ne $destinationHash) {
    throw "Environment file hash mismatch: $relativePath"
  }

  [pscustomobject]@{
    RelativePath = $relativePath
    Bytes = $envFile.Length
    Sha256 = $sourceHash
  }
}

$migrationDir = Join-Path $destinationPath "_migration"
New-Item -ItemType Directory -Force -Path $migrationDir | Out-Null
$envManifestPath = Join-Path $migrationDir "environment-files-manifest.json"
$envManifest | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $envManifestPath -Encoding UTF8

Write-Host "Environment files verified: $($envFiles.Count)"
Write-Host "Manifest: $envManifestPath"

Write-Section "Back up Windows environment variables"
$environmentBackup = [ordered]@{
  created_at = (Get-Date).ToString("o")
  source = $sourcePath
  destination = $destinationPath
  process = [Environment]::GetEnvironmentVariables("Process")
  user = [Environment]::GetEnvironmentVariables("User")
  machine = [Environment]::GetEnvironmentVariables("Machine")
}

$environmentBackupPath = Join-Path $migrationDir "windows-environment-backup.json"
$environmentBackup | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $environmentBackupPath -Encoding UTF8
Write-Host "Environment variable backup written without printing secret values."
Write-Host "Backup: $environmentBackupPath"

Write-Section "Original project handling"
if ($RemoveOriginal) {
  $expectedSource = "C:\Users\addy2\OneDrive\Desktop\AIROS2"
  if ($sourcePath.TrimEnd("\") -ine $expectedSource.TrimEnd("\")) {
    throw "Refusing to remove unexpected source path: $sourcePath"
  }

  Write-Host "Removing original source because -RemoveOriginal was supplied."
  Remove-Item -LiteralPath $sourcePath -Recurse -Force
  Write-Host "Original removed: $sourcePath"
} else {
  Write-Host "Original left in place."
  Write-Host "For a complete move, run this script with -RemoveOriginal. Use -Resume too if W:\AIROS2 already exists."
}

Write-Section "Done"
Write-Host "AIROS2 is available at: $destinationPath"
