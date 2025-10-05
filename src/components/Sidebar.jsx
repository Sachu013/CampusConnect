import React, { useState, useEffect } from 'react';
import { db } from '@/firebaseConfig.js'; // Using the new '@' alias
import { collection, query, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { User, MessageSquare, Newspaper, LogOut, PlusSquare, X } from 'lucide-react';

export default function Sidebar({ user, setCurrentView, currentView, setActiveChannel, onSignOut, onViewProfile, onStartDirectMessage, onlineStatus }) {
    const [channels, setChannels] = useState([]);
    const [connections, setConnections] = useState([]);
    const [isCreatingChannel, setIsCreatingChannel] = useState(false);

    useEffect(() => {
        const q = query(collection(db, "channels"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const channelsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            channelsData.sort((a, b) => a.name.localeCompare(b.name));
            setChannels(channelsData);
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

    const handleCreateChannel = async (channelName) => {
        if (channelName.trim() === '') return;
        try {
            await addDoc(collection(db, "channels"), {
                name: channelName.trim(),
                createdBy: user.uid,
                createdAt: serverTimestamp()
            });
            setIsCreatingChannel(false);
        } catch (error) {
            console.error("Error creating channel:", error);
        }
    };

    return (
        <>
            <aside className="w-64 bg-gray-800 text-white flex flex-col p-4">
                <div className="text-2xl font-bold text-center py-4 mb-4 border-b border-gray-700">CampusConnect</div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                    <nav className="space-y-2">
                        <button onClick={() => setCurrentView('feed')} className={`flex items-center w-full text-left p-3 rounded-lg transition-colors ${currentView === 'feed' ? 'bg-purple-600 text-white' : 'hover:bg-gray-700'}`}><Newspaper size={20} /><span className="ml-3 font-medium">Feed</span></button>
                        <button onClick={() => onViewProfile(user.uid)} className={`flex items-center w-full text-left p-3 rounded-lg transition-colors ${currentView === 'profile' ? 'bg-purple-600 text-white' : 'hover:bg-gray-700'}`}><User size={20} /><span className="ml-3 font-medium">Profile</span></button>
                    </nav>

                    <div className="pt-4 mt-4 border-t border-gray-700">
                         <div className="flex justify-between items-center px-3 mb-2">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Channels</h3>
                            <button onClick={() => setIsCreatingChannel(true)} className="text-gray-400 hover:text-white">
                                <PlusSquare size={18} />
                            </button>
                        </div>
                        <div className="space-y-1">
                            <button onClick={() => { setActiveChannel({id: 'general', name: 'General'}); setCurrentView('chat'); }} className="w-full text-left px-3 py-2 text-sm rounded-md text-gray-300 hover:bg-gray-700 hover:text-white" ># General</button>
                            {channels.map(channel => (
                                <button key={channel.id} onClick={() => { setActiveChannel(channel); setCurrentView('chat'); }} className="w-full text-left px-3 py-2 text-sm rounded-md text-gray-300 hover:bg-gray-700 hover:text-white" >
                                    # {channel.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 mt-4 border-t border-gray-700">
                        <h3 className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Direct Messages</h3>
                        <div className="space-y-1">
                            {connections.map(connection => {
                                const isOnline = onlineStatus[connection.id]?.state === 'online';
                                return (
                                    <button key={connection.id} onClick={() => onStartDirectMessage(connection)} className="w-full text-left px-3 py-2 text-sm rounded-md text-gray-300 hover:bg-gray-700 hover:text-white flex items-center" >
                                        <div className="relative">
                                            <img src={connection.photoURL} alt={connection.displayName} className="w-6 h-6 rounded-full mr-2" />
                                            {isOnline && (
                                                <div className="absolute bottom-0 right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-gray-800"></div>
                                            )}
                                        </div>
                                        <span className="truncate">{connection.displayName}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

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
            {isCreatingChannel && (
                <CreateChannelModal onCreate={handleCreateChannel} onClose={() => setIsCreatingChannel(false)} />
            )}
        </>
    );
}

function CreateChannelModal({ onCreate, onClose }) {
    const [channelName, setChannelName] = useState('');
    const handleSubmit = (e) => { e.preventDefault(); onCreate(channelName); };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-sm">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Create a new channel</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><X size={24}/></button>
                </div>
                <form onSubmit={handleSubmit}>
                    <label htmlFor="channelName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Channel Name</label>
                    <input type="text" id="channelName" value={channelName} onChange={(e) => setChannelName(e.target.value)} placeholder="e.g., announcements" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600" autoFocus />
                     <div className="mt-6 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Cancel</button>
                        <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700">Create Channel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

