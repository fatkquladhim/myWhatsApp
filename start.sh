#!/bin/bash

echo "🚀 WhatsApp Clone - Quick Start Script"
echo "=================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js v18 or higher."
    echo "📥 Download: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node --version) found"

# Check if Bun is installed
if ! command -v bun &> /dev/null; then
    echo "⚠️  Bun not found. Using npm instead..."
    PKG_MANAGER="npm"
else
    echo "✅ Bun $(bun --version) found"
    PKG_MANAGER="bun"
fi

# Install frontend dependencies
echo ""
echo "📦 Installing frontend dependencies..."
if [ "$PKG_MANAGER" = "bun" ]; then
    bun install
else
    npm install
fi

# Install backend dependencies
echo ""
echo "📦 Installing backend dependencies..."
cd whatsapp-backend
if [ "$PKG_MANAGER" = "bun" ]; then
    bun install
else
    npm install
fi
cd ..

# Check if .env files exist
if [ ! -f "whatsapp-backend/.env" ]; then
    echo ""
    echo "⚙️  Creating backend .env file..."
    cat > whatsapp-backend/.env << EOF
JWT_SECRET=whatsapp_jwt_secret_2025_dev
MONGODB_URI=mongodb+srv://fatquladhim_db_user:7VQTMQOVeRbtZZHb@chatappdb.y8judkz.mongodb.net/?appName=chatAppDB
PORT=5000
NODE_ENV=development
USE_MONGODB=true
EOF
    echo "✅ Backend .env file created"
fi

if [ ! -f ".env.local" ]; then
    echo ""
    echo "⚙️  Creating frontend .env.local file..."
    cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
EOF
    echo "✅ Frontend .env.local file created"
fi

echo ""
echo "🎉 Setup completed!"
echo ""
echo "🚀 Starting application..."
echo ""

# Start backend in background
echo "📡 Starting backend server..."
cd whatsapp-backend
node server-hybrid.js > backend-hybrid.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Check if backend started successfully
if curl -s http://localhost:5000/api/auth/me > /dev/null 2>&1; then
    echo "✅ Backend server started successfully (PID: $BACKEND_PID)"
else
    echo "❌ Backend server failed to start. Check whatsapp-backend/backend-hybrid.log"
    tail -10 whatsapp-backend/backend-hybrid.log
    exit 1
fi

# Start frontend
echo "🌐 Starting frontend server..."
if [ "$PKG_MANAGER" = "bun" ]; then
    bun run dev > dev.log 2>&1 &
    FRONTEND_PID=$!
else
    npm run dev > dev.log 2>&1 &
    FRONTEND_PID=$!
fi

# Wait for frontend to start
sleep 5

# Check if frontend started successfully
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend server started successfully (PID: $FRONTEND_PID)"
else
    echo "❌ Frontend server failed to start. Check dev.log"
    tail -10 dev.log
    exit 1
fi

echo ""
echo "🎊 WhatsApp Clone is now running!"
echo "=================================="
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "📡 Backend:  http://localhost:5000/api"
echo ""
echo "📱 Test Users:"
echo "User 1: user1@test.com / password123"
echo "User 2: user2@test.com / password123"
echo ""
echo "🛑 To stop servers:"
echo "kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "📖 Logs:"
echo "Backend: tail -f whatsapp-backend/backend-hybrid.log"
echo "Frontend: tail -f dev.log"
echo ""
echo "🎉 Happy chatting!"