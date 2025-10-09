import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Bell, Heart, MessageCircle, UserPlus, Mail, X, Check, Trash2 } from 'lucide-react';

export default function NotificationsView({ user, onViewProfile, onStartDirectMessage, setCurrentView }) {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const notificationsRef = collection(db, 'users', user.uid, 'notifications');
        const q = query(notificationsRef, orderBy('createdAt', 'desc'));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notificationsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setNotifications(notificationsData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const markAsRead = async (notificationId) => {
        try {
            const notificationRef = doc(db, 'users', user.uid, 'notifications', notificationId);
            await updateDoc(notificationRef, { read: true });
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const deleteNotification = async (notificationId) => {
        try {
            const notificationRef = doc(db, 'users', user.uid, 'notifications', notificationId);
            await deleteDoc(notificationRef);
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const handleNotificationClick = async (notification) => {
        // Mark as read
        if (!notification.read) {
            await markAsRead(notification.id);
        }

        // Handle different notification types
        if (notification.message.includes('liked your post') || notification.message.includes('commented on your post')) {
            // Navigate to feed to see the post
            setCurrentView('feed');
        } else if (notification.message.includes('connection request')) {
            // Navigate to profile
            onViewProfile(notification.senderId);
        } else if (notification.message.includes('message') || notification.message.includes('sent you a message') || notification.message.includes('shared a post with you')) {
            // Navigate to DM
            onStartDirectMessage({
                id: notification.senderId,
                displayName: notification.senderName,
                photoURL: notification.senderPhotoURL
            });
        }
    };

    const getNotificationIcon = (message) => {
        if (message.includes('liked')) return <Heart className="text-red-500" size={20} />;
        if (message.includes('commented')) return <MessageCircle className="text-blue-500" size={20} />;
        if (message.includes('connection')) return <UserPlus className="text-green-500" size={20} />;
        if (message.includes('message') || message.includes('shared a post')) return <Mail className="text-purple-500" size={20} />;
        return <Bell className="text-gray-500" size={20} />;
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <p className="ml-3 text-gray-500">Loading notifications...</p>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                    <Bell className="mr-3 text-purple-600" size={24} />
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                        Notifications
                        {unreadCount > 0 && (
                            <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                                {unreadCount}
                            </span>
                        )}
                    </h2>
                </div>
                {notifications.length > 0 && (
                    <button
                        onClick={() => {
                            notifications.forEach(n => {
                                if (!n.read) markAsRead(n.id);
                            });
                        }}
                        className="text-sm text-purple-600 hover:text-purple-700 flex items-center"
                    >
                        <Check size={16} className="mr-1" />
                        Mark all as read
                    </button>
                )}
            </div>

            {notifications.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 p-8 rounded-lg text-center text-gray-500">
                    <Bell size={48} className="mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium mb-2">No notifications yet</h3>
                    <p>When people interact with your posts or send you messages, you'll see them here.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {notifications.map(notification => (
                        <div
                            key={notification.id}
                            className={`bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md transition-all hover:shadow-lg border-l-4 ${
                                notification.read 
                                    ? 'border-l-gray-300 dark:border-l-gray-600' 
                                    : 'border-l-purple-500 bg-purple-50 dark:bg-purple-900/20'
                            }`}
                        >
                            <div className="flex items-start justify-between">
                                <button
                                    onClick={() => handleNotificationClick(notification)}
                                    className="flex-1 flex items-start text-left hover:opacity-80 transition-opacity"
                                >
                                    <div className="flex-shrink-0 mr-3">
                                        {getNotificationIcon(notification.message)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center mb-1">
                                            <img 
                                                src={notification.senderPhotoURL} 
                                                alt={notification.senderName}
                                                className="w-8 h-8 rounded-full mr-2"
                                            />
                                            <div>
                                                <span className="font-semibold text-sm">
                                                    {notification.senderName}
                                                </span>
                                                <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">
                                                    {notification.message}
                                                </span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {notification.createdAt ? 
                                                new Date(notification.createdAt.seconds * 1000).toLocaleString() : 
                                                'Just now'
                                            }
                                        </p>
                                    </div>
                                </button>
                                <div className="flex items-center space-x-2">
                                    {!notification.read && (
                                        <button
                                            onClick={() => markAsRead(notification.id)}
                                            className="p-1 text-purple-600 hover:text-purple-700"
                                            title="Mark as read"
                                        >
                                            <Check size={16} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => deleteNotification(notification.id)}
                                        className="p-1 text-gray-400 hover:text-red-500"
                                        title="Delete notification"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}