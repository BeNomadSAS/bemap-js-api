#!/usr/bin/env bash
# ===========================================================================
#  BeMap JS API - start the demo dashboard locally (macOS / Linux / Git Bash).
#  Run:  ./start.sh   (you may need:  chmod +x start.sh)
#  It serves the folder over http://localhost and opens the dashboard. You
#  can't just open index.html from disk - browsers block fetch / Service
#  Workers / map tiles on file://.
#  Requires Node.js: https://nodejs.org
# ===========================================================================
echo "Starting the BeMap dashboard at http://localhost:8080/examples/ ..."
echo "Press Ctrl-C to stop."
echo
# MSYS_NO_PATHCONV=1 stops Git Bash on Windows from rewriting the "-o /examples/"
# path into a Windows path (e.g. C:/Program Files/Git/examples/). Harmless on
# real macOS/Linux. If your browser still opens the wrong page, just go to
# http://localhost:8080/examples/ manually — the server itself is fine.
if ! MSYS_NO_PATHCONV=1 npx --yes http-server -p 8080 -o /examples/; then
  echo
  echo "Could not start the server."
  echo "  - Make sure Node.js is installed:  https://nodejs.org"
  echo "  - Or use any static server, e.g.:   python3 -m http.server 8080"
  echo "    then open  http://localhost:8080/examples/"
fi
