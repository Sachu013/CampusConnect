import React, { useState, useEffect } from 'react';
import { db } from '@/firebaseConfig.js'; // Using the new '@' alias
import { collection, query, onSnapshot, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { User, MessageSquare, Newspaper, LogOut, PlusSquare, X, Users, UserCheck } from 'lucide-react';

export default function Sidebar({ user, setCurrentView, currentView, onSignOut, onViewProfile, onStartDirectMessage, onlineStatus, onJoinGroup, viewingProfileId }) {
    const [connections, setConnections] = useState([]);
    const [groups, setGroups] = useState([]);
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);


    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, "users", user.uid, "connections"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const connectionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setConnections(connectionsData);
        });
        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        if (!user) return;
        const groupsRef = query(collection(db, "groups"), where("members", "array-contains", user.uid));
        const unsubscribe = onSnapshot(groupsRef, (snapshot) => {
            const groupsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setGroups(groupsData);
        });
        return () => unsubscribe();
    }, [user]);

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
        onSignOut();
    };

    return (
        <>
            <aside className="w-64 bg-gray-800 text-white flex flex-col p-4">
                <div className="text-2xl font-bold text-center py-4 mb-4 border-b border-gray-700">BITWave</div>
                <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                    <nav className="space-y-2">
                        <button onClick={() => setCurrentView('feed')} className={`flex items-center w-full text-left p-3 rounded-lg transition-colors ${currentView === 'feed' ? 'bg-purple-600 text-white' : 'hover:bg-gray-700'}`}><Newspaper size={20} /><span className="ml-3 font-medium">Feed</span></button>
                        <button onClick={() => onViewProfile(user.uid)} className={`flex items-center w-full text-left p-3 rounded-lg transition-colors ${currentView === 'profile' && (!viewingProfileId || viewingProfileId === user.uid) ? 'bg-purple-600 text-white' : 'hover:bg-gray-700'}`}><User size={20} /><span className="ml-3 font-medium">Profile</span></button>
                        <button onClick={() => setCurrentView('networks')} className={`flex items-center w-full text-left p-3 rounded-lg transition-colors ${currentView === 'networks' ? 'bg-purple-600 text-white' : 'hover:bg-gray-700'}`}><UserCheck size={20} /><span className="ml-3 font-medium">Networks</span></button>
                    </nav>


                    <div className="pt-4 mt-4 border-t border-gray-700">
                        <div className="flex justify-between items-center px-3 mb-2">
                            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Groups</h3>
                            <button onClick={() => setIsCreatingGroup(true)} className="text-gray-400 hover:text-white">
                                <PlusSquare size={18} />
                            </button>
                        </div>
                        <div className="space-y-1">
                            {groups.map(group => (
                                <button 
                                    key={group.id} 
                                    onClick={() => onJoinGroup(group)}
                                    className="w-full text-left px-3 py-2 text-sm rounded-md text-gray-300 hover:bg-gray-700 hover:text-white flex items-center"
                                >
                                    <Users size={16} className="mr-2" />
                                    <span className="truncate">{group.name}</span>
                                    {group.createdBy === user.uid && (
                                        <span className="ml-2 text-xs text-yellow-500">Admin</span>
                                    )}
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

                <div className="mt-auto space-y-2">
                    <button 
                        onClick={() => setShowLogoutConfirm(true)}
                        className="w-full flex items-center p-3 text-left rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                    >
                        <LogOut size={20} />
                        <span className="ml-3 font-medium">Logout</span>
                    </button>
                    
                    <div className="flex items-center p-3 bg-gray-900 rounded-lg">
                        <img src={user.photoURL} alt="User" className="w-10 h-10 rounded-full" />
                        <div className="ml-3 flex-1">
                            <p className="font-semibold text-sm">{user.displayName}</p>
                            <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        </div>
                    </div>
                </div>
            </aside>
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
        </>
    );
}

function CreateGroupModal({ connections, onCreate, onClose }) {
    const [groupName, setGroupName] = useState('');
    const [selectedMembers, setSelectedMembers] = useState([]);
    
    const handleMemberToggle = (memberId) => {
        setSelectedMembers(prev => 
            prev.includes(memberId) 
                ? prev.filter(id => id !== memberId)
                : [...prev, memberId]
        );
    };
    
    const handleSubmit = (e) => {
        e.preventDefault();
        onCreate(groupName, selectedMembers);
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-md max-h-96 overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Create Private Group</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <X size={24}/>
                    </button>
                </div>
                
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="groupName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Group Name
                        </label>
                        <input 
                            type="text" 
                            id="groupName" 
                            value={groupName} 
                            onChange={(e) => setGroupName(e.target.value)} 
                            placeholder="e.g., Study Group"
                            className="w-full p-2 rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600" 
                            autoFocus 
                        />
                    </div>
                    
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Add Members ({selectedMembers.length} selected)
                        </label>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {connections.map(connection => (
                                <label key={connection.id} className="flex items-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        checked={selectedMembers.includes(connection.id)}
                                        onChange={() => handleMemberToggle(connection.id)}
                                        className="mr-3 rounded text-purple-600 focus:ring-purple-500"
                                    />
                                    <img src={connection.photoURL} alt={connection.displayName} className="w-8 h-8 rounded-full mr-2" />
                                    <span className="text-sm">{connection.displayName}</span>
                                </label>
                            ))}
                        </div>
                        {connections.length === 0 && (
                            <p className="text-sm text-gray-500">No connections available. Add some friends first!</p>
                        )}
                    </div>
                    
                    <div className="flex justify-end space-x-3">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            disabled={!groupName.trim()}
                            className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50"
                        >
                            Create Group
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function LogoutConfirmModal({ onConfirm, onClose }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-sm">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Confirm Logout</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <X size={24}/>
                    </button>
                </div>
                
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Are you sure you want to logout? You'll need to sign in again to access your account.
                </p>
                
                <div className="flex justify-end space-x-3">
                    <button 
                        onClick={onClose}
                        className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={onConfirm}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
}

