#!/bin/bash

echo "🚀 Starting WhatsApp Clone Demo Setup"
echo "=================================="

# Check if MongoDB is running
echo "📋 Checking MongoDB connection..."
if command -v mongosh &> /dev/null; then
    echo "✅ MongoDB client found"
else
    echo "❌ MongoDB client not found. Please install MongoDB."
    echo "   You can install MongoDB locally or use MongoDB Atlas."
fi

# Check if Node.js is available
echo "📋 Checking Node.js..."
if command -v node &> /dev/null; then
    echo "✅ Node.js $(node --version) found"
else
    echo "❌ Node.js not found. Please install Node.js v18 or higher."
fi

# Check if Bun is available
echo "📋 Checking Bun..."
if command -v bun &> /dev/null; then
    echo "✅ Bun $(bun --version) found"
else
    echo "⚠️  Bun not found. Using npm instead."
fi

echo ""
echo "🔧 Setup Instructions:"
echo "======================"
echo ""
echo "1. Start MongoDB (if not already running):"
echo "   mongod"
echo ""
echo "2. Start the backend server:"
echo "   cd whatsapp-backend"
echo "   bun run dev"
echo ""
echo "3. Start the frontend server (in another terminal):"
echo "   cd .."
echo "   bun run dev"
echo ""
echo "4. Open your browser and navigate to:"
echo "   http://localhost:3000"
echo ""
echo "5. Register a new account and start chatting!"
echo ""
echo "📚 Features:"
echo "============"
echo "• Real-time messaging with Socket.IO"
echo "• User authentication"
echo "• One-on-one and group chats"
echo "• Online status indicators"
echo "• Typing indicators"
echo "• Message editing and deletion"
echo "• Responsive WhatsApp-like UI"
echo ""
echo "🔗 API Documentation:"
echo "===================="
echo "Backend API: http://localhost:5000/api"
echo "Socket.IO: http://localhost:5000"
echo ""
echo "🐛 Troubleshooting:"
echo "==================="
echo "• Make sure MongoDB is running on port 27017"
echo "• Check that ports 3000 and 5000 are available"
echo "• Verify .env files are properly configured"
echo ""