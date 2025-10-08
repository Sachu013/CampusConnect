import React, { useState, useEffect, useRef } from 'react';
import { db, storage } from '../firebaseConfig';
import { 
    collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, 
    doc, updateDoc, deleteDoc, getDoc, getDocs, arrayUnion, arrayRemove 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Send, Image as ImageIcon, Settings, UserMinus, Crown, Trash2, X, UserPlus, LogOut } from 'lucide-react';

export default function GroupChatView({ user, groupId, onLeaveGroup }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [groupInfo, setGroupInfo] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (!groupId) return;

        // Fetch group info
        const fetchGroupInfo = async () => {
            const groupDoc = await getDoc(doc(db, 'groups', groupId));
            if (groupDoc.exists()) {
                setGroupInfo({ id: groupDoc.id, ...groupDoc.data() });
            }
        };
        fetchGroupInfo();

        // Listen to messages
        const messagesRef = collection(db, 'groups', groupId, 'messages');
        const q = query(messagesRef, orderBy('createdAt'));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const msgs = [];
            querySnapshot.forEach(doc => msgs.push({ id: doc.id, ...doc.data() }));
            setMessages(msgs);
        });

        return () => unsubscribe();
    }, [groupId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const isAdmin = groupInfo?.createdBy === user.uid;
    const isMember = groupInfo?.members?.includes(user.uid);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (newMessage.trim() === '' && !imageFile) return;

        setUploading(true);
        let imageUrl = '';

        if (imageFile) {
            const imagePath = `groups/${groupId}/images/${Date.now()}_${imageFile.name}`;
            const imageRef = ref(storage, imagePath);
            const snapshot = await uploadBytes(imageRef, imageFile);
            imageUrl = await getDownloadURL(snapshot.ref);
        }

        try {
            const messagesRef = collection(db, 'groups', groupId, 'messages');
            await addDoc(messagesRef, {
                text: newMessage,
                imageUrl: imageUrl,
                createdAt: serverTimestamp(),
                uid: user.uid,
                displayName: user.displayName,
                photoURL: user.photoURL,
            });

            setNewMessage('');
            setImageFile(null);
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteMessage = async (messageId, messageUid) => {
        // Only allow deletion if user is admin or message owner
        if (user.uid !== messageUid && !isAdmin) return;

        if (window.confirm('Are you sure you want to delete this message?')) {
            try {
                await deleteDoc(doc(db, 'groups', groupId, 'messages', messageId));
            } catch (error) {
                console.error('Error deleting message:', error);
            }
        }
    };

    const handleRemoveMember = async (memberId) => {
        if (!isAdmin) return;

        if (window.confirm('Are you sure you want to remove this member?')) {
            try {
                const groupRef = doc(db, 'groups', groupId);
                await updateDoc(groupRef, {
                    members: arrayRemove(memberId)
                });
            } catch (error) {
                console.error('Error removing member:', error);
            }
        }
    };

    const handleDeleteGroup = async () => {
        if (!isAdmin) return;

        if (window.confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
            try {
                await deleteDoc(doc(db, 'groups', groupId));
                onLeaveGroup();
            } catch (error) {
                console.error('Error deleting group:', error);
            }
        }
    };

    const handleLeaveGroup = async () => {
        try {
            const groupRef = doc(db, 'groups', groupId);
            await updateDoc(groupRef, {
                members: arrayRemove(user.uid)
            });
            setShowLeaveConfirm(false);
            onLeaveGroup();
        } catch (error) {
            console.error('Error leaving group:', error);
        }
    };

    if (!isMember) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                    <p className="text-lg font-medium">Access Restricted</p>
                    <p>You don't have permission to view this group chat.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            {/* Group Header */}
            <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center">
                    <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold mr-3">
                        {groupInfo?.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                        <h2 className="font-semibold">{groupInfo?.name}</h2>
                        <p className="text-sm text-gray-500">{groupInfo?.members?.length || 0} members</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2">
                    {isAdmin && (
                        <button
                            onClick={() => setShowSettings(true)}
                            className="p-2 text-gray-500 hover:text-purple-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                            title="Group Settings"
                        >
                            <Settings size={20} />
                        </button>
                    )}
                    {!isAdmin && (
                        <button
                            onClick={() => setShowLeaveConfirm(true)}
                            className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                            title="Leave Group"
                        >
                            <LogOut size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex items-start gap-3 ${msg.uid === user.uid ? 'flex-row-reverse' : ''}`}>
                        <img src={msg.photoURL} alt={msg.displayName} className="w-10 h-10 rounded-full" />
                        <div className={`group relative max-w-xs lg:max-w-md ${msg.uid === user.uid ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700'} rounded-lg p-3`}>
                            <div className="flex items-center justify-between mb-1">
                                <p className="font-semibold text-sm">{msg.displayName}</p>
                                {(msg.uid === user.uid || isAdmin) && (
                                    <button
                                        onClick={() => handleDeleteMessage(msg.id, msg.uid)}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/20"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                )}
                            </div>
                            {msg.text && <p className="break-words">{msg.text}</p>}
                            {msg.imageUrl && (
                                <img src={msg.imageUrl} alt="Shared image" className="rounded-lg mt-2 max-w-full" />
                            )}
                            <p className="text-xs opacity-70 mt-1 text-right">
                                {msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                            </p>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                {imageFile && (
                    <div className="mb-3 relative inline-block">
                        <img src={URL.createObjectURL(imageFile)} alt="Preview" className="rounded-lg max-h-20" />
                        <button 
                            onClick={() => setImageFile(null)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                        >
                            <X size={12} />
                        </button>
                    </div>
                )}
                <form onSubmit={handleSendMessage} className="flex items-center space-x-4">
                    <label className="cursor-pointer text-purple-500 hover:text-purple-600">
                        <ImageIcon size={24} />
                        <input 
                            type="file" 
                            className="hidden" 
                            accept="image/*" 
                            onChange={(e) => setImageFile(e.target.files[0])} 
                        />
                    </label>
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={`Message ${groupInfo?.name || 'group'}`}
                        className="flex-1 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border-2 border-transparent focus:outline-none focus:border-purple-500"
                    />
                    <button 
                        type="submit" 
                        disabled={uploading}
                        className="p-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition disabled:opacity-50"
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>

            {/* Group Settings Modal (Admin Only) */}
            {showSettings && isAdmin && (
                <GroupSettingsModal 
                    groupInfo={groupInfo}
                    onClose={() => setShowSettings(false)}
                    onRemoveMember={handleRemoveMember}
                    onDeleteGroup={handleDeleteGroup}
                    currentUser={user}
                    groupId={groupId}
                />
            )}
            {showLeaveConfirm && (
                <LeaveGroupModal 
                    groupName={groupInfo?.name}
                    onConfirm={handleLeaveGroup}
                    onClose={() => setShowLeaveConfirm(false)}
                />
            )}
        </div>
    );
}

function GroupSettingsModal({ groupInfo, onClose, onRemoveMember, onDeleteGroup, currentUser, groupId }) {
    const [members, setMembers] = useState([]);
    const [availableConnections, setAvailableConnections] = useState([]);
    const [showAddMembers, setShowAddMembers] = useState(false);
    const [selectedNewMembers, setSelectedNewMembers] = useState([]);

    useEffect(() => {
        // Fetch member details
        const fetchMembers = async () => {
            if (!groupInfo?.members) return;
            
            const memberPromises = groupInfo.members.map(async (memberId) => {
                const memberDoc = await getDoc(doc(db, 'users', memberId));
                return { id: memberId, ...memberDoc.data() };
            });
            
            const memberData = await Promise.all(memberPromises);
            setMembers(memberData);
        };

        fetchMembers();
        
        // Fetch available connections to add
        const fetchAvailableConnections = async () => {
            if (!currentUser?.uid) return;
            
            const connectionsRef = collection(db, 'users', currentUser.uid, 'connections');
            const connectionsSnapshot = await getDocs(connectionsRef);
            const allConnections = connectionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Filter out users who are already members
            const available = allConnections.filter(conn => !groupInfo?.members?.includes(conn.id));
            setAvailableConnections(available);
        };
        
        fetchAvailableConnections();
    }, [groupInfo, currentUser]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-md max-h-96 overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Group Settings</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <X size={24}/>
                    </button>
                </div>
                
                <div className="mb-6">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="font-semibold">Members ({members.length})</h3>
                        <button
                            onClick={() => setShowAddMembers(true)}
                            className="flex items-center px-3 py-1 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700"
                        >
                            <UserPlus size={14} className="mr-1" />
                            Add Members
                        </button>
                    </div>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                        {members.map(member => (
                            <div key={member.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700">
                                <div className="flex items-center">
                                    <img src={member.photoURL} alt={member.displayName} className="w-8 h-8 rounded-full mr-2" />
                                    <div>
                                        <p className="font-medium text-sm">{member.displayName}</p>
                                        {member.id === groupInfo.createdBy && (
                                            <div className="flex items-center text-xs text-yellow-600">
                                                <Crown size={12} className="mr-1" />
                                                Admin
                                            </div>
                                        )}
                                    </div>
                                </div>
                                {member.id !== groupInfo.createdBy && member.id !== currentUser.uid && (
                                    <button
                                        onClick={() => onRemoveMember(member.id)}
                                        className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                                    >
                                        <UserMinus size={16} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                
                <div className="border-t dark:border-gray-600 pt-4">
                    <button
                        onClick={onDeleteGroup}
                        className="w-full bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 flex items-center justify-center"
                    >
                        <Trash2 size={16} className="mr-2" />
                        Delete Group
                    </button>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                        This action cannot be undone
                    </p>
                </div>
            </div>
            
            {/* Add Members Modal */}
            {showAddMembers && (
                <AddMembersModal 
                    connections={availableConnections}
                    onClose={() => {
                        setShowAddMembers(false);
                        setSelectedNewMembers([]);
                    }}
                    onAddMembers={async (memberIds) => {
                        try {
                            const groupRef = doc(db, 'groups', groupId);
                            await updateDoc(groupRef, {
                                members: arrayUnion(...memberIds)
                            });
                            setShowAddMembers(false);
                            setSelectedNewMembers([]);
                        } catch (error) {
                            console.error('Error adding members:', error);
                        }
                    }}
                />
            )}
        </div>
    );
}

function AddMembersModal({ connections, onClose, onAddMembers }) {
    const [selectedMembers, setSelectedMembers] = useState([]);
    
    const toggleMember = (memberId) => {
        setSelectedMembers(prev => 
            prev.includes(memberId) 
                ? prev.filter(id => id !== memberId)
                : [...prev, memberId]
        );
    };
    
    const handleAddMembers = () => {
        if (selectedMembers.length > 0) {
            onAddMembers(selectedMembers);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-md max-h-96 overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Add Members</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <X size={24}/>
                    </button>
                </div>
                
                {connections.length === 0 ? (
                    <div className="text-center text-gray-500 py-6">
                        <p>No available connections to add.</p>
                    </div>
                ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
                        {connections.map(connection => (
                            <label key={connection.id} className="flex items-center p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                                <input 
                                    type="checkbox"
                                    checked={selectedMembers.includes(connection.id)}
                                    onChange={() => toggleMember(connection.id)}
                                    className="mr-3 rounded text-purple-600 focus:ring-purple-500"
                                />
                                <img src={connection.photoURL} alt={connection.displayName} className="w-8 h-8 rounded-full mr-2" />
                                <span className="text-sm">{connection.displayName}</span>
                            </label>
                        ))}
                    </div>
                )}
                
                <div className="flex justify-end space-x-3">
                    <button 
                        onClick={onClose}
                        className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleAddMembers}
                        disabled={selectedMembers.length === 0}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50"
                    >
                        Add ({selectedMembers.length})
                    </button>
                </div>
            </div>
        </div>
    );
}

function LeaveGroupModal({ groupName, onConfirm, onClose }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-sm">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Leave Group</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <X size={24}/>
                    </button>
                </div>
                
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Are you sure you want to leave <strong>{groupName}</strong>? You won't be able to see new messages unless someone adds you back.
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
                        Leave Group
                    </button>
                </div>
            </div>
        </div>
    );
}
