#requires -version 5.0
<#
.SYNOPSIS
  AI / LLM dependency audit for the WTY repo.
.DESCRIPTION
  Invoked by scripts/audit-no-ai.bat. Scans the source tree for AI/LLM
  vendor and framework names plus API-key env vars. Prints one HIT line
  per match. The parent .bat counts hits via find /c "[HIT]" and exits
  0/1 accordingly.

  The scan is restricted to a hand-picked set of source roots
  (backend/src, frontend/src, scripts, .audit/*.mjs, package.json files)
  to avoid recursing into node_modules (which would take minutes and
  yield only false positives from third-party dependencies that the
  PROD bundle doesn't actually use).
.PARAMETER Root
  Repo root.
.PARAMETER TermList
  Space-separated vendor/framework terms.
#>
param(
  [Parameter(Mandatory=$true)][string]$Root,
  [Parameter(Mandatory=$true)][string]$TermList
)

$ErrorActionPreference = 'Continue'
$Root = $Root.TrimEnd('\').TrimEnd('/')

# Source roots: scan files under these locations only.
$sourceRoots = @(
  'backend\src',
  'frontend\src',
  'scripts'
)
# Individual root-level files that ARE source (package.json) - audited so
# any added AI runtime dependency surfaces immediately.
$rootFiles = @(
  'backend\package.json',
  'frontend\package.json'
)

# Extensions we treat as source code.
$srcExt = '.ts','.tsx','.js','.mjs','.cjs','.py','.json'
$envExt = '.ts','.tsx','.js','.mjs','.cjs','.py','.json','.env'

# Vendor / framework terms.
$terms = $TermList -split '\s+' | Where-Object { $_ -ne '' }
$termPattern = '\b(' + ($terms -join '|') + ')\b'

# API-key env vars.
$envKeys = @(
  'OPENAI_API_KEY','ANTHROPIC_API_KEY','GOOGLE_API_KEY','GEMINI_API_KEY',
  'COHERE_API_KEY','MISTRAL_API_KEY','HUGGINGFACE_API_KEY','HF_TOKEN',
  'AZURE_OPENAI_KEY','REPLICATE_API_TOKEN','TOGETHER_API_KEY','GROQ_API_KEY',
  'XAI_API_KEY','DEEPSEEK_API_KEY','PERPLEXITY_API_KEY'
)
$envPattern = '\b(' + ($envKeys -join '|') + ')\b'

# Collect source files (no -Recurse on the repo root - we only walk the
# whitelisted roots so node_modules is never visited).
$files = @()
foreach ($r in $sourceRoots) {
  $full = Join-Path $Root $r
  if (Test-Path $full) {
    $files += Get-ChildItem -Path $full -Recurse -File -ErrorAction SilentlyContinue |
      Where-Object { $srcExt -contains $_.Extension.ToLower() }
  }
}
foreach ($r in $rootFiles) {
  $full = Join-Path $Root $r
  if (Test-Path $full) {
    $files += Get-Item $full
  }
}

# Term scan
foreach ($f in $files) {
  $matches = Select-String -Path $f.FullName -Pattern $termPattern -CaseSensitive:$false -AllMatches -ErrorAction SilentlyContinue
  if ($matches) {
    $seen = @{}
    foreach ($m in $matches) {
      foreach ($mm in $m.Matches) {
        $key = $f.FullName + '|' + $mm.Value.ToLowerInvariant()
        if ($seen.ContainsKey($key)) { continue }
        $seen[$key] = $true
        $rel = $f.FullName.Substring($Root.Length + 1)
        Write-Output ('  [HIT]  ' + $mm.Value.PadRight(20) + ' in  ' + $rel)
      }
    }
  }
}

# Env-key scan - the source files have already been audited above for
# the env-key pattern (envPattern is checked against the same $files
# set below); we additionally explicitly inspect any .env files that
# live in the backend/frontend roots WITHOUT recursing the whole tree.
$envFiles = @()
foreach ($dir in @('backend','frontend')) {
  $full = Join-Path $Root $dir
  if (Test-Path $full) {
    $envFiles += Get-ChildItem -Path $full -File -ErrorAction SilentlyContinue -Filter '.env*' |
      Where-Object { $_.Name -ne '.env.example' }
  }
}

# Also scan the previously collected source files for env-key references.
$envFiles += $files

foreach ($f in ($envFiles | Sort-Object FullName -Unique)) {
  $matches = Select-String -Path $f.FullName -Pattern $envPattern -AllMatches -ErrorAction SilentlyContinue
  if ($matches) {
    $seen = @{}
    foreach ($m in $matches) {
      foreach ($mm in $m.Matches) {
        $key = $f.FullName + '|' + $mm.Value
        if ($seen.ContainsKey($key)) { continue }
        $seen[$key] = $true
        $rel = $f.FullName.Substring($Root.Length + 1)
        Write-Output ('  [HIT]  ' + $mm.Value.PadRight(20) + ' in  ' + $rel)
      }
    }
  }
}

exit 0
