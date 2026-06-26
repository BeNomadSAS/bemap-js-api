@echo off
REM ===========================================================================
REM  BeMap JS API - start the demo dashboard locally (Windows, double-click).
REM  Serves the folder over http://localhost and opens the dashboard. You can't
REM  just open index.html from disk - browsers block fetch / Service Workers /
REM  map tiles on file://.   Requires Node.js: https://nodejs.org
REM  This window STAYS OPEN while the server runs - Ctrl-C / close it to stop.
REM ===========================================================================
title BeMap dashboard - http://localhost:8080/examples/

REM If a server is ALREADY running on port 8080, the dashboard is already live -
REM just open the browser to it (avoids the EADDRINUSE crash + a duplicate server).
netstat -ano 2>nul | findstr "LISTENING" | findstr ":8080 " >nul 2>&1
if not errorlevel 1 (
  echo A server is already running on port 8080.
  echo Opening the dashboard:  http://localhost:8080/examples/
  start "" "http://localhost:8080/examples/"
  echo.
  echo Want a FRESH server instead? Stop the other one first - close its
  echo window, or run:   npx kill-port 8080
  echo.
  pause
  exit /b 0
)

echo Starting the BeMap dashboard at http://localhost:8080/examples/ ...
echo Keep this window open while the server runs.  Press Ctrl-C to stop.
echo.

REM "call" is REQUIRED: npx is a .cmd; without it this window would close the
REM instant the server stops/fails instead of running the lines below.
call npx --yes http-server -p 8080 -o /examples/

echo.
echo ============================================================================
echo  The server stopped, or could not start. Read the messages above:
echo    - "EADDRINUSE / already in use": a server is ALREADY running, so just
echo      open   http://localhost:8080/examples/    or run  npx kill-port 8080
echo    - "npx is not recognized": install Node.js from https://nodejs.org , or
echo      use   python -m http.server 8080    then open the URL above.
echo ============================================================================
echo.
pause
