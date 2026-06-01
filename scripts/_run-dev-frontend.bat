@echo off
REM ============================================================
REM  WTY :: helper - run the Vite dev frontend
REM
REM  Invoked by start-dev.bat via `start "..." cmd /k` so it lives
REM  in its own visible terminal window.
REM
REM  Args:
REM    %1  Repo root (no trailing backslash)
REM ============================================================
set "PATH=%SystemRoot%\System32;%SystemRoot%;%PATH%"
title WTY :: Frontend (dev)

if "%~1"=="" (
  echo [error] _run-dev-frontend.bat: missing repo root argument
  pause
  exit /b 1
)

pushd "%~1\frontend"

REM DEVELOPMENT FRONTEND identity banner.
echo.
echo  +======================================================+
echo  ^|            WTY :: DEVELOPMENT FRONTEND               ^|
echo  +======================================================+
echo  ^|  Mode     : Vite dev server  ^(HMR enabled^)           ^|
echo  ^|  Port     : 5173                                     ^|
echo  ^|  Backend  : separate dev window on :4000             ^|
echo  ^|  cwd      : %CD%
echo  +======================================================+
echo.
echo Starting Vite dev server...
echo.

call npm run dev
set "EXITCODE=%ERRORLEVEL%"

popd

echo.
if not "%EXITCODE%"=="0" (
  echo  Vite dev server exited with code %EXITCODE%.
) else (
  echo  Vite dev server exited cleanly.
)
echo.
pause
