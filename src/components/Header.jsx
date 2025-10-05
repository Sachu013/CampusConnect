import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig.js';
import { collection, query, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { Bell, BellRing } from 'lucide-react';

// A helper function to format time since the notification
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


export default function Header({ view, channelName, dmRecipientName, user }) {
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    
    const viewTitles = {
        feed: 'News Feed',
        chat: `# ${channelName}`,
        profile: 'User Profile',
        dm: `Message with ${dmRecipientName || '...'}`,
    };
    
    useEffect(() => {
        if (!user) return;
        
        const notifsRef = collection(db, 'users', user.uid, 'notifications');
        const q = query(notifsRef, orderBy('createdAt', 'desc'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setNotifications(notifs);
        });
        
        return () => unsubscribe();
    }, [user]);
    
    const handleNotificationClick = async (notification) => {
        const notifRef = doc(db, 'users', user.uid, 'notifications', notification.id);
        await updateDoc(notifRef, { read: true });
        setShowNotifications(false);
        // In a future step, we could add logic here to navigate to the relevant post or user.
    };
    
    const hasUnread = notifications.some(n => !n.read);

    return (
        <header className="flex-shrink-0 bg-white dark:bg-gray-800 shadow-sm p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h1 className="text-xl font-semibold">{viewTitles[view]}</h1>
            
            <div className="relative">
                <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                    {hasUnread ? <BellRing className="text-purple-500" /> : <Bell />}
                    {hasUnread && <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></div>}
                </button>
                
                {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border dark:border-gray-700 z-50">
                        <div className="p-3 font-semibold border-b dark:border-gray-700">Notifications</div>
                        <div className="max-h-96 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <p className="text-center text-gray-500 p-4">No new notifications.</p>
                            ) : (
                                notifications.map(notif => (
                                    <button
                                        key={notif.id}
                                        onClick={() => handleNotificationClick(notif)}
                                        className={`w-full text-left p-3 flex items-start gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 ${!notif.read ? 'bg-purple-50 dark:bg-purple-900/20' : ''}`}
                                    >
                                        <div className="flex-shrink-0 mt-1">
                                            <img src={notif.senderPhotoURL} alt={notif.senderName} className="w-8 h-8 rounded-full" />
                                        </div>
                                        <div>
                                            <p className="text-sm">
                                                <span className="font-bold">{notif.senderName}</span> {notif.message}
                                            </p>
                                            <p className="text-xs text-purple-600 dark:text-purple-400">
                                                {timeSince(notif.createdAt?.toDate())}
                                            </p>
                                        </div>
                                         {!notif.read && <div className="ml-auto mt-1 w-2.5 h-2.5 bg-blue-500 rounded-full self-center"></div>}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}

