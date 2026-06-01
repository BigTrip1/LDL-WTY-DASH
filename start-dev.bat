@echo off
setlocal EnableDelayedExpansion
REM Put Windows system commands at the front of PATH. Protects us from
REM being launched from a git-bash terminal whose PATH would otherwise
REM shadow timeout.exe, find.exe, findstr.exe, etc. with Unix ports.
set "PATH=%SystemRoot%\System32;%SystemRoot%;%PATH%"
title WTY :: launcher (dev)

REM ================================================================
REM  WTY - Warranty Telehandler Yard
REM  start-dev.bat
REM
REM  Boots MongoDB, the backend (tsx watch on :4000) and the frontend
REM  (Vite dev server on :5173), each in its own visible terminal so
REM  the user can read logs.
REM
REM  Re-running this script is safe: it kills stale :4000 / :5173
REM  listeners first so you never end up with two dev backends.
REM ================================================================

set "ROOT=%~dp0"
cd /d "%ROOT%"

echo.
echo  +-----------------------------------------------------------+
echo  ^|  WTY - DEV mode                                           ^|
echo  ^|  Mongo + Backend (tsx watch) + Frontend (Vite dev)        ^|
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

REM Mongo is optional only when something is already listening on :27017
netstat -ano | findstr /R /C:":27017 .*LISTENING" >nul
if errorlevel 1 (
  if "!MONGOD!"=="" (
    echo [error] mongod.exe not found and nothing is listening on :27017.
    echo         Install MongoDB Community ^(6.0 / 7.0 / 8.0^) or start the Windows service.
    pause & exit /b 1
  )
  echo [ok]    mongod    : !MONGOD!
) else (
  echo [ok]    mongo     : already listening on :27017 ^(Windows service or pre-launched^)
)

if not exist "%ROOT%mongo-data" mkdir "%ROOT%mongo-data"

REM ----------- 2. Free stale dev ports ---------------------------
echo.
echo [info] cleaning stale listeners on :4000 / :5173 ^(if any^)...
set "FREED=0"
for %%P in (4000 5173) do (
  for /f "tokens=5" %%I in ('netstat -ano ^| findstr /R /C:":%%P .*LISTENING" 2^>nul') do (
    taskkill /F /PID %%I >nul 2>&1 && (echo   [kill] PID %%I on :%%P & set /a FREED+=1)
  )
)
if "!FREED!"=="0" echo   [ok]   ports 4000 + 5173 already free

REM ----------- 3. npm install if needed --------------------------
if not exist "%ROOT%backend\node_modules\" (
  echo [info] backend  : installing dependencies ^(first run^)...
  pushd "%ROOT%backend" & call npm install --no-audit --no-fund || (popd & echo [error] backend npm install failed & pause & exit /b 1) & popd
)
if not exist "%ROOT%frontend\node_modules\" (
  echo [info] frontend : installing dependencies ^(first run^)...
  pushd "%ROOT%frontend" & call npm install --no-audit --no-fund || (popd & echo [error] frontend npm install failed & pause & exit /b 1) & popd
)

REM ----------- 4. Mongo not already listening? -------------------
REM Re-strip any trailing backslash from %ROOT% so helper args are clean.
set "ROOT_NS=%ROOT%"
if "%ROOT_NS:~-1%"=="\" set "ROOT_NS=%ROOT_NS:~0,-1%"

netstat -ano | findstr /R /C:":27017 .*LISTENING" >nul
if errorlevel 1 (
  echo [info] mongo    : starting on :27017
  start "WTY :: MongoDB" cmd /k ""%~dp0scripts\_run-mongod.bat" "!MONGOD!" "%ROOT_NS%\mongo-data""
  REM Wait for Mongo to be ready (up to 15s instead of a flat 3s)
  set "MREADY=0"
  for /l %%I in (1,1,15) do (
    if "!MREADY!"=="0" (
      netstat -ano | findstr /R /C:":27017 .*LISTENING" >nul && set "MREADY=1"
      if "!MREADY!"=="0" ping -n 2 127.0.0.1 >nul
    )
  )
  if "!MREADY!"=="1" (echo [ok]   mongo    : listening on :27017) else (echo [warn] mongo    : did not bind in 15s)
)

