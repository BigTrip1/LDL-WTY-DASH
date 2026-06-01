@echo off
setlocal EnableDelayedExpansion
REM Put Windows system commands at the front of PATH. Protects us from
REM being launched from a git-bash terminal whose PATH would otherwise
REM shadow taskkill.exe, tasklist.exe, netstat.exe, find.exe with Unix ports.
set "PATH=%SystemRoot%\System32;%SystemRoot%;%PATH%"
title WTY :: stop

REM ================================================================
REM  WTY - stop everything launched by start-dev.bat / start-prod.bat
REM
REM  Three-pass cleanup so orphaned processes (windows manually
REM  closed, tsx watchers that re-spawn node children, etc.) are
REM  always caught:
REM    1. Kill by window title.
REM    2. Kill any process still listening on :4000 / :5173.
REM    3. Kill stray tsx.exe processes (the dev backend watcher).
REM
REM  MongoDB is intentionally left alone if it's running as a
REM  Windows service - the script only kills mongod we own.
REM ================================================================

echo.
echo  Stopping WTY processes...
echo.

set "KILLED=0"

REM ----------- 1. Kill by window title ---------------------------
REM taskkill /FI returns 0 even when nothing matched the filter, so we
REM probe with tasklist first to give an accurate stop/skip report.
for %%T in (
  "WTY :: Frontend (dev)"
  "WTY :: Backend (dev)"
  "WTY :: Server (prod)"
  "WTY :: MongoDB"
) do (
  tasklist /FI "WINDOWTITLE eq %%~T" 2>nul | %SystemRoot%\System32\find.exe /I "cmd.exe" >nul
  if errorlevel 1 (
    echo   [skip]  %%~T  ^(not running^)
  ) else (
    taskkill /F /FI "WINDOWTITLE eq %%~T" /T >nul 2>&1
    echo   [stop]  %%~T
    set /a KILLED+=1
  )
)

REM ----------- 2. Kill anything still on :4000 / :5173 -----------
echo.
echo  Releasing dev/prod ports 4000 + 5173 ^(any orphan listeners^)...
set "PORT_KILLED=0"
for %%P in (4000 5173) do (
  for /f "tokens=5" %%I in ('netstat -ano ^| findstr /R /C:":%%P .*LISTENING" 2^>nul') do (
    taskkill /F /PID %%I >nul 2>&1 && (echo   [kill]  PID %%I on :%%P & set /a PORT_KILLED+=1)
  )
)
if "!PORT_KILLED!"=="0" echo   [ok]    ports 4000 + 5173 already free

REM ----------- 3. Kill stray tsx.exe watchers (dev backend) ------
REM tsx watch spawns a child node process; if its window was closed
REM the child can survive. Look for tsx.exe and kill it.
tasklist /FI "IMAGENAME eq tsx.exe" /FO CSV /NH 2>nul | findstr /R /C:"tsx.exe" >nul
if not errorlevel 1 (
  echo.
  echo  Killing stray tsx.exe processes...
  taskkill /F /IM tsx.exe /T >nul 2>&1 && echo   [kill]  tsx.exe ^(dev backend watcher^)
)

REM ----------- 4. Optional: kill local mongod we launched --------
REM Only kills mongod.exe pointed at OUR mongo-data folder, leaving
REM the Windows MongoDB service alone. We detect by command-line.
for /f "skip=1 tokens=2" %%I in ('tasklist /FI "IMAGENAME eq mongod.exe" /FO CSV /NH 2^>nul ^| findstr /R /C:"mongod.exe"') do (
  set "MPID=%%I"
  set "MPID=!MPID:"=!"
  REM Inspect via wmic if available, else just leave it alone
  for /f "tokens=*" %%C in ('wmic process where "ProcessId=!MPID!" get CommandLine /value 2^>nul ^| findstr /R /C:"CommandLine"') do (
    echo %%C | findstr /I /C:"\mongo-data" >nul && (
      taskkill /F /PID !MPID! >nul 2>&1 && echo   [kill]  local mongod ^(PID !MPID!^) - service mongod left running
    )
  )
)

echo.
if "!KILLED!"=="0" if "!PORT_KILLED!"=="0" (
  echo  Nothing to stop. Stack was already down.
) else (
  echo  Done. ^(If MongoDB was started as a Windows service, leave it running.^)
)
echo.

REM Final state check so the user sees confirmation
echo  Current listeners on 4000 / 5173 / 27017:
netstat -ano | findstr /R /C:":4000 .*LISTENING" /C:":5173 .*LISTENING" /C:":27017 .*LISTENING"
if errorlevel 1 echo   ^(none^)

echo.
pause
