param(
  [Parameter(Position = 0)]
  [string]$Mode = "loop",

  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$RemainingArgs
)

$scriptPath = Join-Path $PSScriptRoot "stallpass-ai-orchestrator.cjs"

if (-not (Test-Path $scriptPath)) {
  Write-Error "Missing orchestrator script at $scriptPath"
  exit 1
}

& node $scriptPath $Mode @RemainingArgs
exit $LASTEXITCODE
