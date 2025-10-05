import React, { useState, useEffect } from 'react';

// Using the new '@' alias for clean, reliable imports
import { auth, db, rtdb } from '@/firebaseConfig.js';
import ProfileView from '@/components/ProfileView.jsx';
import FeedView from '@/components/FeedView.jsx';
import ChatView from '@/components/ChatView.jsx';
import Sidebar from '@/components/Sidebar.jsx';
import DirectMessageView from '@/components/DirectMessageView.jsx';
import Header from '@/components/Header.jsx'; 

// Import Firebase SDKs
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, onValue, set, onDisconnect } from "firebase/database";
import { LogIn } from 'lucide-react';

export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentView, setCurrentView] = useState('feed');
    const [activeChannel, setActiveChannel] = useState({ id: 'general', name: 'General' });
    const [viewingProfileId, setViewingProfileId] = useState(null);
    const [activeDmRecipient, setActiveDmRecipient] = useState(null);
    const [onlineStatus, setOnlineStatus] = useState({});

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

                const userStatusRef = ref(rtdb, `/status/${currentUser.uid}`);
                const isOnline = { state: 'online', last_changed: Date.now() };
                const isOffline = { state: 'offline', last_changed: Date.now() };
                set(userStatusRef, isOnline);
                onDisconnect(userStatusRef).set(isOffline);
                setUser(currentUser);
            } else {
                setUser(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const statusRef = ref(rtdb, '/status');
        const unsubscribe = onValue(statusRef, (snapshot) => {
            setOnlineStatus(snapshot.val() || {});
        });
        return () => unsubscribe();
    }, []);

    const handleViewProfile = (userId) => {
        setViewingProfileId(userId);
        setCurrentView('profile');
    };
    
    const handleStartDirectMessage = (recipient) => {
        setActiveDmRecipient(recipient);
        setCurrentView('dm');
    };

    const handleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try { await signInWithPopup(auth, provider); }
        catch (error) { console.error("Error during Google sign-in", error); }
    };

    const handleSignOut = async () => {
        try {
            if (user) {
                 const userStatusRef = ref(rtdb, `/status/${user.uid}`);
                 set(userStatusRef, { state: 'offline', last_changed: Date.now() });
            }
            await signOut(auth);
            setCurrentView('feed');
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    if (loading) return <LoadingSpinner />;
    if (!user) return <LoginScreen onLogin={handleLogin} />;

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans">
            <Sidebar
                user={user}
                setCurrentView={setCurrentView}
                currentView={currentView}
                setActiveChannel={setActiveChannel}
                onSignOut={handleSignOut}
                onViewProfile={handleViewProfile}
                onStartDirectMessage={handleStartDirectMessage}
                onlineStatus={onlineStatus}
            />
            <main className="flex-1 flex flex-col">
                <Header 
                    user={user} 
                    view={currentView} 
                    channelName={activeChannel.name}
                    dmRecipientName={activeDmRecipient?.displayName}
                />
                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                    {currentView === 'feed' && <FeedView user={user} onViewProfile={handleViewProfile} />}
                    {currentView === 'chat' && <ChatView user={user} channelId={activeChannel.id} />}
                    {currentView === 'profile' && <ProfileView loggedInUser={user} profileUserId={viewingProfileId || user.uid} onViewProfile={handleViewProfile} />}
                    {currentView === 'dm' && <DirectMessageView user={user} recipient={activeDmRecipient} />}
                </div>
            </main>
        </div>
    );
}

function LoginScreen({ onLogin }) {
    return ( <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white"> <div className="text-center p-8"> <h1 className="text-5xl font-bold mb-2">Welcome to CampusConnect</h1> <p className="text-lg text-gray-400 mb-8">Your college community hub.</p> <button onClick={onLogin} className="flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-transform transform hover:scale-105"> <LogIn className="mr-3" size={24} /> Sign In with Google </button> </div> </div> );
}

function LoadingSpinner() {
    return ( <div className="flex h-screen items-center justify-center bg-gray-900"> <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div> </div> );
}

