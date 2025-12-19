# 🎉 WhatsApp Clone - Cara Chattingan dengan Orang Lain

## ✅ Status Server: SUDAH SIAP!

- **Backend Server**: ✅ Running on http://localhost:5000
- **Frontend Server**: ✅ Running on http://localhost:3000
- **Database**: ✅ In-memory storage (untuk demo)
- **Real-time**: ✅ Socket.IO aktif

## 🚀 Cara Mulai Chatting (Langkah demi Langkah)

### Langkah 1: Buka Aplikasi
1. Buka browser kamu
2. Kunjungi: **http://localhost:3000**
3. Kamu akan melihat halaman login WhatsApp Clone

### Langkah 2: Register User Pertama
1. Klik "Sign up" link di bawah
2. Isi data:
   - **Username**: `user1`
   - **Email**: `user1@test.com`
   - **Password**: `password123`
3. Klik "Sign Up"
4. Kamu akan langsung login sebagai user1

### Langkah 3: Register User Kedua (Di Browser Berbeda)
1. **Buka incognito window** atau browser berbeda
2. Kunjungi: **http://localhost:3000**
3. Register dengan data:
   - **Username**: `user2`
   - **Email**: `user2@test.com`
   - **Password**: `password123`
4. Klik "Sign Up"

### Langkah 4: Buat Chat (Sebagai User1)
1. Di browser user1, klik tombol **"New Chat"**
2. Masukkan email: `user2@test.com`
3. Klik "Create" atau "Submit"
4. Chat akan muncul di daftar chat

### Langkah 5: Kirim Pesan (User1 → User2)
1. Klik chat yang baru dibuat
2. Ketik pesan: "Halo user2!"
3. Tekan Enter atau klik tombol Send
4. Pesan akan muncul di chat user1

### Langkah 6: Terima & Balas Pesan (User2)
1. Di browser user2, **refresh halaman** atau tunggu beberapa detik
2. Chat baru akan muncul di daftar chat
3. Klik chat tersebut
4. Kamu akan melihat pesan dari user1
5. Balas dengan mengetik: "Halo user1! Pesan diterima"
6. Tekan Enter

### Langkah 7: Test Real-time Features
- **Typing Indicator**: Ketik sesuatu dan lihat "user is typing..."
- **Online Status**: Lihat hijau/abu-abu di avatar user
- **Instant Messages**: Pesan muncul langsung tanpa refresh
- **Message Timestamps**: Lihat waktu pengiriman pesan

## 🎯 Fitur yang Bisa Kamu Test

### ✅ Basic Features
- [x] Register & Login
- [x] Create one-on-one chat
- [x] Send & receive messages
- [x] Real-time messaging
- [x] User authentication

### ✅ Advanced Features
- [x] Online/offline status indicators
- [x] Typing indicators
- [x] Message timestamps
- [x] User avatars
- [x] Responsive WhatsApp-like UI

## 🔧 Test Commands (Optional)

Jika kamu mau test API langsung:

```bash
# Test register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@test.com","password":"password123"}'

# Test login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'

# Test get chats
curl -X GET http://localhost:5000/api/chat \
  -H "Authorization: Bearer [TOKEN_DARI_LOGIN]"
```

## 📱 Untuk Testing di Device Lain

1. **Cari IP Address**:
   ```bash
   ip addr show eth0 | grep inet
   ```

2. **Update Frontend Config**:
   Edit `.env.local`:
   ```
   NEXT_PUBLIC_API_URL=http://[IP-ADDRESS]:5000/api
   NEXT_PUBLIC_SOCKET_URL=http://[IP-ADDRESS]:5000
   ```

3. **Akses dari Device Lain**:
   Buka browser: `http://[IP-ADDRESS]:3000`

## 🐛 Troubleshooting

### Problem: "Backend not running"
**Solution**:
```bash
cd whatsapp-backend
node server-simple.js
```

### Problem: "Frontend not running"
**Solution**:
```bash
bun run dev
```

### Problem: "Cannot connect to backend"
**Solution**: Pastikan port 5000 accessible dan API URL benar

### Problem: "Messages not real-time"
**Solution**: Refresh browser dan coba kirim pesan lagi

## 🎉 Selamat Chatting!

Kamu sekarang bisa:
- ✅ Chattingan dengan teman
- ✅ Lihat status online/offline
- ✅ Kirim pesan real-time
- ✅ Test semua fitur WhatsApp Clone

**Enjoy chatting! 🚀**