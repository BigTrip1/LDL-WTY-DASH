@echo off
REM ============================================================
REM  WTY :: helper - run the dev backend (tsx watch)
REM
REM  Invoked by start-dev.bat via `start "..." cmd /k` so it lives
REM  in its own visible terminal window.
REM
REM  Args:
REM    %1  Repo root (no trailing backslash)
REM ============================================================
set "PATH=%SystemRoot%\System32;%SystemRoot%;%PATH%"
title WTY :: Backend (dev)

if "%~1"=="" (
  echo [error] _run-dev-backend.bat: missing repo root argument
  pause
  exit /b 1
)

pushd "%~1\backend"

REM DEVELOPMENT identity banner.
echo.
echo  +======================================================+
echo  ^|            WTY :: DEVELOPMENT BACKEND                ^|
echo  +======================================================+
echo  ^|  NODE_ENV : development                              ^|
echo  ^|  Port     : 4000  ^(API only - no built frontend^)     ^|
echo  ^|  Watcher  : tsx watch  ^(live reload on src/ change^)  ^|
echo  ^|  Frontend : separate Vite window on :5173            ^|
echo  ^|  cwd      : %CD%
echo  +======================================================+
echo.
echo Starting backend in tsx watch mode...
echo.

call npm run dev
set "EXITCODE=%ERRORLEVEL%"

popd

echo.
if not "%EXITCODE%"=="0" (
  echo  Dev backend exited with code %EXITCODE%.
) else (
  echo  Dev backend exited cleanly.
)
echo.
pause
