import React, { useState, useEffect } from 'react';

// Import our separate components and config using absolute paths
import { auth, db } from '/src/firebaseConfig.js';
import ProfileView from '/src/components/ProfileView.jsx';
import FeedView from '/src/components/FeedView.jsx';
import ChatView from '/src/components/ChatView.jsx'; 

// Import functions from Firebase SDKs
import {
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup,
    signOut
} from 'firebase/auth';
import {
    doc,
    setDoc,
    serverTimestamp,
} from 'firebase/firestore';
import { User, MessageSquare, Newspaper, LogOut, LogIn } from 'lucide-react';

// --- Main App Component ---
export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentView, setCurrentView] = useState('feed');
    const [activeChannel, setActiveChannel] = useState({ id: 'general', name: 'General' });
    const [viewingProfileId, setViewingProfileId] = useState(null);

    // Effect to handle user authentication state
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const userRef = doc(db, "users", currentUser.uid);
                await setDoc(userRef, {
                    uid: currentUser.uid,
                    displayName: currentUser.displayName,
                    photoURL: currentUser.photoURL,
                    email: currentUser.email,
                    lastLogin: serverTimestamp()
                }, { merge: true });
                setUser(currentUser);
            } else {
                setUser(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleViewProfile = (userId) => {
        setViewingProfileId(userId);
        setCurrentView('profile');
    };

    const handleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error during Google sign-in", error);
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut(auth);
            setCurrentView('feed');
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    if (!user) {
        return <LoginScreen onLogin={handleLogin} />;
    }

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans">
            <Sidebar
                user={user}
                setCurrentView={setCurrentView}
                currentView={currentView}
                setActiveChannel={setActiveChannel}
                onSignOut={handleSignOut}
                onViewProfile={handleViewProfile}
            />
            <main className="flex-1 flex flex-col">
                <Header view={currentView} channelName={activeChannel.name} />
                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                    {currentView === 'feed' && <FeedView user={user} onViewProfile={handleViewProfile} />}
                    {currentView === 'chat' && <ChatView user={user} channelId={activeChannel.id} />}
                    {currentView === 'profile' && <ProfileView loggedInUser={user} profileUserId={viewingProfileId || user.uid} />}
                </div>
            </main>
        </div>
    );
}

// --- Components that still live in App.jsx ---
function LoginScreen({ onLogin }) {
    return (
        <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white">
            <div className="text-center p-8">
                <h1 className="text-5xl font-bold mb-2">Welcome to CampusConnect</h1>
                <p className="text-lg text-gray-400 mb-8">Your college community hub.</p>
                <button
                    onClick={onLogin}
                    className="flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-transform transform hover:scale-105"
                >
                    <LogIn className="mr-3" size={24} />
                    Sign In with Google
                </button>
            </div>
        </div>
    );
}

function LoadingSpinner() {
    return (
        <div className="flex h-screen items-center justify-center bg-gray-900">
            <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div>
        </div>
    );
}

function Sidebar({ user, setCurrentView, currentView, setActiveChannel, onSignOut, onViewProfile }) {
    const channels = [
        { id: 'general', name: 'General' },
        { id: 'study-group', name: 'Study Group' },
        { id: 'project-collaboration', name: 'Project Collab' },
    ];

    return (
        <aside className="w-64 bg-gray-800 text-white flex flex-col p-4 space-y-2">
            <div className="text-2xl font-bold text-center py-4 mb-4 border-b border-gray-700">CampusConnect</div>
            <nav className="flex-1 space-y-2">
                 <button onClick={() => setCurrentView('feed')} className={`flex items-center w-full text-left p-3 rounded-lg transition-colors ${currentView === 'feed' ? 'bg-purple-600 text-white' : 'hover:bg-gray-700'}`}><Newspaper size={20} /><span className="ml-3 font-medium">Feed</span></button>
                 <button onClick={() => { setCurrentView('chat'); setActiveChannel({id: 'general', name: 'General'})}} className={`flex items-center w-full text-left p-3 rounded-lg transition-colors ${currentView === 'chat' ? 'bg-purple-600 text-white' : 'hover:bg-gray-700'}`}><MessageSquare size={20} /><span className="ml-3 font-medium">Chat</span></button>
                 <button onClick={() => onViewProfile(user.uid)} className={`flex items-center w-full text-left p-3 rounded-lg transition-colors ${currentView === 'profile' ? 'bg-purple-600 text-white' : 'hover:bg-gray-700'}`}><User size={20} /><span className="ml-3 font-medium">Profile</span></button>

                <div className="pt-4 mt-4 border-t border-gray-700">
                    <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Channels</h3>
                    <div className="space-y-1">
                    {channels.map(channel => (
                        <button key={channel.id} onClick={() => { setActiveChannel(channel); setCurrentView('chat'); }} className="w-full text-left px-3 py-2 text-sm rounded-md text-gray-300 hover:bg-gray-700 hover:text-white" >
                            # {channel.name}
                        </button>
                    ))}
                    </div>
                </div>
            </nav>
            <div className="mt-auto flex items-center p-3 bg-gray-900 rounded-lg">
                <img src={user.photoURL} alt="User" className="w-10 h-10 rounded-full" />
                <div className="ml-3 flex-1">
                    <p className="font-semibold text-sm">{user.displayName}</p>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
                 <button onClick={onSignOut} className="ml-2 p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors">
                    <LogOut size={18} />
                </button>
            </div>
        </aside>
    );
}

function Header({ view, channelName }) {
    const viewTitles = {
        feed: 'News Feed',
        chat: `# ${channelName}`,
        profile: 'User Profile'
    };
    return (
        <header className="bg-white dark:bg-gray-800 p-4 shadow-md border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-xl font-bold">{viewTitles[view]}</h1>
        </header>
    );
}

