param()

$ErrorActionPreference = "Stop"

function Test-CommandHealth {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name,
    [string[]]$ProbeArgs = @("--version"),
    [switch]$Optional,
    [string]$MissingHint = ""
  )

  try {
    $command = Get-Command $Name -ErrorAction Stop
    $probe = & $command.Source @ProbeArgs 2>&1 | Select-Object -First 1
    $message = if ($probe) { $probe.ToString().Trim() } else { $command.Source }
    Write-Host "[ok] $Name $message"
    return $true
  } catch {
    $label = if ($Optional) { "warn" } else { "fail" }
    $suffix = if ([string]::IsNullOrWhiteSpace($MissingHint)) { "" } else { " $MissingHint" }
    Write-Host "[$label] $Name not available.$suffix"
    return $false
  }
}

function Test-RequiredPath {
  param(
    [Parameter(Mandatory = $true)]
  [string]$Path
  )

  if (Test-Path -LiteralPath $Path) {
    Write-Host "[ok] found $Path"
    return $true
  }

  Write-Host "[fail] missing $Path"
  return $false
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$packageJsonPath = Join-Path $repoRoot "package.json"
$requiredPaths = @(
  (Join-Path $repoRoot "AGENTS.md"),
  (Join-Path $repoRoot "CLAUDE.md"),
  (Join-Path $repoRoot "CODEX.md"),
  (Join-Path $repoRoot "LAUNCH_CHECKLIST.md"),
  (Join-Path $repoRoot "scripts\stallpass-ai-orchestrator.cjs"),
  (Join-Path $repoRoot "scripts\stallpass-ai.ps1"),
  $packageJsonPath
)

$allPassed = $true

Write-Host "StallPass Shipyard doctor"
Write-Host "Repo root: $repoRoot"

foreach ($path in $requiredPaths) {
  if (-not (Test-RequiredPath -Path $path)) {
    $allPassed = $false
  }
}

if (Test-Path -LiteralPath $packageJsonPath) {
  try {
    $packageJson = Get-Content -Raw -LiteralPath $packageJsonPath | ConvertFrom-Json
    $requiredScripts = @("ai:plan", "ai:loop", "ai:review", "ai:launch", "lint", "test", "type-check")
    foreach ($scriptName in $requiredScripts) {
      if ($packageJson.scripts.PSObject.Properties.Name -contains $scriptName) {
        Write-Host "[ok] package.json script $scriptName"
      } else {
        Write-Host "[fail] package.json script $scriptName missing"
        $allPassed = $false
      }
    }
  } catch {
    Write-Host "[fail] unable to parse $packageJsonPath"
    $allPassed = $false
  }
}

if (-not (Test-CommandHealth -Name "node")) {
  $allPassed = $false
}

if (-not (Test-CommandHealth -Name "npm" -ProbeArgs @("--version"))) {
  $allPassed = $false
}

if (-not (Test-CommandHealth -Name "claude" -ProbeArgs @("--version") -Optional -MissingHint "Set STALLPASS_CLAUDE_COMMAND and STALLPASS_CLAUDE_PROBE if Claude is installed outside PATH.")) {
  $allPassed = $false
}

if (-not (Test-CommandHealth -Name "codex" -ProbeArgs @("--help") -Optional -MissingHint "Set STALLPASS_CODEX_COMMAND and STALLPASS_CODEX_PROBE if Codex is installed outside PATH.")) {
  $allPassed = $false
}

if ($allPassed) {
  Write-Host "[ok] Shipyard environment is ready"
  exit 0
}

Write-Host "[fail] Shipyard environment is not fully ready"
exit 1
