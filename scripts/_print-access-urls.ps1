#requires -version 5.0
<#
.SYNOPSIS
  Print Local + Network access URLs (Vite-style) for WTY launchers.
.PARAMETER Port
  TCP port the app listens on.
.PARAMETER Paths
  Optional path suffixes (e.g. '/', '/report'). Default: '/'.
.PARAMETER Label
  Short heading printed above the URLs.
#>
param(
  [Parameter(Mandatory)][int]$Port,
  [string[]]$Paths = @('/'),
  [string]$PathList = '',   # batch-friendly: "/,/report,/manual,/admin"
  [string]$Label = 'WTY'
)

if ($PathList) {
  $Paths = $PathList.Split(',') | ForEach-Object { $_.Trim() } | Where-Object { $_ }
}

function Resolve-UrlPath([string]$segment) {
  if ($segment -eq 'ROOT' -or $segment -eq '.' -or $segment -eq '') { return '/' }
  if ($segment.StartsWith('/')) { return $segment }
  return "/$segment"
}

function Get-LanIpv4Addresses {
  $addrs = [System.Collections.Generic.List[string]]::new()
  try {
    Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
      Where-Object {
        $_.InterfaceAlias -notmatch 'Loopback' -and
        $_.IPAddress -notlike '169.254.*' -and
        $_.PrefixOrigin -ne 'WellKnown'
      } |
      ForEach-Object { [void]$addrs.Add($_.IPAddress) }
  } catch {
    foreach ($addr in [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName())) {
      if ($addr.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork -and
          -not [System.Net.IPAddress]::IsLoopback($addr)) {
        [void]$addrs.Add($addr.ToString())
      }
    }
  }
  return $addrs | Select-Object -Unique
}

$lan = @(Get-LanIpv4Addresses)
$paths = @($Paths | ForEach-Object { Resolve-UrlPath $_ })
if ($paths.Count -eq 0) { $paths = @('/') }

Write-Host ''
Write-Host "  $Label  (port $Port)"
Write-Host ''

foreach ($path in $paths) {
  $local = "http://localhost:${Port}${path}"
  Write-Host "  Local:   $local"
  if ($lan.Count -gt 0) {
    foreach ($ip in $lan) {
      Write-Host "  Network: http://${ip}:${Port}${path}" -ForegroundColor Cyan
    }
  } else {
    Write-Host '  Network: (no LAN IPv4 found — check Wi-Fi / Ethernet is connected)' -ForegroundColor Yellow
  }
  if ($paths.Count -gt 1) { Write-Host '' }
}

Write-Host ''
