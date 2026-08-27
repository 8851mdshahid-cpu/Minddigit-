import React, { useState, useEffect } from 'react';
import { 
  Home, 
  UserPlus, 
  MessageSquare, 
  Play, 
  Plus, 
  ArrowRight,
  Sparkles,
  Shield,
  LogOut,
  Bell,
  Gamepad2,
  Check,
  X
} from 'lucide-react';
import confetti from 'canvas-confetti';

import { 
  TabType, 
  GameId, 
  Friend, 
  GameItem, 
  NotificationItem, 
  MatchHistory, 
  UserAccount,
  FriendRequest,
  GameInvite 
} from './types';
import { sounds } from './utils/audio';
import { getActiveUser, setActiveUser, getUsers } from './utils/userStore';
import { 
  getUserFriends, 
  getPendingRequestsForUser, 
  getPendingInvitesForUser, 
  setUserPresence, 
  subscribeMultiplayer,
  respondToGameInvite,
  acceptFriendRequest,
  declineFriendRequest
} from './utils/multiplayerEngine';

// Auth Components
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import AdminDashboard from './components/admin/AdminDashboard';

// Games
import GuessNumberGame from './games/GuessNumberGame';
import AgainstImposterGame from './games/AgainstImposterGame';
import MathBlitzGame from './games/MathBlitzGame';
import BridgerGame from './games/BridgerGame';
import PatternMatrixGame from './games/PatternMatrixGame';

// Components & Modals
import DailySpinModal from './components/DailySpinModal';
import RoomModal from './components/RoomModal';
import NotificationsModal from './components/NotificationsModal';
import ProfileModal from './components/ProfileModal';
import FriendActionModal from './components/FriendActionModal';
import FriendsTab from './components/FriendsTab';
import ChatTab from './components/ChatTab';
import ProfileTab from './components/ProfileTab';

const INITIAL_GAMES: GameItem[] = [
  {
    id: 1,
    gameKey: 'guess-number',
    title: 'Guess Number',
    subtitle: 'High-Low Clues',
    tags: ['1-100 DUEL', 'HIGH / LOW'],
    theme: 'from-[#0a2540] via-[#081e35] to-[#041120]',
    accent: 'border-cyan-400 text-cyan-300',
    icon: '🎲',
    description: 'Duel opponents to guess the secret number between 1 and 100.',
    players: '1-2 Players',
    rewardCoins: 35
  },
  {
    id: 2,
    gameKey: 'against-imposter',
    title: 'Who is the imposter',
    subtitle: 'Voice & Detective',
    tags: ['3-5 PLAYERS', 'DETECTIVE'],
    theme: 'from-[#2a0845] via-[#1c0530] to-[#10031c]',
    accent: 'border-purple-400 text-purple-300',
    icon: '🎭',
    description: 'Unmask the sneaky imposter among detectives before voting ends!',
    players: '4 Players',
    rewardCoins: 50
  },
  {
    id: 3,
    gameKey: 'math-blitz',
    title: 'Math Blitz',
    subtitle: 'Level 10/10 • 5 Rounds',
    tags: ['⚡ LEVEL 10/10', 'SPEED RACE'],
    theme: 'from-[#063323] via-[#042419] to-[#02150e]',
    accent: 'border-emerald-400 text-emerald-300',
    icon: '⚡',
    description: 'Rapid-fire speed arithmetic duel against the ticking clock.',
    players: '1v1 Duel',
    rewardCoins: 40
  },
  {
    id: 4,
    gameKey: 'bridger',
    title: 'Bridger',
    subtitle: '5 Rounds • Path Puzzle',
    tags: ['🌉 5 ROUNDS', 'PATH PUZZLE'],
    theme: 'from-[#0f1742] via-[#090e2b] to-[#040616]',
    accent: 'border-blue-400 text-blue-300',
    icon: '🌉',
    description: 'Connect starting digits to destination targets using arithmetic bridges.',
    players: '1v1 Duel',
    rewardCoins: 35
  },
  {
    id: 5,
    gameKey: 'pattern-matrix',
    title: 'Pattern Matrix',
    subtitle: 'Memory & Cyber Grid',
    tags: ['🧩 MEMORY', 'CYBER'],
    theme: 'from-[#0e2738] via-[#091b26] to-[#050f16]',
    accent: 'border-teal-400 text-teal-300',
    icon: '🧩',
    description: 'Memorize glowing cyber grid pulses and repeat complex sequences.',
    players: 'Solo / Co-op',
    rewardCoins: 50
  }
];

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  { id: 'n1', title: 'Daily Login Reward', desc: 'Claim your daily active streak bonus!', time: '10m ago', icon: '🎁', unread: true, reward: 20, claimed: false },
  { id: 'n2', title: 'Welcome to Mind Arena', desc: 'Add friends or host custom rooms to duel live!', time: '1h ago', icon: '🌟', unread: false },
];

