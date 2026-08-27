import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

interface UserRecord {
  user_id: string; // username e.g. 'shahid8851' or 'rohan_duel'
  full_name: string;
  avatar_url: string;
  is_admin?: boolean;
}

interface FriendRequestRecord {
  id: string;
  sender_id: string;
  receiver_id: string;
  sender_name: string;
  sender_avatar: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: number;
  expires_in_seconds: number;
}

interface FriendRecord {
  user_id: string;
  friend_id: string;
  friend_name: string;
  friend_avatar: string;
  created_at: number;
}

// In-memory Database Tables
const usersTable: UserRecord[] = [
  {
    user_id: 'shahid8851',
    full_name: 'Md Shahid',
    avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=shahid8851',
    is_admin: true,
  },
  {
    user_id: 'mds_101',
    full_name: 'Player One',
    avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=mds_101',
  },
  {
    user_id: 'rohan_duel',
    full_name: 'Rohan Pro',
    avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=rohan_pro',
  },
  {
    user_id: 'zara_99',
    full_name: 'Zara Star',
    avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=zara',
  },
  {
    user_id: 'kabir_pro',
    full_name: 'Kabir Mind',
    avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=kabir',
  },
  {
    user_id: 'meera_x',
    full_name: 'Meera Detective',
    avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=meera',
  },
  {
    user_id: 'lucas_d',
    full_name: 'Lucas Spark',
    avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=lucas',
  },
  {
    user_id: 'alex_99',
    full_name: 'Alex Cyber',
    avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=alex99',
  },
];

