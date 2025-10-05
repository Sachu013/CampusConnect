import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebaseConfig.js'; // Corrected to relative path
import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { Send } from 'lucide-react';

export default function DirectMessageView({ user, recipient }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);
    const [dmChannelId, setDmChannelId] = useState(null);

    // Effect to create a unique, consistent channel ID for the two users
    useEffect(() => {
        if (!user || !recipient) return;

        // Sort the user IDs alphabetically to ensure the channel ID is always the same
        const ids = [user.uid, recipient.id].sort();
        const uniqueId = ids.join('_');
        setDmChannelId(uniqueId);

    }, [user, recipient]);

    // Effect to fetch messages for the current DM channel
    useEffect(() => {
        if (!dmChannelId) return;

        const messagesRef = collection(db, "dms", dmChannelId, "messages");
        const q = query(messagesRef, orderBy("createdAt"));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const msgs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMessages(msgs);
        });

        return () => unsubscribe();
    }, [dmChannelId]);

    // Effect to auto-scroll to the latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (newMessage.trim() === '' || !dmChannelId) return;

        const messagesRef = collection(db, "dms", dmChannelId, "messages");
        await addDoc(messagesRef, {
            text: newMessage,
            createdAt: serverTimestamp(),
            senderId: user.uid,
            senderName: user.displayName,
            senderPhotoURL: user.photoURL,
        });
        setNewMessage('');
    };

    if (!recipient) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                Select a connection to start messaging.
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full max-w-4xl mx-auto">
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white dark:bg-gray-800 rounded-t-lg">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex items-start gap-3 ${msg.senderId === user.uid ? 'flex-row-reverse' : ''}`}>
                        <img src={msg.senderPhotoURL} alt={msg.senderName} className="w-10 h-10 rounded-full"/>
                        <div className={`p-3 rounded-lg max-w-md ${msg.senderId === user.uid ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                           <p className="font-bold text-sm mb-1">{msg.senderName}</p>
                           <p className="text-sm">{msg.text}</p>
                           <p className={`text-xs mt-1 opacity-70 ${msg.senderId === user.uid ? 'text-right' : 'text-left'}`}>
                               {msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                           </p>
                        </div>
                    </div>
                ))}
                 <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700 rounded-b-lg flex items-center">
                 <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Message ${recipient.displayName}`}
                    className="flex-1 bg-gray-100 dark:bg-gray-700 p-3 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
                    autoFocus
                />
                <button type="submit" className="ml-3 bg-purple-600 text-white p-3 rounded-full hover:bg-purple-700 transition">
                    <Send size={20}/>
                </button>
            </form>
        </div>
    );
}