const INITIAL_MATCH_HISTORY: MatchHistory[] = [
  { id: 'mh1', gameTitle: 'Guess Number', opponent: 'Shahid (Bot)', opponentAvatar: '🤖', result: 'VICTORY', score: '3 vs 5 guesses', coinsEarned: 35, date: 'Today' },
  { id: 'mh2', gameTitle: 'Math Blitz', opponent: 'Zara', opponentAvatar: '🟣', result: 'VICTORY', score: '42 vs 30 pts', coinsEarned: 40, date: 'Today' },
  { id: 'mh3', gameTitle: 'Pattern Matrix', opponent: 'Solo Master', opponentAvatar: '🧩', result: 'VICTORY', score: '5 Sequences Cleared', coinsEarned: 50, date: 'Yesterday' }
];

export default function App() {
  // Navigation & Auth Flow
  const [authView, setAuthView] = useState<'login' | 'register' | 'admin' | 'app'>('login');
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);

  // App Main State
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [coins, setCoins] = useState(477);
  const [streak, setStreak] = useState(1);
  const [wins, setWins] = useState(13);
  const [username, setUsername] = useState('mdcare8851');
  const [userAvatar, setUserAvatar] = useState('M');

  // Friends & Social
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [gameInvites, setGameInvites] = useState<GameInvite[]>([]);
  const [incomingInviteToast, setIncomingInviteToast] = useState<GameInvite | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [activeChatFriend, setActiveChatFriend] = useState<Friend | null>(null);

  // Active Game State
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const [gameOpponent, setGameOpponent] = useState<{ name: string; avatar: string } | null>(null);

  // Modals
  const [isDailySpinOpen, setIsDailySpinOpen] = useState(false);
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [matchHistory, setMatchHistory] = useState<MatchHistory[]>(INITIAL_MATCH_HISTORY);

  // Refresh friends, requests, and invites from multiplayer engine
  const refreshMultiplayerState = () => {
    if (!currentUser) return;
    const userFriends = getUserFriends(currentUser.id);
    setFriends(userFriends);

    const pendingReqs = getPendingRequestsForUser(currentUser.id, currentUser.username);
    setFriendRequests(pendingReqs);

    const pendingInvs = getPendingInvitesForUser(currentUser.id, currentUser.username);
    setGameInvites(pendingInvs);
  };

  // Check stored active user on startup
  useEffect(() => {
    const active = getActiveUser();
    if (active) {
      handleAuthSuccess(active);
    }
  }, []);

  // Set presence and subscribe to multiplayer broadcast events
  useEffect(() => {
    if (!currentUser) return;

    // Mark current user as online
    setUserPresence(currentUser.id, true);
    refreshMultiplayerState();

    // Heartbeat every 45s
    const heartbeat = setInterval(() => {
      setUserPresence(currentUser.id, true);
    }, 45000);

    // Subscribe to real-time events across tabs/windows
    const unsubscribe = subscribeMultiplayer((eventType, payload) => {
      refreshMultiplayerState();

      if (eventType === 'game_invite_sent') {
        const invite = payload?.invite as GameInvite;
        if (invite && (invite.toUserId === currentUser.id || invite.toUsername.toLowerCase() === currentUser.username.toLowerCase())) {
          sounds.playSuccess();
          setIncomingInviteToast(invite);
        }
      } else if (eventType === 'friend_request_received') {
        if (payload?.targetUserId === currentUser.id) {
          sounds.playCoin();
        }
      }
    });

    return () => {
      clearInterval(heartbeat);
      unsubscribe();
    };
  }, [currentUser]);

  // Sync state when user logs in or registers
  const handleAuthSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    setUsername(user.username);
    setUserAvatar(user.avatar || 'M');
    setCoins(user.coins || 477);
    setWins(user.wins || 13);
    setStreak(user.streak || 1);
    setUserPresence(user.id, true);

    const userFriends = getUserFriends(user.id);
    setFriends(userFriends);

    const pendingReqs = getPendingRequestsForUser(user.id, user.username);
    setFriendRequests(pendingReqs);

    const pendingInvs = getPendingInvitesForUser(user.id, user.username);
    setGameInvites(pendingInvs);

    if (user.role === 'admin' || user.username.toLowerCase() === 'shahid8511') {
      setAuthView('admin');
    } else {
      setAuthView('app');
    }
  };

  const handleLogout = () => {
    if (currentUser) {
      setUserPresence(currentUser.id, false);
    }
    setActiveUser(null);
    setCurrentUser(null);
    setAuthView('login');
    setActiveGame(null);
    sounds.playClick();
  };

  // Coin rewards & wins
  const handleRewardCoins = (amount: number) => {
    sounds.playCoin();
    setCoins(c => c + amount);
  };

  const handleGameWin = (rewardAmount: number, gameTitle: string) => {
    setCoins(c => c + rewardAmount);
    setWins(w => w + 1);

    const opponent = gameOpponent || { name: 'Bot Rival', avatar: '🤖' };
    const newRecord: MatchHistory = {
      id: Date.now().toString(),
      gameTitle: gameTitle || 'Duel',
      opponent: opponent.name,
      opponentAvatar: opponent.avatar,
      result: 'VICTORY',
      score: 'Mastery Cleared',
      coinsEarned: rewardAmount,
      date: 'Just now'
    };
    setMatchHistory(prev => [newRecord, ...prev]);
  };

  const handleLaunchGame = (gameId: GameId, opponent?: { name: string; avatar: string }) => {
    sounds.playClick();
    if (opponent) {
      setGameOpponent(opponent);
    } else {
      setGameOpponent({ name: 'Shahid (Bot)', avatar: '🤖' });
    }
    setActiveGame(gameId);
  };

  const handleClaimNotificationReward = (notifId: string, amount: number) => {
    setCoins(c => c + amount);
    setNotifications(prev =>
      prev.map(n => (n.id === notifId ? { ...n, claimed: true, unread: false } : n))
    );
  };

  const handleSendGift = (friend: Friend) => {
    if (coins < 5) return;
    setCoins(c => c - 5);
    setSelectedFriend(null);
    confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
  };

  // Toast accept game invite
  const handleAcceptToastInvite = (invite: GameInvite) => {
    if (!currentUser) return;
    sounds.playSuccess();
    setIncomingInviteToast(null);
    respondToGameInvite(invite.id, 'accepted', currentUser);
    handleLaunchGame(invite.gameId, {
      name: invite.fromUsername,
      avatar: invite.fromAvatar
    });
  };

  // 1. AUTH VIEW: LOGIN
  if (authView === 'login') {
    return (
      <LoginPage
        onLoginSuccess={handleAuthSuccess}
        onNavigateToRegister={() => setAuthView('register')}
        onNavigateToAdmin={() => setAuthView('admin')}
      />
    );
  }

  // 2. AUTH VIEW: REGISTER
  if (authView === 'register') {
    return (
      <RegisterPage
        onRegisterSuccess={user => {
          handleAuthSuccess(user);
          confetti({ particleCount: 60, spread: 70, origin: { y: 0.5 } });
        }}
        onNavigateToLogin={() => setAuthView('login')}
      />
    );
  }

  // 3. AUTH VIEW: ADMIN DASHBOARD
  if (authView === 'admin') {
    const effectiveAdmin = currentUser || {
      id: 'user_admin_1',
      fullName: 'Shahid Administrator',
      mobileNumber: '9876543210',
      whatsappNumber: '9876543210',
      pinCode: '123456',
      securityQuestion: 'What is your color?',
      securityAnswer: 'Blue',
      username: 'Shahid8511',
      role: 'admin',
      avatar: '👑',
      coins: 9999,
      wins: 85,
      streak: 15,
      createdAt: '2026-08-01'
    };

    return (
      <AdminDashboard
        currentUser={effectiveAdmin}
        onLogout={handleLogout}
        onSwitchToGame={user => {
          handleAuthSuccess(user);
          setAuthView('app');
        }}
      />
    );
  }

  // 4. MAIN APP / GAME ARENA
  const isAdminUser = currentUser?.role === 'admin' || currentUser?.username.toLowerCase() === 'shahid8511';
  const unreadCount = friendRequests.length + gameInvites.length + notifications.filter(n => n.unread).length;

  const activeUserSafe: UserAccount = currentUser || {
    id: 'user_guest',
    fullName: 'Player',
    mobileNumber: '9876543210',
    pinCode: '123456',
    securityQuestion: 'Color',
    securityAnswer: 'Blue',
    username: username || 'Hero_Player',
    role: 'user',
    avatar: userAvatar,
    coins,
    wins,
    streak,
    createdAt: '2026-08-26'
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#e0f7fa]/60 via-[#ffffff] to-[#fff3e0]/70 text-slate-800 font-sans flex justify-center selection:bg-blue-500 selection:text-white">
      {/* Mobile Application Viewport Container */}
      <div className="w-full max-w-md min-h-screen flex flex-col relative shadow-2xl bg-gradient-to-br from-cyan-50/50 via-white/80 to-amber-50/50 backdrop-blur-md">
        
        {/* Real-Time Incoming Game Invite Floating Toast */}
        {incomingInviteToast && (
          <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm animate-slide-down">
            <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-2xl border-2 border-amber-400 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-xl shrink-0 shadow-sm">
                  {incomingInviteToast.fromAvatar}
                </div>
                <div>
                  <div className="text-xs font-black text-amber-300">
                    🎮 Game Invite from {incomingInviteToast.fromUsername}!
                  </div>
                  <div className="text-[11px] text-slate-300 font-medium">
                    Duel in <span className="font-bold text-white">{incomingInviteToast.gameTitle}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleAcceptToastInvite(incomingInviteToast)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md active:scale-95 transition"
                >
                  PLAY
                </button>
                <button
                  onClick={() => setIncomingInviteToast(null)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Top Header Bar */}
        <header className="px-3.5 py-2.5 flex items-center justify-between sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100 shadow-xs">
          {/* Logo with Little Heroes Quest */}
          <div
            onClick={() => {
              setActiveGame(null);
              setActiveTab('home');
              sounds.playClick();
            }}
            className="flex items-center gap-1.5 cursor-pointer select-none"
          >
            <div className="w-8 h-8 rounded-full border-2 border-pink-400 bg-pink-50 flex items-center justify-center text-sm shadow-xs">
              🐱
            </div>
            <div className="flex flex-col">
              <span className="font-black text-sm tracking-tight leading-none text-slate-900 uppercase">
                Little Heroes<span className="text-purple-600">' Quest</span>
              </span>
              <span className="text-[9px] text-emerald-600 font-bold tracking-wide">
                Play with Maths & Explore 🌟
              </span>
            </div>
          </div>

          {/* Action Icons Row */}
          <div className="flex items-center gap-1.5">
            {/* Admin Console shortcut if Admin */}
            {isAdminUser && (
              <button
                onClick={() => {
                  sounds.playClick();
                  setAuthView('admin');
                }}
                title="Open Admin Dashboard"
                className="px-2 py-1 rounded-full bg-purple-100 hover:bg-purple-200 text-purple-700 font-black text-[10px] flex items-center gap-1 border border-purple-300 transition active:scale-95"
              >
                <Shield size={11} />
                <span>Admin</span>
              </button>
            )}

            {/* Notification Bell with Dynamic Unread Counter */}
            <button
              onClick={() => {
                sounds.playClick();
                setIsNotificationsOpen(true);
              }}
              title="Notifications & Invites"
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 flex items-center justify-center relative transition active:scale-95"
            >
              <Bell size={15} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-rose-500 text-white rounded-full text-[8.5px] font-black flex items-center justify-center border-2 border-white animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Room Codes Shortcut */}
            <button
              onClick={() => {
                sounds.playClick();
                setIsRoomModalOpen(true);
              }}
              title="Multiplayer Room Codes"
              className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 hover:bg-amber-100 flex items-center justify-center relative transition active:scale-95 border border-amber-200"
            >
              <Gamepad2 size={15} />
            </button>

            {/* Add Friend Shortcut */}
            <button
              onClick={() => {
                sounds.playClick();
                setActiveTab('add');
              }}
              title="Search & Add Friends"
              className="w-8 h-8 rounded-full bg-blue-50/90 text-blue-600 hover:bg-blue-100 flex items-center justify-center relative transition active:scale-95"
            >
              <UserPlus size={15} />
              {friendRequests.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-600 text-white rounded-full text-[8px] flex items-center justify-center font-bold animate-ping"></span>
              )}
            </button>

            {/* Profile Avatar with online green dot */}
            <div
              onClick={() => {
                sounds.playClick();
                setIsProfileModalOpen(true);
              }}
              className="relative cursor-pointer active:scale-95 transition"
              title="View Profile & Wallet"
            >
              <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-amber-300 font-bold text-xs shadow-xs">
                {userAvatar}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
            </div>

            {/* Quick Logout Button */}
            <button
              onClick={handleLogout}
              title="Switch Account / Logout"
              className="w-7 h-7 rounded-full bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-500 flex items-center justify-center transition active:scale-95"
            >
              <LogOut size={13} />
            </button>
          </div>
        </header>

        {/* ACTIVE GAME VIEW */}
        {activeGame ? (
          <main className="flex-1 p-3.5 w-full">
            {activeGame === 'guess-number' && (
              <GuessNumberGame
                onBack={() => setActiveGame(null)}
                onWin={amt => handleGameWin(amt, 'Guess Number')}
                currentUser={activeUserSafe}
                friends={friends}
                onRefreshFriends={refreshMultiplayerState}
                opponentName={gameOpponent?.name}
                opponentAvatar={gameOpponent?.avatar}
              />
            )}
            {activeGame === 'against-imposter' && (
              <AgainstImposterGame
                onBack={() => setActiveGame(null)}
                onWin={amt => handleGameWin(amt, 'Who is the imposter')}
                opponent={gameOpponent}
              />
            )}
            {activeGame === 'math-blitz' && (
              <MathBlitzGame
                onBack={() => setActiveGame(null)}
                onWin={amt => handleGameWin(amt, 'Math Blitz')}
                opponentName={gameOpponent?.name}
                opponentAvatar={gameOpponent?.avatar}
              />
            )}
            {activeGame === 'bridger' && (
              <BridgerGame
                onBack={() => setActiveGame(null)}
                onWin={amt => handleGameWin(amt, 'Bridger')}
                opponentName={gameOpponent?.name}
                opponentAvatar={gameOpponent?.avatar}
              />
            )}
            {activeGame === 'pattern-matrix' && (
              <PatternMatrixGame
                onBack={() => setActiveGame(null)}
                onWin={amt => handleGameWin(amt, 'Pattern Matrix')}
              />
            )}
          </main>
        ) : (
          /* TAB VIEWS */
          <main className="flex-1 flex flex-col p-3.5 gap-3.5 pb-24">
            
            {/* 1. HOME TAB */}
            {activeTab === 'home' && (
              <div className="flex flex-col gap-3.5 animate-fade-in">
                
                {/* DAILY SPONSOR SCROLL Card */}
                <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600 rounded-3xl p-4 text-white shadow-md flex items-center justify-between relative overflow-hidden">
                  <div className="flex items-center gap-3 relative z-10">
                    {/* 777 Slot Machine Box */}
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs border border-white/30 flex items-center justify-center text-2xl shadow-inner shrink-0">
                      🎰
                    </div>

                    {/* Text Details */}
                    <div>
                      <div className="text-[10px] font-black tracking-wider uppercase text-white/90">
                        DAILY SPONSOR SCROLL
                      </div>
                      <div className="inline-flex items-center gap-1 bg-black/25 backdrop-blur-xs px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-200 mt-0.5">
                        <span>⏱</span>
                        <span>9h 20m</span>
                      </div>
                      <div className="text-xs font-black text-white mt-1 drop-shadow-xs flex items-center gap-1 flex-wrap">
                        <span>Spin to Win 10 🪙 or 20 🪙 Jackpot!</span>
                      </div>
                    </div>
                  </div>

                  {/* NEXT TRY Button */}
                  <button
                    onClick={() => {
                      sounds.playSpinTick();
                      setIsDailySpinOpen(true);
                    }}
                    className="bg-white text-slate-900 hover:bg-slate-100 font-black text-xs px-3.5 py-2 rounded-full shadow-sm flex items-center gap-1 shrink-0 active:scale-95 transition z-10"
                  >
                    <span>NEXT TRY</span>
                    <ArrowRight size={13} />
                  </button>
                </div>

                {/* Quick Join / Host Room Code Bar */}
                <div 
                  onClick={() => {
                    sounds.playClick();
                    setIsRoomModalOpen(true);
                  }}
                  className="bg-gradient-to-r from-indigo-50 via-purple-50 to-blue-50 border-2 border-indigo-200 rounded-2xl p-3 flex items-center justify-between cursor-pointer hover:border-indigo-400 transition active:scale-[0.99] shadow-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                      <Gamepad2 size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900">
                        Universal Room Code Matchmaking
                      </div>
                      <div className="text-[10px] text-indigo-600 font-bold">
                        Join or create 6-character rooms (e.g. G-98421)
                      </div>
                    </div>
                  </div>
                  <span className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-black shadow-xs">
                    JOIN / HOST
                  </span>
                </div>

                {/* ARENA GAME MODES 2-COLUMN GRID */}
                <div className="grid grid-cols-2 gap-3.5">
                  {INITIAL_GAMES.map(game => (
                    <div
                      key={game.id}
                      onClick={() => handleLaunchGame(game.gameKey)}
                      className="bg-white rounded-3xl p-2.5 border border-slate-100 shadow-xs flex flex-col justify-between hover:border-blue-300 hover:shadow-md cursor-pointer transition active:scale-[0.98] group"
                    >
                      {/* Upper Card Graphic Banner */}
                      <div className={`h-36 w-full rounded-2xl bg-gradient-to-b ${game.theme} p-2.5 flex flex-col justify-between relative overflow-hidden shadow-inner`}>
                        {/* Top Pills Row */}
                        <div className="flex items-center justify-between gap-1 w-full z-10">
                          <span className="bg-white/10 backdrop-blur-xs border border-white/20 text-white text-[8.5px] font-black px-1.5 py-0.5 rounded-full truncate">
                            {game.tags[0]}
                          </span>
                          <span className="bg-white/10 backdrop-blur-xs border border-white/20 text-white text-[8.5px] font-black px-1.5 py-0.5 rounded-full truncate">
                            {game.tags[1]}
                          </span>
                        </div>

                        {/* Center Archetype Graphic Dome */}
                        <div className="relative mx-auto w-20 h-16 bg-white/10 border-2 border-white/30 rounded-t-3xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                          <span className="text-3xl filter drop-shadow-md">
                            {game.icon}
                          </span>
                        </div>

                        {/* Subtle background glow */}
                        <div className="absolute inset-0 bg-radial from-white/10 to-transparent pointer-events-none"></div>
                      </div>

                      {/* Lower Info & Play Button */}
                      <div className="flex items-center justify-between pt-2.5 px-1 pb-0.5">
                        <div className="truncate pr-1">
                          <h3 className="font-black text-slate-900 text-xs truncate">
                            {game.title}
                          </h3>
                          <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                            {game.subtitle}
                          </p>
                        </div>

                        <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:bg-blue-600 transition">
                          <Play size={11} className="fill-current ml-0.5" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}

            {/* 2. ADD FRIEND TAB */}
            {activeTab === 'add' && (
              <div className="w-full">
                <FriendsTab
                  currentUser={activeUserSafe}
                  friends={friends}
                  onRefreshFriends={refreshMultiplayerState}
                  onChallenge={(gId, f) => handleLaunchGame(gId, { name: f.name, avatar: f.avatar })}
                  onOpenChat={f => {
                    setActiveChatFriend(f);
                    setActiveTab('chat');
                  }}
                  onOpenRoomModal={() => setIsRoomModalOpen(true)}
                />
              </div>
            )}

            {/* 3. CHAT TAB */}
            {activeTab === 'chat' && (
              <div className="w-full">
                <ChatTab
                  friends={friends}
                  activeChatFriend={activeChatFriend}
                  onSelectFriend={f => setActiveChatFriend(f)}
                  onLaunchGameWithFriend={(gId, f) => handleLaunchGame(gId, { name: f.name, avatar: f.avatar })}
                />
              </div>
            )}

            {/* 4. PROFILE TAB */}
            {activeTab === 'profile' && (
              <div className="w-full">
                <ProfileTab
                  coins={coins}
                  streak={streak}
                  wins={wins}
                  username={username}
                  avatar={userAvatar}
                  onUpdateProfile={(name, av) => {
                    setUsername(name);
                    setUserAvatar(av);
                  }}
                  matchHistory={matchHistory}
                />
              </div>
            )}

          </main>
        )}

        {/* Modals & Dialogs */}
        <DailySpinModal
          isOpen={isDailySpinOpen}
          onClose={() => setIsDailySpinOpen(false)}
          onReward={handleRewardCoins}
        />

        <RoomModal
          isOpen={isRoomModalOpen}
          onClose={() => setIsRoomModalOpen(false)}
          currentUser={activeUserSafe}
          onLaunchGame={(gId, opp) => handleLaunchGame(gId, opp)}
        />

        <NotificationsModal
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          currentUser={activeUserSafe}
          notifications={notifications}
          friendRequests={friendRequests}
          gameInvites={gameInvites}
          onClaimReward={handleClaimNotificationReward}
          onAcceptRequest={() => refreshMultiplayerState()}
          onDeclineRequest={() => refreshMultiplayerState()}
          onAcceptGameInvite={inv => {
            handleLaunchGame(inv.gameId, { name: inv.fromUsername, avatar: inv.fromAvatar });
            refreshMultiplayerState();
          }}
          onDeclineGameInvite={() => refreshMultiplayerState()}
        />

        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          coins={coins}
          streak={streak}
          wins={wins}
          username={username}
          avatar={userAvatar}
          onUpdateProfile={(name, av) => {
            setUsername(name);
            setUserAvatar(av);
          }}
          notifications={notifications}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenDailySpin={() => setIsDailySpinOpen(true)}
          onOpenRoomModal={() => setIsRoomModalOpen(true)}
          onNavigateToTab={tab => {
            setActiveGame(null);
            setActiveTab(tab);
          }}
          onLogout={handleLogout}
          onOpenAdmin={isAdminUser ? () => setAuthView('admin') : undefined}
          isAdmin={isAdminUser}
        />

        <FriendActionModal
          friend={selectedFriend}
          onClose={() => setSelectedFriend(null)}
          onChallenge={(gId, friend) => {
            setSelectedFriend(null);
            handleLaunchGame(gId, { name: friend.name, avatar: friend.avatar });
          }}
          onChat={friend => {
            setSelectedFriend(null);
            setActiveChatFriend(friend);
            setActiveTab('chat');
          }}
          onGift={handleSendGift}
        />

        {/* Bottom Navigation Bar */}
        <nav className="h-16 bg-white/95 backdrop-blur-md border-t border-slate-200/80 px-4 flex items-center justify-around fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
          {/* HOME */}
          <div
            onClick={() => {
              setActiveGame(null);
              setActiveTab('home');
              sounds.playClick();
            }}
            className={`flex flex-col items-center gap-0.5 cursor-pointer transition active:scale-95 ${
              activeTab === 'home' && !activeGame ? 'text-blue-600' : 'text-slate-400 hover:text-blue-600'
            }`}
          >
            <Home size={19} className={activeTab === 'home' && !activeGame ? 'stroke-[2.5]' : ''} />
            <span className="text-[10px] font-black tracking-wide">HOME</span>
          </div>

          {/* ADD FRIEND */}
          <div
            onClick={() => {
              setActiveGame(null);
              setActiveTab('add');
              sounds.playClick();
            }}
            className={`flex flex-col items-center gap-0.5 cursor-pointer transition active:scale-95 ${
              activeTab === 'add' ? 'text-blue-600' : 'text-blue-600 hover:opacity-90'
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs relative">
              <Plus size={18} />
              {friendRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border border-white"></span>
              )}
            </div>
            <span className="text-[10px] font-black tracking-wide text-blue-600">ADD FRIEND</span>
          </div>

          {/* CHAT */}
          <div
            onClick={() => {
              setActiveGame(null);
              setActiveTab('chat');
              sounds.playClick();
            }}
            className={`flex flex-col items-center gap-0.5 cursor-pointer transition active:scale-95 ${
              activeTab === 'chat' ? 'text-emerald-600' : 'text-emerald-600/80 hover:text-emerald-600'
            }`}
          >
            <MessageSquare size={19} className="text-emerald-600 stroke-[2.2]" />
            <span className="text-[10px] font-black tracking-wide text-emerald-600">CHAT</span>
          </div>

          {/* PROFILE */}
          <div
            onClick={() => {
              setActiveGame(null);
              setActiveTab('profile');
              sounds.playClick();
            }}
            className={`flex flex-col items-center gap-0.5 cursor-pointer transition active:scale-95 ${
              activeTab === 'profile' ? 'text-amber-800' : 'text-amber-700/80 hover:text-amber-800'
            }`}
          >
            <div className="w-5 h-5 rounded-full bg-slate-900 text-amber-300 flex items-center justify-center font-black text-[10px] shadow-xs">
              {userAvatar}
            </div>
            <span className="text-[10px] font-black tracking-wide text-amber-800">PROFILE</span>
          </div>
        </nav>

      </div>
    </div>
  );
}
