#requires -version 5.0
<#
.SYNOPSIS
  Verify that the WTY DEV stack is fully up.
.DESCRIPTION
  Probes the same 6 backend / SPA services as _verify-prod.ps1, asserts
  /api/health reports mode == 'development', AND additionally probes the
  Vite dev server on :5173. Exits 1 on any failure so the parent .bat
  can abort the launch.

  Note: in dev mode the dashboard is served by Vite on :5173 (with HMR),
  not by the backend on :4000. So we probe both.
#>

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_verify-common.ps1"

$rows = [System.Collections.ArrayList]@()

# 1. MongoDB raw TCP
$null = $rows.Add(@{ label = 'MongoDB         :27017'; result = (Probe-Tcp '127.0.0.1' 27017) })

# 2. /api/health - dev-mode assertion
$null = $rows.Add(@{
  label  = '/api/health      (mode=dev)'
  result = (Probe-Http -Url 'http://127.0.0.1:4000/api/health' -Validate {
    param($resp)
    try {
      $j = $resp.Content | ConvertFrom-Json
      if (-not $j.ok)                { return 'health responded ok=false' }
      if ($j.mode -ne 'development') { return "expected mode='development' got '$($j.mode)'" }
      return $null
    } catch { return "could not parse health JSON: $($_.Exception.Message)" }
  })
})

# 3. /api/meta
$null = $rows.Add(@{
  label  = '/api/meta        (filter lists)'
  result = (Probe-Http -Url 'http://127.0.0.1:4000/api/meta' -Validate {
    param($resp)
    try {
      $j = $resp.Content | ConvertFrom-Json
      if (-not $j.models -or $j.models.Count -lt 1) { return 'no models in /api/meta  (claims collection empty?)' }
      return $null
    } catch { return "could not parse meta JSON: $($_.Exception.Message)" }
  })
})

# 4. /api/manual
$null = $rows.Add(@{
  label  = '/api/manual      (9 sections)'
  result = (Probe-Http -Url 'http://127.0.0.1:4000/api/manual' -Validate {
    param($resp)
    try {
      $j = $resp.Content | ConvertFrom-Json
      if (-not $j.items -or $j.items.Count -lt 9) { return "expected >=9 manual sections, got $($j.items.Count)" }
      return $null
    } catch { return "could not parse manual JSON: $($_.Exception.Message)" }
  })
})

# 5. /api/analytics/kpis
$null = $rows.Add(@{
  label  = '/api/analytics/kpis'
  result = (Probe-Http -Url 'http://127.0.0.1:4000/api/analytics/kpis' -Validate {
    param($resp)
    try {
      $j = $resp.Content | ConvertFrom-Json
      if ($null -eq $j.total) { return 'kpis response missing .total field' }
      return $null
    } catch { return "could not parse kpis JSON: $($_.Exception.Message)" }
  })
})

# 6. Vite dev server :5173
$null = $rows.Add(@{
  label  = 'Vite dev server  :5173'
  result = (Probe-Http -Url 'http://127.0.0.1:5173/' -Validate {
    param($resp)
    if ($resp.Content -notmatch 'WTY|<div id="root"') { return 'Vite did not return the dev SPA shell' }
    return $null
  })
})

# 7. Vite proxy: /api/health via :5173 (proves the proxy is wired)
$null = $rows.Add(@{
  label  = 'Vite proxy       /api/health via :5173'
  result = (Probe-Http -Url 'http://127.0.0.1:5173/api/health' -Validate {
    param($resp)
    try {
      $j = $resp.Content | ConvertFrom-Json
      if (-not $j.ok) { return 'proxied health responded ok=false' }
      return $null
    } catch { return 'Vite did not proxy /api to backend  (check vite.config.ts proxy)' }
  })
})

$fails = Render-Table -Title 'WTY :: development verification' -Mode 'development' -Rows $rows
if ($fails -gt 0) { exit 1 } else { exit 0 }
