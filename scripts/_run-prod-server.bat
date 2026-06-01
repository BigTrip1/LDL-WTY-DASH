@echo off
REM ============================================================
REM  WTY :: helper - run the production Node server
REM
REM  Invoked by start-prod.bat via `start "..." cmd /k` so it lives
REM  in its own visible terminal window. Single, fully-quoted
REM  command - avoids the nested-quote pitfalls of inline spawning.
REM
REM  Args:
REM    %1  Repo root (no trailing backslash)
REM ============================================================
set "PATH=%SystemRoot%\System32;%SystemRoot%;%PATH%"
title WTY :: Server (prod)

if "%~1"=="" (
  echo [error] _run-prod-server.bat: missing repo root argument
  pause
  exit /b 1
)

set "NODE_ENV=production"
pushd "%~1\backend"

REM Big PRODUCTION identity banner so the user can never confuse this with
REM a dev window. Visible the moment the spawned cmd opens, before node
REM starts and before any other output.
echo.
echo  +======================================================+
echo  ^|             WTY :: PRODUCTION SERVER                 ^|
echo  +======================================================+
echo  ^|  NODE_ENV : production                               ^|
echo  ^|  Port     : 4000  ^(API + built frontend SPA^)         ^|
echo  ^|  Vite     : NOT running  ^(this is the prod build^)    ^|
echo  ^|  cwd      : %CD%
echo  ^|  bin      : node dist\index.js                       ^|
echo  +======================================================+
echo.
echo Starting Node production server...
echo.

node dist\index.js
set "EXITCODE=%ERRORLEVEL%"

popd

REM If node ever exits, KEEP THE WINDOW OPEN so the user can read why.
echo.
if not "%EXITCODE%"=="0" (
  echo  Node exited with code %EXITCODE%.
  echo  Common causes:
  echo    - port 4000 already in use ^(run stop.bat^)
  echo    - mongod not reachable on localhost:27017
  echo    - backend\dist\index.js missing ^(run start-prod.bat --rebuild^)
) else (
  echo  Node exited cleanly.
)
echo.
pause
