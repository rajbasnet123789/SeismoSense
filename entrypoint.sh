#!/bin/sh
set -e

echo "================================================"
echo "  SeismoSense — Starting services"
echo "================================================"

# Initialize database tables
echo "[1/3] Initializing database..."
python -c "
import sys
sys.path.insert(0, '/app')
from backend.db.connection import init_db
init_db()
print('  Database tables ready')
"

# Start backend (uvicorn) in background
echo "[2/3] Starting API backend on port 8000..."
cd /app
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --log-level info &
BACKEND_PID=$!

# Start frontend (Next.js) in background
echo "[3/3] Starting frontend on port 3000..."
cd /app/frontend
PORT=3000 npx next start -p 3000 &
FRONTEND_PID=$!

echo "================================================"
echo "  Backend:  http://localhost:8000"
echo "  Frontend: http://localhost:3000"
echo "  API docs: http://localhost:8000/docs"
echo "================================================"

# Trap signals and forward to children
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGTERM SIGINT

# Wait for either process to exit
wait -n $BACKEND_PID $FRONTEND_PID 2>/dev/null

# If one exited, kill the other
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
exit 1
