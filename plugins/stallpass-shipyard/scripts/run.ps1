param(
  [ValidateSet("plan", "loop", "review", "launch")]
  [string]$Mode = "loop",
  [string]$Task = "",
  [string]$TaskFile = "",
  [int]$MaxRounds = 2,
  [switch]$SkipCodex,
  [switch]$SkipVerify,
  [switch]$AndroidVerify,
  [switch]$DryRun,
  [switch]$VerboseOutput
)

$ErrorActionPreference = "Stop"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$runnerPath = Join-Path $repoRoot "scripts\stallpass-ai.ps1"

if (-not (Test-Path -LiteralPath $runnerPath)) {
  Write-Error "Missing orchestrator wrapper at $runnerPath"
  exit 1
}

if (($Mode -eq "plan" -or $Mode -eq "loop") -and [string]::IsNullOrWhiteSpace($Task) -and [string]::IsNullOrWhiteSpace($TaskFile)) {
  Write-Error "Modes plan and loop require -Task or -TaskFile."
  exit 1
}

$argsList = @($Mode)

if (-not [string]::IsNullOrWhiteSpace($Task)) {
  $argsList += @("--task", $Task)
}

if (-not [string]::IsNullOrWhiteSpace($TaskFile)) {
  $argsList += @("--task-file", $TaskFile)
}

if ($Mode -eq "loop" -and $MaxRounds -gt 0) {
  $argsList += @("--max-rounds", $MaxRounds.ToString())
}

if ($SkipCodex) {
  $argsList += "--skip-codex"
}

if ($SkipVerify) {
  $argsList += "--skip-verify"
}

if ($AndroidVerify) {
  $argsList += "--android-verify"
}

if ($DryRun) {
  $argsList += "--dry-run"
}

if ($VerboseOutput) {
  $argsList += "--verbose"
}

Push-Location $repoRoot
try {
  & $runnerPath @argsList
  exit $LASTEXITCODE
} finally {
  Pop-Location
}
