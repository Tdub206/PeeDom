param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$Args
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$orchestratorPath = Join-Path $scriptDir "startup-swarm-orchestrator.cjs"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js is required to run the Mobile Startup Studio swarm orchestrator."
}

& node $orchestratorPath @Args
exit $LASTEXITCODE
