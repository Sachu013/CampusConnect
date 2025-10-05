import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebaseConfig.js'; // Corrected to relative path
import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { Send } from 'lucide-react';

export default function ChatView({ user, channelId }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (!channelId) return;

        // Note: The path to messages is different for public channels
        const messagesRef = collection(db, "channels", channelId, "messages");
        const q = query(messagesRef, orderBy("createdAt"));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const msgs = [];
            querySnapshot.forEach(doc => msgs.push({ id: doc.id, ...doc.data() }));
            setMessages(msgs);
        });

        return () => unsubscribe();
    }, [channelId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (newMessage.trim() === '') return;

        const messagesRef = collection(db, "channels", channelId, "messages");
        await addDoc(messagesRef, {
            text: newMessage,
            createdAt: serverTimestamp(),
            uid: user.uid,
            displayName: user.displayName,
            photoURL: user.photoURL,
        });

        setNewMessage('');
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex items-start gap-3 ${msg.uid === user.uid ? 'flex-row-reverse' : ''}`}>
                        <img src={msg.photoURL} alt={msg.displayName} className="w-10 h-10 rounded-full" />
                        <div className={`p-3 rounded-lg max-w-xs lg:max-w-md ${msg.uid === user.uid ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                            <p className="font-semibold text-sm mb-1">{msg.displayName}</p>
                            <p>{msg.text}</p>
                            <p className="text-xs opacity-70 mt-1 text-right">
                                {msg.createdAt ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                            </p>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <form onSubmit={handleSendMessage} className="flex items-center space-x-4">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={`Message #${channelId}`}
                        className="flex-1 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border-2 border-transparent focus:outline-none focus:border-purple-500"
                    />
                    <button type="submit" className="p-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition">
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
}

