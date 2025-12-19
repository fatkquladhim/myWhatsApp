#!/bin/bash

echo "🚀 WhatsApp Clone - Multi-User Chat Demo"
echo "======================================"
echo ""
echo "✅ Server Status:"
echo "=================="

# Check if backend is running
if curl -s http://localhost:5000/api/auth/me > /dev/null 2>&1; then
    echo "✅ Backend server is running on http://localhost:5000"
else
    echo "❌ Backend server is not running"
    echo "   Run: cd whatsapp-backend && node server-simple.js"
    exit 1
fi

# Check if frontend is running
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend server is running on http://localhost:3000"
else
    echo "❌ Frontend server is not running"
    echo "   Run: bun run dev"
    exit 1
fi

echo ""
echo "📋 Cara Testing Multi-User Chat:"
echo "==============================="
echo ""
echo "1. Buka browser dan buka http://localhost:3000"
echo "2. Di browser pertama, register user dengan:"
echo "   - Username: user1"
echo "   - Email: user1@test.com"
echo "   - Password: password123"
echo ""
echo "3. Di browser kedua (incognito window), register user dengan:"
echo "   - Username: user2"
echo "   - Email: user2@test.com"
echo "   - Password: password123"
echo ""
echo "4. Login sebagai user1, klik 'New Chat'"
echo "5. Masukkan email user2@test.com untuk membuat chat"
echo "6. Kirim pesan dari user1 ke user2"
echo "7. Di browser kedua, refresh chat list user2"
echo "8. Buka chat dan balas pesan dari user1"
echo ""
echo "🎯 Fitur yang Bisa Diuji:"
echo "========================="
echo "• Real-time messaging (pesan langsung muncul)"
echo "• Online/offline status"
echo "• Typing indicators"
echo "• Message timestamps"
echo "• User authentication"
echo ""
echo "🔧 Testing Commands:"
echo "==================="
echo "Test API: curl http://localhost:5000/api/auth/me"
echo "Check logs: tail -f whatsapp-backend/backend.log"
echo "Frontend logs: tail -f dev.log"
echo ""
echo "📱 Untuk testing di device lain:"
echo "==============================="
echo "1. Pastikan server accessible (gunakan IP address)"
echo "2. Update NEXT_PUBLIC_API_URL di .env.local"
echo "3. Buka http://[IP-ADDRESS]:3000 di device lain"
echo ""
echo "🎉 Selamat chatting!"