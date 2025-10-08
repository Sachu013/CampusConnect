import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig.js'; // Corrected to use relative path
import { collection, query, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { Bell, BellRing, X, Search } from 'lucide-react';

const timeSince = (date) => {
    if (!date) return '';
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    return Math.floor(seconds) + "s ago";
};

export default function Header({ view, channelName, dmRecipientName, groupName, user, onSearchToggle, onNotificationsToggle }) {
    const [notifications, setNotifications] = useState([]);
    
    const viewTitles = {
        feed: 'FeedZone',
        chat: `# ${channelName}`,
        profile: 'User Profile',
        dm: `Message with ${dmRecipientName || '...'}`,
        group: `${groupName || 'Group Chat'}`,
        search: 'Search',
        notifications: 'Notifications',
    };

    
    useEffect(() => {
        if (!user) return;
        const notifsRef = collection(db, 'users', user.uid, 'notifications');
        const q = query(notifsRef, orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [user]);
    
    
    const hasUnread = notifications.some(n => !n.read);

    return (
        <header className="flex-shrink-0 bg-white dark:bg-gray-800 shadow-sm p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center gap-4">
            <h1 className="text-xl font-semibold">{viewTitles[view]}</h1>
            
            <div className="flex items-center gap-4">
                {/* Search Icon */}
                <button 
                    onClick={onSearchToggle}
                    className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    title="Search"
                >
                    <Search size={20} className="text-gray-600 dark:text-gray-300" />
                </button>
                
                {/* Notifications Icon */}
                <div className="relative">
                    <button 
                        onClick={onNotificationsToggle}
                        className="relative p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        title="Notifications"
                    >
                        {hasUnread ? (
                            <BellRing size={20} className="text-purple-500" />
                        ) : (
                            <Bell size={20} className="text-gray-600 dark:text-gray-300" />
                        )}
                        {hasUnread && (
                            <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                        )}
                    </button>
                </div>
            </div>
        </header>
    );
}
