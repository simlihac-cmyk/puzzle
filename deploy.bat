@echo off
setlocal

set "TARGET=sg_mac@100.74.55.70"
set "DEPLOY_CMD=zsh -lc 'cd ~/puzzle-deploy && cp docker-compose.yml docker-compose.yml.bak && git restore docker-compose.yml && git pull && docker compose up -d && docker compose ps'"
set "STATUS_CMD=zsh -lc 'cd ~/puzzle-deploy && docker compose ps'"
set "LOGS_CMD=zsh -lc 'cd ~/puzzle-deploy && docker compose logs --tail=120 cloudflared'"

echo [DEPLOY] Connecting to %TARGET%
ssh %TARGET% "%DEPLOY_CMD%"
set "RC=%ERRORLEVEL%"

if not "%RC%"=="0" (
  echo.
  echo [DEPLOY] Failed with exit code %RC%.
  echo [DEPLOY] Collecting diagnostics...
  echo.
  echo ===== docker compose ps =====
  ssh %TARGET% "%STATUS_CMD%"
  echo.
  echo ===== cloudflared logs (tail 120) =====
  ssh %TARGET% "%LOGS_CMD%"
  echo.
  pause
  exit /b %RC%
)

echo.
echo [DEPLOY] Completed successfully.
pause
exit /b 0
