@echo off
setlocal EnableDelayedExpansion
REM Put Windows system commands at the front of PATH. Protects us from
REM being launched from a git-bash terminal whose PATH would otherwise
REM shadow timeout.exe, find.exe, findstr.exe, etc. with Unix ports.
set "PATH=%SystemRoot%\System32;%SystemRoot%;%PATH%"
title WTY :: launcher (production)

REM ================================================================
REM  WTY - Warranty Telehandler Yard
REM  start-prod.bat
REM
REM  Builds frontend + backend (or reuses existing dist/) and launches
REM  MongoDB + the production Node server. The backend serves the
REM  built frontend on the same :4000 port - one process to manage.
REM
REM  Usage:
REM    start-prod.bat                 reuse existing dist if present
REM    start-prod.bat --rebuild       force a fresh build first
REM    start-prod.bat -r              same
REM ================================================================

set "ROOT=%~dp0"
cd /d "%ROOT%"

echo.
echo  +-----------------------------------------------------------+
echo  ^|  WTY - PRODUCTION mode                                    ^|
echo  ^|  Build front+back, then Mongo + Node server (no Vite)     ^|
echo  ^|  --rebuild ^| -r to force a fresh build                    ^|
echo  +-----------------------------------------------------------+
echo.

REM ----------- 1. Sanity checks ----------------------------------
where node >nul 2>&1 || (echo [error] Node.js not found in PATH. Install Node 20+ and try again. & pause & exit /b 1)
where npm  >nul 2>&1 || (echo [error] npm not found in PATH.                                          & pause & exit /b 1)

for /f "tokens=*" %%V in ('node -v 2^>nul') do set "NODEV=%%V"
for /f "tokens=*" %%V in ('npm -v 2^>nul')  do set "NPMV=%%V"
echo [ok]    node      : %NODEV%   npm: %NPMV%

set "MONGOD="
for %%V in (8.0 7.0 6.0) do (
  if exist "C:\Program Files\MongoDB\Server\%%V\bin\mongod.exe" set "MONGOD=C:\Program Files\MongoDB\Server\%%V\bin\mongod.exe"
)
if "!MONGOD!"=="" (
  where mongod >nul 2>&1 && for /f "delims=" %%I in ('where mongod') do set "MONGOD=%%I"
)
netstat -ano | findstr /R /C:":27017 .*LISTENING" >nul
if errorlevel 1 (
  if "!MONGOD!"=="" (
    echo [error] mongod.exe not found and nothing is listening on :27017.
    echo         Install MongoDB Community ^(6.0 / 7.0 / 8.0^) or start the Windows service.
    pause & exit /b 1
  )
  echo [ok]    mongod    : !MONGOD!
) else (
  echo [ok]    mongo     : already listening on :27017
)

if not exist "%ROOT%mongo-data" mkdir "%ROOT%mongo-data"

REM ----------- 2. Free stale prod port ---------------------------
echo.
echo [info] cleaning stale listener on :4000 ^(if any^)...
set "FREED=0"
for /f "tokens=5" %%I in ('netstat -ano ^| findstr /R /C:":4000 .*LISTENING" 2^>nul') do (
  taskkill /F /PID %%I >nul 2>&1 && (echo   [kill] PID %%I on :4000 & set /a FREED+=1)
)
if "!FREED!"=="0" echo   [ok]   port 4000 already free

REM ----------- 3. npm install if needed --------------------------
if not exist "%ROOT%backend\node_modules\" (
  echo [info] backend  : installing dependencies ^(first run^)...
  pushd "%ROOT%backend" & call npm install --no-audit --no-fund || (popd & echo [error] backend npm install failed & pause & exit /b 1) & popd
)
if not exist "%ROOT%frontend\node_modules\" (
  echo [info] frontend : installing dependencies ^(first run^)...
  pushd "%ROOT%frontend" & call npm install --no-audit --no-fund || (popd & echo [error] frontend npm install failed & pause & exit /b 1) & popd
)

REM ----------- 4. Force-rebuild flag -----------------------------
set "FORCE_REBUILD=0"
if /I "%~1"=="--rebuild" set "FORCE_REBUILD=1"
if /I "%~1"=="-r"        set "FORCE_REBUILD=1"

REM ----------- 5. Build frontend ---------------------------------
if "!FORCE_REBUILD!"=="1" if exist "%ROOT%frontend\dist" rmdir /s /q "%ROOT%frontend\dist"

if not exist "%ROOT%frontend\dist\index.html" (
  echo [info] frontend : building production bundle ^(vite build^)...
  pushd "%ROOT%frontend"
  call npm run build
  if errorlevel 1 (popd & echo [error] frontend build failed & pause & exit /b 1)
  popd
) else (
  echo [ok]    frontend : dist/ exists ^(pass --rebuild to force a rebuild^)
)

