@echo off
REM ============================================================
REM  WTY :: helper - run the local mongod
REM
REM  Invoked by start-dev.bat / start-prod.bat via `start "..." cmd /k`
REM  so it lives in its own visible terminal window.
REM
REM  Args:
REM    %1  Full path to mongod.exe
REM    %2  Full path to the dbpath directory (no trailing backslash)
REM ============================================================
set "PATH=%SystemRoot%\System32;%SystemRoot%;%PATH%"
title WTY :: MongoDB

if "%~1"=="" (
  echo [error] _run-mongod.bat: missing mongod path
  pause
  exit /b 1
)
if "%~2"=="" (
  echo [error] _run-mongod.bat: missing dbpath
  pause
  exit /b 1
)

echo Starting mongod on :27017 ...
echo   bin    : %~1
echo   dbpath : %~2
echo.

"%~1" --dbpath "%~2" --bind_ip 127.0.0.1 --port 27017

REM If mongod ever exits, KEEP THE WINDOW OPEN so the user can read why.
echo.
echo  mongod has exited. (Window kept open so you can see any error above.)
pause
