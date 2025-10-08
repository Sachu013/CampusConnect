import React, { useState, useEffect, useRef } from 'react';
import { db, storage } from '../firebaseConfig.js'; // Corrected to use relative path
import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Send, Trash2, Paperclip, X, Heart, MessageCircle, AlertTriangle } from 'lucide-react';

export default function DirectMessageView({ user, recipient, onViewProfile }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const messagesEndRef = useRef(null);
    const [dmChannelId, setDmChannelId] = useState(null);
    const [hoveredMessageId, setHoveredMessageId] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [messageToDelete, setMessageToDelete] = useState(null);

    // Effect to create a unique, consistent channel ID
    useEffect(() => {
        if (!user || !recipient) return;
        const ids = [user.uid, recipient.id].sort();
        const uniqueId = ids.join('_');
        setDmChannelId(uniqueId);
    }, [user, recipient]);

    // Effect to fetch messages for the current DM channel
    useEffect(() => {
        if (!dmChannelId) return;
        const messagesRef = collection(db, "directMessages", dmChannelId, "messages");
        const q = query(messagesRef, orderBy("createdAt"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [dmChannelId]);

    // Effect to auto-scroll to the latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // handleSendMessage now supports images
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if ((newMessage.trim() === '' && !imageFile) || !dmChannelId) return;

        setUploading(true);
        let imageUrl = '';
        let imagePath = '';

        if (imageFile) {
            imagePath = `directMessages/${dmChannelId}/${Date.now()}_${imageFile.name}`;
            const imageRef = ref(storage, imagePath);
            const snapshot = await uploadBytes(imageRef, imageFile);
            imageUrl = await getDownloadURL(snapshot.ref);
        }

        const messagesRef = collection(db, "directMessages", dmChannelId, "messages");
        await addDoc(messagesRef, {
            text: newMessage,
            imageUrl: imageUrl,
            uid: user.uid,
            displayName: user.displayName,
            photoURL: user.photoURL,
            createdAt: serverTimestamp(),
        });

        setNewMessage('');
        setImageFile(null);
        setUploading(false);
    };
    
    // handleDeleteMessage logic
    const handleDeleteMessage = (messageId) => {
        setMessageToDelete(messageId);
        setShowDeleteConfirm(true);
    };

    const confirmDeleteMessage = async () => {
        if (!dmChannelId || !messageToDelete) return;
        const messageRef = doc(db, "directMessages", dmChannelId, "messages", messageToDelete);
        try {
            await deleteDoc(messageRef);
        } catch (error) {
            console.error("Error deleting message:", error);
        }
        setShowDeleteConfirm(false);
        setMessageToDelete(null);
    };

    if (!recipient) {
        return <div className="flex items-center justify-center h-full text-gray-500">Select a connection to start messaging.</div>;
    }

    return (
        <div className="flex flex-col h-full max-w-4xl mx-auto">
            <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-white dark:bg-gray-800 rounded-t-lg">
                {messages.map(msg => {
                    const isOwnMessage = (msg.uid || msg.senderId) === user.uid;
                    return (
                    <div 
                        key={msg.id} 
                        className={`group flex items-start gap-3 p-2 rounded-lg ${isOwnMessage ? 'flex-row-reverse' : ''}`}
                        onMouseEnter={() => setHoveredMessageId(msg.id)}
                        onMouseLeave={() => setHoveredMessageId(null)}
                    >
                        <img src={msg.photoURL || msg.senderPhotoURL} alt={msg.displayName || msg.senderName} className="w-10 h-10 rounded-full"/>
                        <div className={`p-3 rounded-lg max-w-md ${isOwnMessage ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                           <p className="font-bold text-sm mb-1">{msg.displayName || msg.senderName}</p>
                           
                           {/* Regular message content */}
                           {msg.imageUrl && !msg.sharedPost && (
                               <img src={msg.imageUrl} alt="Sent content" className="rounded-lg my-2 max-w-xs" />
                           )}
                           {msg.text && <p className="text-sm whitespace-pre-wrap">{msg.text}</p>}
                           
                           {/* Shared post content */}
                           {msg.sharedPost && (
                               <button 
                                   onClick={() => onViewProfile(msg.sharedPost.authorId)}
                                   className="w-full mt-2 p-3 bg-white/10 rounded-lg border border-white/20 hover:bg-white/20 transition-colors"
                               >
                                   <div className="flex items-center mb-2">
                                       <img src={msg.sharedPost.authorPhotoURL} alt={msg.sharedPost.authorName} className="w-6 h-6 rounded-full mr-2" />
                                       <span className="text-xs font-medium">{msg.sharedPost.authorName}</span>
                                   </div>
                                   <p className="text-xs mb-2 text-left">{msg.sharedPost.content}</p>
                                   {msg.sharedPost.imageUrl && (
                                       <img src={msg.sharedPost.imageUrl} alt="Shared post" className="rounded-lg max-w-full mb-2" />
                                   )}
                                   <div className="flex items-center text-xs opacity-70">
                                       <Heart size={12} className="mr-1" />
                                       <span className="mr-3">{msg.sharedPost.likes?.length || 0}</span>
                                       <MessageCircle size={12} className="mr-1" />
                                       <span>Click to view profile</span>
                                   </div>
                               </button>
                           )}
                           
                           <p className={`text-xs mt-1 opacity-70 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                               {msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                           </p>
                        </div>
                        {isOwnMessage && hoveredMessageId === msg.id && (
                             <button onClick={() => handleDeleteMessage(msg.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 size={16} />
                            </button>
                        )}
                    </div>
                    );
                })}
                 <div ref={messagesEndRef} />
            </div>
            <div className="p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700 rounded-b-lg">
                {imageFile && (
                    <div className="mb-2 relative w-24">
                        <img src={URL.createObjectURL(imageFile)} alt="Preview" className="rounded-lg" />
                        <button onClick={() => setImageFile(null)} className="absolute -top-2 -right-2 bg-gray-700 text-white rounded-full p-0.5"><X size={14} /></button>
                    </div>
                )}
                <form onSubmit={handleSendMessage} className="flex items-center">
                    <label className="cursor-pointer text-gray-500 hover:text-purple-500 p-2">
                        <Paperclip size={20} />
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} />
                    </label>
                     <input
                        type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={`Message ${recipient.displayName}`}
                        className="flex-1 bg-gray-100 dark:bg-gray-700 p-3 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 mx-2"
                        autoFocus
                    />
                    <button type="submit" disabled={uploading} className="bg-purple-600 text-white p-3 rounded-full hover:bg-purple-700 transition disabled:opacity-50">
                        {uploading ? '...' : <Send size={20}/>}
                    </button>
                </form>
            </div>
            
            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <DeleteMessageModal 
                    onConfirm={confirmDeleteMessage}
                    onClose={() => {
                        setShowDeleteConfirm(false);
                        setMessageToDelete(null);
                    }}
                />
            )}
        </div>
    );
}

function DeleteMessageModal({ onConfirm, onClose }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-sm">
                <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mr-4">
                        <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Message</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone</p>
                    </div>
                </div>
                
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Are you sure you want to delete this message? It will be permanently removed from the conversation.
                </p>
                
                <div className="flex justify-end space-x-3">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={onConfirm}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center"
                    >
                        <Trash2 size={16} className="mr-2" />
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

