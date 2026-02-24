@echo off
setlocal

set "ERR=0"

echo [CHECK] JS syntax
node --check web-dist\assets\js\app.js || set "ERR=1"
node --check web-dist\assets\js\api.js || set "ERR=1"
node --check api\server.js || set "ERR=1"
node --check api\src\handler.js || set "ERR=1"

echo [CHECK] CORS origin list
powershell -NoProfile -Command "$c=Get-Content 'api/src/config.js' -Raw; if(($c -match 'https://puzzle\.monosaccharide180\.com') -and ($c -match 'https://puzzle2\.monosaccharide180\.com')) { exit 0 } else { exit 1 }"
if errorlevel 1 (
  echo [FAIL] Missing required production origins in api/src/config.js
  set "ERR=1"
)

if "%ERR%"=="0" (
  echo [PASS] Preflight checks passed.
  exit /b 0
)

echo [FAIL] Preflight checks failed.
exit /b 1
