import React, { useState, useEffect } from 'react';

// Using the new '@' alias for clean, reliable imports
import { auth, db, rtdb } from '@/firebaseConfig.js';
import ProfileView from '@/components/ProfileView.jsx';
import FeedView from '@/components/FeedView.jsx';
import Sidebar, { CreateGroupModal, LogoutConfirmModal } from '@/components/Sidebar.jsx';
import DirectMessageView from '@/components/DirectMessageView.jsx';
import Header from '@/components/Header.jsx';
import SearchContainer from '@/components/SearchContainer.jsx';
import NotificationsView from '@/components/NotificationsView.jsx';
import GroupChatView from '@/components/GroupChatView.jsx';
import NetworksView from '@/components/NetworksView.jsx';
import EventsView from '@/components/EventsView.jsx';

// Import Firebase SDKs
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, addDoc, query, onSnapshot, where } from 'firebase/firestore';
import { ref, onValue, set, onDisconnect } from "firebase/database";
import { LogIn } from 'lucide-react';

export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentView, setCurrentView] = useState('feed');
    const [viewingProfileId, setViewingProfileId] = useState(null);
    const [activeDmRecipient, setActiveDmRecipient] = useState(null);
    const [activeGroup, setActiveGroup] = useState(null);
    const [onlineStatus, setOnlineStatus] = useState({});
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [connections, setConnections] = useState([]);
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    // Navigation target for Events/Notices from notifications
    const [eventsNav, setEventsNav] = useState(null); // { tab: 'events'|'notices', id: string }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const ok = currentUser.emailVerified && currentUser.email?.toLowerCase().endsWith('@bitsathy.ac.in');
                if (!ok) {
                    try { await currentUser.delete(); } catch (e) {}
                    try { await signOut(auth); } catch (e) {}
                    setLoading(false);
                    return;
                }
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

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, "users", user.uid, "connections"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const connectionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setConnections(connectionsData);
        });
        return () => unsubscribe();
    }, [user]);

    const handleViewProfile = (userId) => {
        setViewingProfileId(userId);
        setCurrentView('profile');
    };
    
    const handleStartDirectMessage = (recipient) => {
        setActiveDmRecipient(recipient);
        setCurrentView('dm');
    };

    const handleJoinGroup = (group) => {
        setActiveGroup(group);
        setCurrentView('group');
    };

    const handleSearchToggle = () => {
        setCurrentView('search');
    };

    const handleNotificationsToggle = () => {
        setCurrentView('notifications');
    };

    const handleLogin = async () => {
        const provider = new GoogleAuthProvider();
        // Hint the Google account picker to the college domain (UX only)
        provider.setCustomParameters({ hd: 'bitsathy.ac.in' });
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error during Google sign-in", error);
        }
        const u = auth.currentUser;
        const ok = u?.emailVerified && u?.email?.toLowerCase().endsWith('@bitsathy.ac.in');
        if (!ok && u) {
            try { await u.delete(); } catch (e) {}
            try { await signOut(auth); } catch (e) {}
            alert('Please sign in with your @bitsathy.ac.in email');
        }
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

    const handleCreateGroup = async (groupName, selectedMembers) => {
        if (groupName.trim() === '') return;
        try {
            const members = [user.uid, ...selectedMembers];
            await addDoc(collection(db, "groups"), {
                name: groupName.trim(),
                createdBy: user.uid,
                members: members,
                createdAt: serverTimestamp(),
                private: true
            });
            setIsCreatingGroup(false);
        } catch (error) {
            console.error("Error creating group:", error);
        }
    };

    const handleLogoutConfirm = () => {
        setShowLogoutConfirm(false);
        handleSignOut();
    };

    if (loading) return <LoadingSpinner />;
    if (!user) return <LoginScreen onLogin={handleLogin} />;

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans">
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
            
            {/* Sidebar */}
            <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed md:static md:translate-x-0 inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out md:z-auto`}>
                <Sidebar
                    user={user}
                    setCurrentView={setCurrentView}
                    currentView={currentView}
                    onSignOut={handleSignOut}
                    onViewProfile={handleViewProfile}
                    onStartDirectMessage={handleStartDirectMessage}
                    onJoinGroup={handleJoinGroup}
                    onlineStatus={onlineStatus}
                    viewingProfileId={viewingProfileId}
                    sidebarOpen={sidebarOpen}
                    setSidebarOpen={setSidebarOpen}
                    onCreateGroup={() => setIsCreatingGroup(true)}
                    onShowLogoutConfirm={() => setShowLogoutConfirm(true)}
                />
            </div>
            
            <main className="flex-1 flex flex-col min-w-0">
                <Header 
                    user={user} 
                    view={currentView} 
                    dmRecipientName={activeDmRecipient?.displayName}
                    groupName={activeGroup?.name}
                    onSearchToggle={handleSearchToggle}
                    onNotificationsToggle={handleNotificationsToggle}
                    sidebarOpen={sidebarOpen}
                    setSidebarOpen={setSidebarOpen}
                />
                <div className="flex-1 overflow-y-auto p-3 md:p-6">
                    {currentView === 'feed' && <FeedView user={user} onViewProfile={handleViewProfile} />}
                    {currentView === 'search' && <SearchContainer user={user} onViewProfile={handleViewProfile} />}
                    {currentView === 'notifications' && (
                        <NotificationsView 
                            user={user} 
                            onViewProfile={handleViewProfile}
                            onStartDirectMessage={handleStartDirectMessage}
                            setCurrentView={setCurrentView}
                            setEventsNav={setEventsNav}
                        />
                    )}
                    {currentView === 'networks' && (
                        <NetworksView 
                            user={user}
                            onViewProfile={handleViewProfile}
                            onStartDirectMessage={handleStartDirectMessage}
                        />
                    )}
                    {currentView === 'events' && (
                        <EventsView 
                            user={user}
                            initialTab={eventsNav?.tab}
                            highlightId={eventsNav?.id}
                        />
                    )}
                    {currentView === 'profile' && <ProfileView loggedInUser={user} profileUserId={viewingProfileId || user.uid} onViewProfile={handleViewProfile} />}
                    {currentView === 'dm' && <DirectMessageView user={user} recipient={activeDmRecipient} onViewProfile={handleViewProfile} />}
                    {currentView === 'group' && (
                        <GroupChatView 
                            user={user} 
                            groupId={activeGroup?.id}
                            onLeaveGroup={() => setCurrentView('feed')}
                        />
                    )}
                </div>
            </main>
            
            {/* Modals rendered at app level for proper overlay positioning */}
            {isCreatingGroup && (
                <CreateGroupModal 
                    connections={connections}
                    onCreate={handleCreateGroup} 
                    onClose={() => setIsCreatingGroup(false)} 
                />
            )}
            {showLogoutConfirm && (
                <LogoutConfirmModal 
                    onConfirm={handleLogoutConfirm}
                    onClose={() => setShowLogoutConfirm(false)}
                />
            )}
        </div>
    );
}

function LoginScreen({ onLogin }) {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
                {/* Main card */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-8">
                    {/* Header section */}
                    <div className="text-center mb-8">
                        {/* Logo */}
                        <div className="w-16 h-16 mx-auto mb-4 bg-purple-600 rounded-lg flex items-center justify-center shadow-md">
                            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z"/>
                            </svg>
                        </div>
                        
                        {/* Title */}
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                            CampusConnect
                        </h1>
                        <p className="text-gray-600 dark:text-gray-300 mb-1">College Community Platform</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Connect with classmates • Share knowledge • Build networks</p>
                    </div>
                    
                    {/* Features grid */}
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div className="w-10 h-10 mx-auto mb-2 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd"/>
                                </svg>
                            </div>
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Discussion</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Chat & Forums</p>
                        </div>
                        
                        <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div className="w-10 h-10 mx-auto mb-2 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 102 0V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 1H6v7h2V6z" clipRule="evenodd"/>
                                    <path d="M11 3a1 1 0 100 2h2a1 1 0 100-2h-2z"/>
                                </svg>
                            </div>
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Resources</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Study Materials</p>
                        </div>
                        
                        <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div className="w-10 h-10 mx-auto mb-2 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                                </svg>
                            </div>
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Network</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Connect & Share</p>
                        </div>
                        
                        <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                            <div className="w-10 h-10 mx-auto mb-2 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                                <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                </svg>
                            </div>
                            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Events</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Campus Activities</p>
                        </div>
                    </div>
                    
                    {/* Sign in button */}
                    <button 
                        onClick={onLogin}
                        className="w-full flex items-center justify-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 border border-purple-600"
                    >
                        <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Sign in with Google
                    </button>
                    
                    {/* Divider */}
                    <div className="mt-6 mb-4 flex items-center">
                        <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
                        <div className="px-3 text-sm text-gray-500 dark:text-gray-400">Secure Authentication</div>
                        <div className="flex-1 border-t border-gray-300 dark:border-gray-600"></div>
                    </div>
                    
                    {/* Info section */}
                    <div className="text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            For college students and faculty members only
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                            By continuing, you agree to our <span className="text-purple-600 dark:text-purple-400">Terms</span> and <span className="text-purple-600 dark:text-purple-400">Privacy Policy</span>
                        </p>
                    </div>
                </div>
                
                {/* Footer */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Join your campus community today
                    </p>
                </div>
            </div>
        </div>
    );
}

function LoadingSpinner() {
    return ( <div className="flex h-screen items-center justify-center bg-gray-900"> <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-purple-500"></div> </div> );
}

