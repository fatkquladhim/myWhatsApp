# WhatsApp Clone - Real-time Chat Application

A WhatsApp-like real-time chat application built with Express.js backend and React frontend.

## Features

- Real-time messaging with Socket.IO
- User authentication (register/login)
- One-on-one and group chats
- Online status indicators
- Typing indicators
- Message read receipts
- Responsive WhatsApp-like UI
- Message editing and deletion

## Tech Stack

### Backend
- Express.js (ES modules)
- Socket.IO for real-time communication
- MongoDB with Mongoose ODM
- JWT authentication
- bcryptjs for password hashing

### Frontend
- Next.js 15 with TypeScript
- Tailwind CSS with shadcn/ui components
- Zustand for state management
- Socket.IO client
- Lucide React icons

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or cloud instance)
- Bun or npm package manager

### Backend Setup

1. Navigate to the backend directory:
```bash
cd whatsapp-backend
```

2. Install dependencies:
```bash
bun install
```

3. Create a `.env` file with the following variables:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/whatsapp-clone
JWT_SECRET=your-secret-key-here
NODE_ENV=development
```

4. Start the backend server:
```bash
bun run dev
```

The backend will be running on `http://localhost:5000`

### Frontend Setup

1. Navigate to the root directory (if not already there):
```bash
cd ..
```

2. Install dependencies:
```bash
bun install
```

3. Create a `.env.local` file with the following variables:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

4. Start the frontend development server:
```bash
bun run dev
```

The frontend will be running on `http://localhost:3000`

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. Register a new account or login with existing credentials
3. Start chatting! You can:
   - Create one-on-one chats
   - Create group chats
   - Send real-time messages
   - See online status of other users
   - Edit and delete messages

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/status` - Update user status

### Chats
- `GET /api/chat` - Get all chats for current user
- `POST /api/chat/one-on-one` - Create one-on-one chat
- `POST /api/chat/group` - Create group chat
- `GET /api/chat/:chatId` - Get chat by ID
- `PUT /api/chat/:chatId/read` - Mark messages as read

### Messages
- `GET /api/message/:chatId` - Get messages for a chat
- `POST /api/message/:chatId` - Send message
- `PUT /api/message/:messageId` - Edit message
- `DELETE /api/message/:messageId` - Delete message

## Socket.IO Events

### Client to Server
- `join_chat` - Join a chat room
- `leave_chat` - Leave a chat room
- `send_message` - Send a message
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator
- `mark_messages_read` - Mark messages as read
- `change_status` - Change user status
- `get_online_users` - Get online users list

### Server to Client
- `new_message` - New message received
- `new_message_notification` - New message notification
- `user_typing` - User is typing
- `user_stop_typing` - User stopped typing
- `messages_read` - Messages were read
- `user_status_changed` - User status changed
- `online_users` - List of online users
- `error` - Error occurred

## Project Structure

```
whatsapp-clone/
├── whatsapp-backend/
│   ├── models/
│   │   ├── User.js
│   │   ├── Chat.js
│   │   └── Message.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── chat.js
│   │   └── message.js
│   ├── socket/
│   │   └── socket.js
│   ├── middleware/
│   │   └── auth.js
│   ├── server.js
│   └── package.json
├── src/
│   ├── components/
│   │   ├── ui/
│   │   └── whatsapp/
│   ├── stores/
│   │   ├── authStore.ts
│   │   └── chatStore.ts
│   ├── lib/
│   │   └── api/
│   ├── app/
│   │   └── page.tsx
│   └── ...
├── package.json
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.