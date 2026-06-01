@echo off
setlocal EnableDelayedExpansion
REM Put Windows system commands at the front of PATH. Protects us from
REM being launched from a Task Scheduler / git-bash environment whose
REM PATH would otherwise shadow find.exe / findstr.exe with Unix ports.
set "PATH=%SystemRoot%\System32;%SystemRoot%;%PATH%"
title WTY :: weekly report archiver

REM ============================================================
REM  WTY - weekly auto-report
REM
REM  Re-runs scripts/report.py against the standard claims.csv,
REM  writes a date-stamped copy to archives/REPORT-YYYY-MM-DD.md,
REM  and refreshes the canonical REPORT.md mirrors.
REM
REM  Usage:
REM    weekly.bat                         use default CSV
REM    weekly.bat C:\path\to\claims.csv   override the CSV path
REM
REM  Designed to be triggered by Windows Task Scheduler weekly.
REM  All output is also logged to archives/weekly-YYYY-MM-DD.log
REM  so Scheduler runs leave a trail.
REM ============================================================

cd /d "%~dp0\.."
set "ROOT=%CD%\"

REM -------- Date stamp via PowerShell (reliable, no wmic) -------
for /f "delims=" %%D in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd"') do set "STAMP=%%D"
if "!STAMP!"=="" (
  REM Fallback for systems without PowerShell on PATH (rare).
  set "STAMP=unknown-date"
)

REM -------- CSV path (param 1, or default) ----------------------
if "%~1"=="" (
  set "CSV=C:\Users\Vince\Downloads\claims.csv"
) else (
  set "CSV=%~1"
)

if not exist "!CSV!" (
  echo [error] Source CSV not found at "!CSV!".
  echo         Pass the correct path as the first argument, or edit weekly.bat.
  exit /b 1
)

REM -------- Ensure archives/ exists -----------------------------
if not exist "%ROOT%archives" mkdir "%ROOT%archives"
set "OUT=%ROOT%archives\REPORT-!STAMP!.md"
set "LOG=%ROOT%archives\weekly-!STAMP!.log"

echo. > "!LOG!"
echo === WTY weekly auto-report === >> "!LOG!"
echo Date     : !STAMP!             >> "!LOG!"
echo CSV      : !CSV!               >> "!LOG!"
echo Out      : !OUT!               >> "!LOG!"
echo Log      : !LOG!               >> "!LOG!"
echo. >> "!LOG!"

echo.
echo  +-----------------------------------------------------------+
echo  ^|  WTY :: weekly auto-report                                ^|
echo  ^|  Stamp: !STAMP!                                           ^|
echo  ^|  CSV  : !CSV!                                             ^|
echo  ^|  Out  : !OUT!                                             ^|
echo  ^|  Log  : !LOG!                                             ^|
echo  +-----------------------------------------------------------+
echo.

REM -------- Run the report ---------------------------------------
where python >nul 2>&1 || (echo [error] python not found in PATH. Install Python 3.10+ and try again.& exit /b 1)

python "%ROOT%scripts\report.py" "!CSV!" "!OUT!" >> "!LOG!" 2>&1
if errorlevel 1 (
  echo [error] report.py failed. See log: "!LOG!"
  type "!LOG!"
  exit /b 1
)

REM -------- Refresh REPORT.md mirrors so the dashboard ----------
REM "Full report" tab always serves the freshest snapshot.
copy /Y "!OUT!" "%ROOT%REPORT.md" >nul
copy /Y "!OUT!" "%ROOT%docs\REPORT.md" >nul
echo. >> "!LOG!"
echo Mirrored to REPORT.md and docs\REPORT.md >> "!LOG!"

REM -------- Retention: keep last 26 weeks (= 6 months) ----------
REM Old archives are deleted to stop the folder growing without bound.
set "RETAIN=26"
echo. >> "!LOG!"
echo Retention sweep: keeping latest %RETAIN% report copies. >> "!LOG!"
set "IDX=0"
for /f "delims=" %%F in ('dir /b /o-d "%ROOT%archives\REPORT-*.md" 2^>nul') do (
  set /a IDX+=1
  if !IDX! GTR %RETAIN% (
    del "%ROOT%archives\%%F" >nul 2>&1 && echo   [trim] %%F >> "!LOG!"
  )
)
REM Also trim logs older than retention
set "IDX=0"
for /f "delims=" %%F in ('dir /b /o-d "%ROOT%archives\weekly-*.log" 2^>nul') do (
  set /a IDX+=1
  if !IDX! GTR %RETAIN% (
    del "%ROOT%archives\%%F" >nul 2>&1
  )
)

echo.
echo [ok] Wrote "!OUT!"
echo [ok] Refreshed REPORT.md + docs\REPORT.md
echo [ok] Log : "!LOG!"
exit /b 0
