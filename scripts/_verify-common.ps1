#requires -version 5.0
<#
.SYNOPSIS
  Shared verification helpers used by _verify-prod.ps1 and _verify-dev.ps1.
.DESCRIPTION
  Source this file with `. .\_verify-common.ps1` from the entry-point
  script. It exposes:

    Probe-Tcp        -Host x -Port n            -> [hashtable]{ ok; latencyMs; detail }
    Probe-Http       -Url x  [-Validate {sb}]   -> [hashtable]{ ok; latencyMs; detail; content }
    Render-Table     -Title x -Mode x -Rows xs  -> writes the compact table to stdout
                                                   and returns the failure count

  All probes are fast-fail (2s timeout) so the launcher never hangs.
#>

function Probe-Tcp {
  param([string]$Address, [int]$Port, [int]$TimeoutMs = 2000)
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $iar = $client.BeginConnect($Address, $Port, $null, $null)
    $ok  = $iar.AsyncWaitHandle.WaitOne($TimeoutMs, $false)
    if (-not $ok) {
      $client.Close()
      return @{ ok = $false; latencyMs = $TimeoutMs; detail = "no TCP connect in ${TimeoutMs}ms" }
    }
    $client.EndConnect($iar)
    $sw.Stop()
    return @{ ok = $true; latencyMs = [int]$sw.ElapsedMilliseconds; detail = '' }
  } catch {
    $sw.Stop()
    return @{ ok = $false; latencyMs = [int]$sw.ElapsedMilliseconds; detail = $_.Exception.Message }
  } finally {
    $client.Dispose()
  }
}

function Probe-Http {
  param(
    [string]$Url,
    [int]$TimeoutSec = 3,
    [scriptblock]$Validate = $null   # called with the response object; return $null to pass or a string to fail with
  )
  $sw = [System.Diagnostics.Stopwatch]::StartNew()
  try {
    $resp = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec $TimeoutSec -ErrorAction Stop
    $sw.Stop()
    if ($resp.StatusCode -ne 200) {
      return @{ ok = $false; latencyMs = [int]$sw.ElapsedMilliseconds; detail = "http $($resp.StatusCode)"; content = $resp.Content }
    }
    if ($Validate) {
      $verdict = & $Validate $resp
      if ($verdict) {
        return @{ ok = $false; latencyMs = [int]$sw.ElapsedMilliseconds; detail = $verdict; content = $resp.Content }
      }
    }
    return @{ ok = $true; latencyMs = [int]$sw.ElapsedMilliseconds; detail = ''; content = $resp.Content }
  } catch {
    $sw.Stop()
    return @{ ok = $false; latencyMs = [int]$sw.ElapsedMilliseconds; detail = $_.Exception.Message; content = '' }
  }
}

function Render-Table {
  param(
    [string]$Title,
    [string]$Mode,                    # 'production' or 'development'
    [System.Collections.IList]$Rows   # each row: @{ label; result }  where result is the probe hashtable
  )
  # Compute column widths so the box scales to long URLs / failure messages.
  $labelWidth = 30
  foreach ($r in $Rows) {
    if ($r.label.Length -gt $labelWidth) { $labelWidth = $r.label.Length }
  }
  $totalWidth = $labelWidth + 28  # +"  [STAT]   NNNN ms  hint"

  $hr = '+' + ('-' * ($totalWidth + 2)) + '+'

  Write-Host ''
  Write-Host $hr
  Write-Host ('|  ' + $Title.PadRight($totalWidth) + '|')
  Write-Host $hr
  $line = ('|  ' + 'Service / endpoint'.PadRight($labelWidth + 2) + 'Status   Latency       |')
  Write-Host $line
  Write-Host $hr

  $fails = 0
  foreach ($r in $Rows) {
    $stat = if ($r.result.ok) { '[OK]   ' } else { '[FAIL] ' }
    if (-not $r.result.ok) { $fails++ }
    $latency = if ($r.result.ok) { "{0,4} ms" -f $r.result.latencyMs } else { '   -  ' }
    $line = '|  ' + $r.label.PadRight($labelWidth) + '  ' + $stat + ' ' + $latency.PadRight(8) + '   |'
    if ($r.result.ok) {
      Write-Host $line -ForegroundColor Green
    } else {
      Write-Host $line -ForegroundColor Red
      if ($r.result.detail) {
        $hint = '|     -> ' + $r.result.detail
        if ($hint.Length -gt ($totalWidth + 2)) { $hint = $hint.Substring(0, $totalWidth) + '..' }
        Write-Host ($hint.PadRight($totalWidth + 3) + '|') -ForegroundColor Yellow
      }
    }
  }

  Write-Host $hr
  $verdict = if ($fails -eq 0) {
    "$($Mode.ToUpper()) mode confirmed.  $($Rows.Count)/$($Rows.Count) checks passed."
  } else {
    "FAIL  $fails of $($Rows.Count) checks failed.  $($Mode.ToUpper()) mode NOT verified."
  }
  $color = if ($fails -eq 0) { 'Green' } else { 'Red' }
  Write-Host ('|  ' + $verdict.PadRight($totalWidth) + '|') -ForegroundColor $color
  Write-Host $hr
  Write-Host ''

  return $fails
}
