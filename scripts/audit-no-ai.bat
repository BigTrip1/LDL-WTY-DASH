@echo off
setlocal EnableDelayedExpansion
REM Put Windows system commands at the front of PATH. Protects us from
REM being launched from a git-bash terminal whose PATH would otherwise
REM shadow find.exe / findstr.exe with Unix ports (the Unix find walks
REM the whole drive and hangs indefinitely).
set "PATH=%SystemRoot%\System32;%SystemRoot%;%PATH%"
title WTY :: AI-free dependency audit

REM ============================================================
REM  WTY - AI-free dependency audit
REM
REM  Re-confirms that no AI / LLM dependency has crept into the
REM  source tree. Greps the repo (excluding node_modules, dist,
REM  archives, lock files) for every major AI / LLM vendor and
REM  framework name. A pass = zero hits.
REM
REM  Uses ripgrep (rg) if present, falls back to PowerShell's
REM  Select-String otherwise (built into every Windows 10/11
REM  install, no external tool required).
REM
REM  Run before every release that ships into the air-gapped
REM  customer environment.
REM ============================================================

cd /d "%~dp0\.."
REM No trailing backslash: a quoted "C:\path\" trips PowerShell's argument
REM parser (the closing slash escapes the quote). The .ps1 callee trims any
REM trailing slash itself.
set "ROOT=%CD%"

echo.
echo  +-----------------------------------------------------------+
echo  ^|  WTY - AI / LLM dependency audit                          ^|
echo  +-----------------------------------------------------------+
echo.

REM -------- Tool selection: prefer ripgrep, fall back to ps -----
set "USE_RG=0"
where rg >nul 2>&1 && set "USE_RG=1"
if "!USE_RG!"=="1" (
  for /f "tokens=2" %%V in ('rg --version 2^>nul ^| findstr /B "ripgrep"') do set "RGV=%%V"
  echo [ok]    scanner   : ripgrep v!RGV!
) else (
  echo [info]  scanner   : PowerShell Select-String ^(ripgrep not on PATH^)
)

REM -------- Vendor + framework term list -------------------------
REM Updated May-2026: covers 2024-2026 vendors and modern
REM inference frameworks. Add new ones to this list.
set "TERMS=openai anthropic gemini palm bard cohere mistral mixtral huggingface vertexai bedrock azure-openai gpt-3 gpt-4 gpt-5 llama llama2 llama3 claude langchain llamaindex transformers tensorflow keras onnxruntime replicate together-ai groq xai grok deepseek qwen perplexity stability-ai stable-diffusion ollama vllm sentence-transformers spacy nltk fasttext gensim"

REM -------- Set of source-file extensions we care about ---------
set "EXTS=.ts,.tsx,.js,.mjs,.cjs,.py,.json"

set "FOUND=0"
echo.
echo Scanning source files for vendor / framework references...
echo   ^(extensions: %EXTS%   excludes: node_modules / dist / archives / build / lock files^)
echo.

if "!USE_RG!"=="1" goto :rg_scan

REM ============================================================
REM   PowerShell scanner branch (no external tools needed)
REM ============================================================
REM Delegate the heavy lifting to scripts\audit-no-ai.ps1 - cmd's
REM line-continuation parser eats too many quotes when the script
REM is more than a few lines. Keeping the PS in a sidecar .ps1 also
REM lets us edit it with proper syntax highlighting.
set "TMPHITS=%TEMP%\wty_audit_hits.txt"
del "!TMPHITS!" >nul 2>&1

REM Wrap %TERMS% in double quotes so the 35+ space-separated tokens reach
REM PowerShell as a single argument instead of N positional ones.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0audit-no-ai.ps1" -Root "%ROOT%" -TermList "%TERMS%" > "!TMPHITS!" 2>&1

type "!TMPHITS!"
REM Use the explicit Windows find.exe path - if the script is launched from a
REM git-bash terminal, /usr/bin/find is on PATH and will be invoked instead,
REM which then tries to walk the whole drive (including C:\$Recycle.Bin) and
REM hangs indefinitely.
for /f %%C in ('type "!TMPHITS!" ^| %SystemRoot%\System32\find.exe /c "[HIT]"') do set /a FOUND=%%C
del "!TMPHITS!" >nul 2>&1
goto :final_verdict

REM ============================================================
REM   ripgrep scanner branch (fast path)
REM ============================================================
:rg_scan
for %%T in (%TERMS%) do (
  for /f "delims=" %%F in ('rg -li ^
    --type-add "src:*.{ts,tsx,js,mjs,cjs,py,json}" -t src ^
    -g "!node_modules" -g "!dist" -g "!archives" -g "!build" -g "!.audit" -g "!.git" ^
    -g "!package-lock.json" -g "!pnpm-lock.yaml" -g "!yarn.lock" ^
    -w "%%T" 2^>nul') do (
    echo   [HIT]  %%T  in  %%F
    set /a FOUND+=1
  )
)

REM ============================================================
REM   Final verdict
REM ============================================================
:final_verdict
echo.
if !FOUND! gtr 0 (
  echo  +-----------------------------------------------------------+
  echo  ^|  WARNING: !FOUND! source-code hit^(s^) above. Investigate.   ^|
  echo  ^|  Some hits are expected ^(see docs/AI-FREE-OPERATION.md   ^|
  echo  ^|  for the curated list of known false positives^).         ^|
  echo  +-----------------------------------------------------------+
  exit /b 1
) else (
  echo  +-----------------------------------------------------------+
  echo  ^|  PASS: zero AI / LLM references in source code.           ^|
  echo  ^|  See docs/AI-FREE-OPERATION.md for the full audit.        ^|
  echo  +-----------------------------------------------------------+
)
exit /b 0