REM ----------- 6. Build backend ----------------------------------
if "!FORCE_REBUILD!"=="1" if exist "%ROOT%backend\dist" rmdir /s /q "%ROOT%backend\dist"

if not exist "%ROOT%backend\dist\index.js" (
  echo [info] backend  : compiling TypeScript ^(tsc^)...
  pushd "%ROOT%backend"
  call npm run build
  if errorlevel 1 (popd & echo [error] backend build failed & pause & exit /b 1)
  popd
) else (
  echo [ok]    backend  : dist/ exists ^(pass --rebuild to force a rebuild^)
)

REM ----------- 7. Show bundle summary ----------------------------
echo.
echo [info] build summary:
for %%F in ("%ROOT%frontend\dist\assets\index-*.js") do (
  for %%S in ("%%F") do echo   frontend bundle: %%~nxF  ^(%%~zS bytes^)
)
for %%F in ("%ROOT%backend\dist\index.js") do (
  echo   backend  bundle: %%~nxF  ^(%%~zF bytes^)
)

REM ----------- 8. Mongo not already listening? -------------------
REM Re-strip any trailing backslash from %ROOT% so helper args are clean.
set "ROOT_NS=%ROOT%"
if "%ROOT_NS:~-1%"=="\" set "ROOT_NS=%ROOT_NS:~0,-1%"

netstat -ano | findstr /R /C:":27017 .*LISTENING" >nul
if errorlevel 1 (
  echo [info] mongo    : starting on :27017
  start "WTY :: MongoDB" cmd /k ""%~dp0scripts\_run-mongod.bat" "!MONGOD!" "%ROOT_NS%\mongo-data""
  set "MREADY=0"
  for /l %%I in (1,1,15) do (
    if "!MREADY!"=="0" (
      netstat -ano | findstr /R /C:":27017 .*LISTENING" >nul && set "MREADY=1"
      if "!MREADY!"=="0" ping -n 2 127.0.0.1 >nul
    )
  )
)

REM ----------- 9. Backend (production) ---------------------------
echo [info] server   : starting Node on :4000 ^(serves API + frontend^)
start "WTY :: Server (prod)" cmd /k ""%~dp0scripts\_run-prod-server.bat" "%ROOT_NS%""

REM ----------- 10. Wait for /api/health to respond ---------------
REM ping is used instead of `timeout` because timeout aborts noisily when
REM stdin isn't an interactive console (Task Scheduler, ssh, etc.).
echo [info] waiting for server health endpoint...
set "READY=0"
for /l %%I in (1,1,45) do (
  if "!READY!"=="0" (
    powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -Uri http://localhost:4000/api/health -TimeoutSec 1).StatusCode } catch { 0 }" > "%TEMP%\wty_ready.txt" 2>nul
    set /p HC=<"%TEMP%\wty_ready.txt"
    if "!HC!"=="200" set "READY=1"
    if "!READY!"=="0" ping -n 2 127.0.0.1 >nul
  )
)
del "%TEMP%\wty_ready.txt" >nul 2>&1

if "!READY!"=="1" (
  echo [ok]    server   : ready, running production verification...
  echo.
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\_verify-prod.ps1"
  if errorlevel 1 (
    echo.
    echo  +-----------------------------------------------------------+
    echo  ^|  [error] PRODUCTION verification FAILED.                  ^|
    echo  ^|  The WTY :: Server ^(prod^) window is still open so you     ^|
    echo  ^|  can read the server log. Fix the failing check^(s^) above  ^|
    echo  ^|  and re-run start-prod.bat.                               ^|
    echo  +-----------------------------------------------------------+
    pause
    exit /b 1
  )
  echo [ok]    verification passed - opening browser
  start "" "http://localhost:4000/"
) else (
  echo [warn]  server   : did not respond after 45s, open http://localhost:4000/ manually
  echo          ^(skipping verification; see WTY :: Server ^(prod^) window for the error^)
)

echo.
echo  +-----------------------------------------------------------+
echo  ^|  Production stack is up. 2 terminal windows opened:       ^|
echo  ^|    - WTY :: MongoDB     ^(if not already a service^)        ^|
echo  ^|    - WTY :: Server  (prod)                                ^|
echo  ^|                                                           ^|
echo  ^|  App      : http://localhost:4000/                        ^|
echo  ^|  Report   : http://localhost:4000/report                  ^|
echo  ^|  Manual   : http://localhost:4000/manual                  ^|
echo  ^|  Admin    : http://localhost:4000/admin                   ^|
echo  ^|                                                           ^|
echo  ^|  Tip: re-run with  start-prod.bat --rebuild               ^|
echo  ^|      to force a fresh build before launch.                ^|
echo  ^|  To stop everything, run stop.bat                         ^|
echo  +-----------------------------------------------------------+
echo.
pause
