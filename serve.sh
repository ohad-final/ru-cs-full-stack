#!/bin/bash

# HTTP & Browser Presentation Server
# Usage: ./serve.sh [port]

PORT=${1:-8080}
DIR="$(cd "$(dirname "$0")" && pwd)"

echo "🌐 HTTP & Browser Presentation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Kill any existing server on this port
if lsof -ti:$PORT > /dev/null 2>&1; then
    echo "⚠️  Stopping existing server on port $PORT..."
    kill -9 $(lsof -ti:$PORT) 2>/dev/null
    sleep 1
fi

echo "🚀 Starting server..."
echo "📂 Directory: $DIR"
echo "🔗 URL: http://localhost:$PORT"
echo ""
echo "Press Ctrl+C to stop the server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$DIR"
python3 -m http.server $PORT
