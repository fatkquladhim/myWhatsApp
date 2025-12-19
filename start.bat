@echo off
echo  WhatsApp Clone - Quick Start Script
echo ==================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js v18 or higher.
    echo 📥 Download: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js found
node --version

REM Check if Bun is installed
bun --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Bun not found. Using npm instead...
    set PKG_MANAGER=npm
) else (
    echo ✅ Bun found
    bun --version
    set PKG_MANAGER=bun
)

REM Install frontend dependencies
echo.
echo 📦 Installing frontend dependencies...
if "%PKG_MANAGER%"=="bun" (
    bun install
) else (
    npm install
)

REM Install backend dependencies
echo.
echo 📦 Installing backend dependencies...
cd whatsapp-backend
if "%PKG_MANAGER%"=="bun" (
    bun install
) else (
    npm install
)
cd ..

REM Check if .env files exist
if not exist "whatsapp-backend\.env" (
    echo.
    echo ⚙️  Creating backend .env file...
    (
        echo JWT_SECRET=whatsapp_jwt_secret_2025_dev
        echo MONGODB_URI=mongodb+srv://fatquladhim_db_user:7VQTMQOVeRbtZZHb@chatappdb.y8judkz.mongodb.net/?appName=chatAppDB
        echo PORT=5000
        echo NODE_ENV=development
        echo USE_MONGODB=true
    ) > whatsapp-backend\.env
    echo ✅ Backend .env file created
)

if not exist ".env.local" (
    echo.
    echo ⚙️  Creating frontend .env.local file...
    (
        echo NEXT_PUBLIC_API_URL=http://localhost:5000/api
        echo NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
    ) > .env.local
    echo ✅ Frontend .env.local file created
)

echo.
echo  Setup completed!
echo.
echo  Starting application...
echo.

REM Start backend in background
echo  Starting backend server...
cd whatsapp-backend
start /B cmd /c "node server-hybrid.js > backend-hybrid.log 2>&1"
cd ..

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend
echo  Starting frontend server...
if "%PKG_MANAGER%"=="bun" (
    start /B cmd /c "bun run dev > dev.log 2>&1"
) else (
    start /B cmd /c "npm run dev > dev.log 2>&1"
)

REM Wait for frontend to start
timeout /t 5 /nobreak >nul

echo.
echo  WhatsApp Clone is now running!
echo ==================================
echo.
echo  Frontend: http://localhost:3000
echo  Backend:  http://localhost:5000/api
echo.
echo  Test Users:
echo User 1: user1@test.com / password123
echo User 2: user2@test.com / password123
echo.
echo  To stop servers: Close the command windows
echo.
echo 📖 Logs: Check backend-hybrid.log and dev.log files
echo.
echo  Happy chatting!
pause