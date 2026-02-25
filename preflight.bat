@echo off
setlocal

set "ERR=0"

echo [CHECK] JS syntax (web)
for /R web-dist\assets\js %%F in (*.js) do (
  node --check "%%F" || (
    echo [FAIL] Syntax error: %%F
    set "ERR=1"
  )
)

echo [CHECK] JS syntax (api)
node --check api\server.js || set "ERR=1"
for /R api\src %%F in (*.js) do (
  node --check "%%F" || (
    echo [FAIL] Syntax error: %%F
    set "ERR=1"
  )
)

echo [CHECK] CORS origin list
powershell -NoProfile -Command "$c=Get-Content 'api/src/config.js' -Raw; if(($c -match 'https://puzzle\.monosaccharide180\.com') -and ($c -match 'https://puzzle2\.monosaccharide180\.com')) { exit 0 } else { exit 1 }"
if errorlevel 1 (
  echo [FAIL] Missing required production origins in api/src/config.js
  set "ERR=1"
)

echo [CHECK] .env.example token placeholder
powershell -NoProfile -Command "$c=Get-Content '.env.example' -Raw; if(($c -match 'replace-with-your-cloudflare-tunnel-token') -and -not ($c -match 'eyJ[A-Za-z0-9_-]{20,}')) { exit 0 } else { exit 1 }"
if errorlevel 1 (
  echo [FAIL] .env.example appears to contain a real token
  set "ERR=1"
)

echo [CHECK] Picross solution not exposed in daily puzzle payload
powershell -NoProfile -Command "$c=Get-Content 'api/src/puzzles.js' -Raw; if($c -match 'puzzle:\s*\{[^}]*solution:\s*picross\.solution') { exit 1 } else { exit 0 }"
if errorlevel 1 (
  echo [FAIL] api/src/puzzles.js still exposes picross.solution in puzzle payload
  set "ERR=1"
)

if "%ERR%"=="0" (
  echo [PASS] Preflight checks passed.
  exit /b 0
)

echo [FAIL] Preflight checks failed.
exit /b 1
