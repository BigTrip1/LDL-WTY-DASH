#requires -version 5.0
<#
.SYNOPSIS
  Verify that the WTY production stack is fully up.
.DESCRIPTION
  Probes 7 services / endpoints and renders a compact pass/fail table.
  Asserts that /api/health reports mode == 'production'. Exits 1 on any
  failure so the parent .bat can abort the launch.

  Probes:
    1. MongoDB :27017 (raw TCP)
    2. GET /api/health   - asserts JSON .ok and .mode == 'production'
    3. GET /api/meta     - asserts JSON has .models and .customers arrays
    4. GET /api/manual   - asserts JSON .items count >= 9
    5. GET /api/analytics/kpis - asserts JSON has a .total field
    6. GET /            - asserts HTML contains <title>WTY
    7. GET /manual      - asserts the SPA serves the same shell
#>

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\_verify-common.ps1"

$rows = [System.Collections.ArrayList]@()

# 1. MongoDB raw TCP
$null = $rows.Add(@{ label = 'MongoDB         :27017'; result = (Probe-Tcp '127.0.0.1' 27017) })

# 2. /api/health - the mode assertion
$null = $rows.Add(@{
  label  = '/api/health      (mode=prod)'
  result = (Probe-Http -Url 'http://127.0.0.1:4000/api/health' -Validate {
    param($resp)
    try {
      $j = $resp.Content | ConvertFrom-Json
      if (-not $j.ok)              { return 'health responded ok=false' }
      if ($j.mode -ne 'production'){ return "expected mode='production' got '$($j.mode)'" }
      if (-not $j.frontendDistServed){ return 'frontendDistServed=false  (run start-prod.bat --rebuild)' }
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
      if (-not $j.models -or $j.models.Count -lt 1)     { return 'no models in /api/meta  (claims collection empty?)' }
      if (-not $j.customers)                            { return 'no customers in /api/meta' }
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

# 6. /  (Dashboard SPA shell)
$null = $rows.Add(@{
  label  = '/                (Dashboard SPA)'
  result = (Probe-Http -Url 'http://127.0.0.1:4000/' -Validate {
    param($resp)
    if ($resp.Content -notmatch '<title>WTY') { return 'SPA shell missing <title>WTY  (frontend dist not served?)' }
    return $null
  })
})

# 7. /manual (SPA route - must also be served by the SPA fallback)
$null = $rows.Add(@{
  label  = '/manual          (SPA fallback)'
  result = (Probe-Http -Url 'http://127.0.0.1:4000/manual' -Validate {
    param($resp)
    if ($resp.Content -notmatch '<title>WTY') { return '/manual did not return the SPA shell' }
    return $null
  })
})

$fails = Render-Table -Title 'WTY :: production verification' -Mode 'production' -Rows $rows
if ($fails -gt 0) { exit 1 } else { exit 0 }