REM ----------- 5. Backend (tsx watch) ----------------------------
echo [info] backend  : starting on :4000 ^(tsx watch^)
start "WTY :: Backend (dev)" cmd /k ""%~dp0scripts\_run-dev-backend.bat" "%ROOT_NS%""

REM Wait until backend health endpoint answers (up to 30s).
REM ping is used instead of `timeout` because timeout aborts noisily when
REM stdin isn't an interactive console.
echo [info] waiting for backend health endpoint...
set "BREADY=0"
for /l %%I in (1,1,30) do (
  if "!BREADY!"=="0" (
    powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -Uri http://localhost:4000/api/health -TimeoutSec 1).StatusCode } catch { 0 }" > "%TEMP%\wty_ready.txt" 2>nul
    set /p HC=<"%TEMP%\wty_ready.txt"
    if "!HC!"=="200" set "BREADY=1"
    if "!BREADY!"=="0" ping -n 2 127.0.0.1 >nul
  )
)
if "!BREADY!"=="1" (echo [ok]   backend  : healthy on :4000) else (echo [warn] backend  : not healthy after 30s ^(check the WTY :: Backend window^))

REM ----------- 6. Frontend (Vite dev) ----------------------------
echo [info] frontend : starting on :5173 ^(Vite dev^)
start "WTY :: Frontend (dev)" cmd /k ""%~dp0scripts\_run-dev-frontend.bat" "%ROOT_NS%""

REM Wait for Vite to be ready (up to 40s)
echo [info] waiting for Vite...
set "FREADY=0"
for /l %%I in (1,1,40) do (
  if "!FREADY!"=="0" (
    powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing -Uri http://localhost:5173/ -TimeoutSec 1).StatusCode } catch { 0 }" > "%TEMP%\wty_ready.txt" 2>nul
    set /p HC=<"%TEMP%\wty_ready.txt"
    if "!HC!"=="200" set "FREADY=1"
    if "!FREADY!"=="0" ping -n 2 127.0.0.1 >nul
  )
)
del "%TEMP%\wty_ready.txt" >nul 2>&1

if "!FREADY!"=="1" (
  echo [ok]    frontend : ready, running development verification...
  echo.
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\_verify-dev.ps1"
  if errorlevel 1 (
    echo.
    echo  +-----------------------------------------------------------+
    echo  ^|  [error] DEVELOPMENT verification FAILED.                 ^|
    echo  ^|  The dev windows are still open so you can inspect logs.  ^|
    echo  ^|  Fix the failing check^(s^) above and re-run start-dev.bat. ^|
    echo  +-----------------------------------------------------------+
    pause
    exit /b 1
  )
  echo [ok]    verification passed - opening browser
  start "" "http://localhost:5173/"
) else (
  echo [warn]  frontend : did not respond after 40s, open http://localhost:5173/ manually
  echo          ^(skipping verification; see the dev windows for errors^)
)

echo.
echo  +-----------------------------------------------------------+
echo  ^|  Dev stack is up. 3 terminal windows opened:              ^|
echo  ^|    - WTY :: MongoDB   ^(if not already a service^)          ^|
echo  ^|    - WTY :: Backend  (dev)  on :4000                      ^|
echo  ^|    - WTY :: Frontend (dev)  Vite Local + Network URLs     ^|
echo  +-----------------------------------------------------------+
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\_print-access-urls.ps1" -Port 5173 -Label "Dev dashboard (Vite)" -PathList "ROOT,report,manual,admin"
echo  API (backend only, loopback):
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\_print-access-urls.ps1" -Port 4000 -Label "Dev API" -PathList "api/health"
echo  To stop everything, run stop.bat
echo.
pause