const friendRequestsTable: FriendRequestRecord[] = [];
const friendsTable: FriendRecord[] = [];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ==========================================
  // API ROUTES
  // ==========================================

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
  });

  // 1. GET /api/users/search?userId={id}
  // Searches the users table where user_id matches. Returns { user_id, name, avatar_url } (no password/pin fields).
  app.get('/api/users/search', (req, res) => {
    const rawUserId = (req.query.userId || req.query.user_id || req.query.query || '') as string;
    const cleanId = rawUserId.trim().toLowerCase().replace(/^@/, '');

    if (!cleanId) {
      res.status(400).json({ error: 'User ID is required' });
      return;
    }

    let found = usersTable.find(
      (u) => u.user_id.toLowerCase() === cleanId || u.full_name.toLowerCase() === cleanId
    );

    // If not currently in static array but is a valid user ID format, auto-register to usersTable
    if (!found && cleanId.length >= 2) {
      found = {
        user_id: cleanId,
        full_name: cleanId.includes('_')
          ? cleanId.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
          : cleanId.charAt(0).toUpperCase() + cleanId.slice(1),
        avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanId}`,
      };
      usersTable.push(found);
    }

    if (!found) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Return safe public user profile
    res.json({
      user_id: found.user_id,
      name: found.full_name,
      avatar_url: found.avatar_url,
    });
  });

  // 2. POST /api/friends/request
  // Body: { sender_id, receiver_id, sender_name, sender_avatar, receiver_name, receiver_avatar, is_game_invite, room_code, game_type }
  // Validates that receiver exists and creates a friend request record.
  // Standard friend requests remain permanently until checked/accepted.
  // Game/room invites have a 15-second validity period.
  app.post('/api/friends/request', (req, res) => {
    const {
      sender_id,
      receiver_id,
      sender_name,
      sender_avatar,
      receiver_name,
      receiver_avatar,
      is_game_invite,
      room_code,
      game_type,
    } = req.body;

    const cleanSender = String(sender_id || '').trim().toLowerCase().replace(/^@/, '');
    const cleanReceiver = String(receiver_id || '').trim().toLowerCase().replace(/^@/, '');

    if (!cleanSender || !cleanReceiver) {
      res.status(400).json({ success: false, message: 'sender_id and receiver_id are required.' });
      return;
    }

    if (cleanSender === cleanReceiver) {
      res.status(400).json({ success: false, message: 'You cannot send a friend request to yourself.' });
      return;
    }

    // Find or register receiver
    let receiver = usersTable.find((u) => u.user_id.toLowerCase() === cleanReceiver);
    if (!receiver) {
      receiver = {
        user_id: cleanReceiver,
        full_name: receiver_name || cleanReceiver,
        avatar_url: receiver_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanReceiver}`,
      };
      usersTable.push(receiver);
    }

    // Find or register sender
    let sender = usersTable.find((u) => u.user_id.toLowerCase() === cleanSender);
    if (!sender) {
      sender = {
        user_id: cleanSender,
        full_name: sender_name || cleanSender,
        avatar_url: sender_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanSender}`,
      };
      usersTable.push(sender);
    }

    // Check if already friends
    const isAlreadyFriends = friendsTable.some(
      (f) =>
        (f.user_id.toLowerCase() === cleanSender && f.friend_id.toLowerCase() === cleanReceiver) ||
        (f.user_id.toLowerCase() === cleanReceiver && f.friend_id.toLowerCase() === cleanSender)
    );

    if (isAlreadyFriends && !room_code && !is_game_invite) {
      res.status(400).json({
        success: false,
        message: `@${receiver.user_id} is already in your friends list!`,
      });
      return;
    }

    // Check if pending request already exists
    const existingPending = friendRequestsTable.find(
      (r) =>
        r.sender_id.toLowerCase() === cleanSender &&
        r.receiver_id.toLowerCase() === cleanReceiver &&
        r.status === 'pending'
    );

    if (existingPending && !room_code && !is_game_invite) {
      res.json({
        success: true,
        message: 'Friend Request is already sent and pending for this user.',
        request: existingPending,
      });
      return;
    }

    const isGame = Boolean(is_game_invite || room_code);

    // Insert new friend request:
    // Game/room invites expire in 15 seconds; standard friend requests remain permanently (0 = no expiry).
    const newRequest: FriendRequestRecord = {
      id: `req_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      sender_id: sender.user_id,
      sender_name: sender.full_name,
      sender_avatar: sender.avatar_url,
      receiver_id: receiver.user_id,
      status: 'pending',
      created_at: Date.now(),
      expires_in_seconds: isGame ? 15 : 0,
    };

    friendRequestsTable.unshift(newRequest);

    res.json({
      success: true,
      message: isGame
        ? 'Game Challenge Invite Sent (Valid for 15s)!'
        : 'Friend Request Sent Successfully!',
      request: newRequest,
    });
  });

  // 3. GET /api/friends/requests?userId={id}
  app.get('/api/friends/requests', (req, res) => {
    const rawUserId = (req.query.userId || req.query.user_id || '') as string;
    const cleanId = rawUserId.trim().toLowerCase().replace(/^@/, '');

    const pending = friendRequestsTable.filter(
      (r) => r.receiver_id.toLowerCase() === cleanId && r.status === 'pending'
    );

    res.json({ requests: pending });
  });

  // 4. POST /api/friends/accept
  app.post('/api/friends/accept', (req, res) => {
    const { request_id, user_id } = req.body;
    const cleanUserId = String(user_id || '').trim().toLowerCase().replace(/^@/, '');

    const reqIndex = friendRequestsTable.findIndex((r) => r.id === request_id);
    if (reqIndex === -1) {
      res.status(404).json({ success: false, message: 'Request not found or expired.' });
      return;
    }

    const request = friendRequestsTable[reqIndex];
    request.status = 'accepted';

    const sender = usersTable.find((u) => u.user_id.toLowerCase() === request.sender_id.toLowerCase());
    const receiver = usersTable.find((u) => u.user_id.toLowerCase() === request.receiver_id.toLowerCase());

    if (sender && receiver) {
      friendsTable.push({
        user_id: receiver.user_id,
        friend_id: sender.user_id,
        friend_name: sender.full_name,
        friend_avatar: sender.avatar_url,
        created_at: Date.now(),
      });
      friendsTable.push({
        user_id: sender.user_id,
        friend_id: receiver.user_id,
        friend_name: receiver.full_name,
        friend_avatar: receiver.avatar_url,
        created_at: Date.now(),
      });
    }

    res.json({
      success: true,
      message: `Friend request accepted!`,
      friend: sender
        ? {
            user_id: sender.user_id,
            name: sender.full_name,
            avatar_url: sender.avatar_url,
          }
        : null,
    });
  });

  // 5. GET /api/friends?userId={id}
  app.get('/api/friends', (req, res) => {
    const rawUserId = (req.query.userId || req.query.user_id || '') as string;
    const cleanId = rawUserId.trim().toLowerCase().replace(/^@/, '');

    const friends = friendsTable
      .filter((f) => f.user_id.toLowerCase() === cleanId)
      .map((f) => ({
        user_id: f.friend_id,
        name: f.friend_name,
        avatar_url: f.friend_avatar,
      }));

    res.json({ friends });
  });

  // ==========================================
  // VITE MIDDLEWARE / STATIC ASSETS
  // ==========================================
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
