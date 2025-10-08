import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebaseConfig.js'; // Corrected to relative path
import { collection, query, where, orderBy, onSnapshot, doc, setDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { Edit, X, UserPlus, CheckCircle, UserX, UserCheck, Send } from 'lucide-react';
import PostItem from './PostItem.jsx'; // Corrected to relative path

// createNotification helper function (unchanged)
const createNotification = async (recipientId, sender, message) => {
    if (recipientId === sender.uid) return;
    const notificationsRef = collection(db, 'users', recipientId, 'notifications');
    await addDoc(notificationsRef, { message, senderId: sender.uid, senderName: sender.displayName, senderPhotoURL: sender.photoURL, createdAt: serverTimestamp(), read: false });
};

export default function ProfileView({ loggedInUser, profileUserId, onViewProfile }) {
    const [profileData, setProfileData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    
    // --- UPDATED: State management for new connection flow ---
    const [connections, setConnections] = useState([]);
    const [sentRequests, setSentRequests] = useState([]);
    const [receivedRequests, setReceivedRequests] = useState([]);
    const [connectionStatus, setConnectionStatus] = useState('none'); // 'none', 'connected', 'request_sent', 'request_received'

    const [userPosts, setUserPosts] = useState([]);

    // --- All useEffect hooks for fetching data are updated ---
    useEffect(() => {
        if (!profileUserId) return;
        setIsLoading(true);
        const userRef = doc(db, "users", profileUserId);
        const unsubscribe = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) setProfileData(docSnap.data());
            else setProfileData(null);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [profileUserId]);

    useEffect(() => {
        if (!loggedInUser) return;
        // Fetch connections
        const connsRef = collection(db, "users", loggedInUser.uid, "connections");
        const unsubConns = onSnapshot(connsRef, (snapshot) => setConnections(snapshot.docs.map(doc => doc.id)));

        // Fetch sent requests
        const sentRef = collection(db, "users", loggedInUser.uid, "sentRequests");
        const unsubSent = onSnapshot(sentRef, (snapshot) => setSentRequests(snapshot.docs.map(doc => doc.id)));
        
        // Fetch received requests
        const receivedRef = collection(db, "users", loggedInUser.uid, "receivedRequests");
        const unsubReceived = onSnapshot(receivedRef, (snapshot) => setReceivedRequests(snapshot.docs.map(doc => doc.id)));

        return () => { unsubConns(); unsubSent(); unsubReceived(); };
    }, [loggedInUser]);

    // Determines the connection status with the viewed profile
    useEffect(() => {
        if (connections.includes(profileUserId)) {
            setConnectionStatus('connected');
        } else if (sentRequests.includes(profileUserId)) {
            setConnectionStatus('request_sent');
        } else if (receivedRequests.includes(profileUserId)) {
            setConnectionStatus('request_received');
        } else {
            setConnectionStatus('none');
        }
    }, [connections, sentRequests, receivedRequests, profileUserId]);

    useEffect(() => {
        if (!profileUserId) return;
        const q = query(collection(db, "posts"), where("authorId", "==", profileUserId), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => setUserPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        return () => unsubscribe();
    }, [profileUserId]);

    // --- NEW: Handler functions for the request/accept flow ---
    const handleSendRequest = async () => {
        const senderData = { uid: loggedInUser.uid, displayName: loggedInUser.displayName, photoURL: loggedInUser.photoURL };
        // Add to my "sent" list
        await setDoc(doc(db, "users", loggedInUser.uid, "sentRequests", profileUserId), { ...profileData, requestSentAt: serverTimestamp() });
        // Add to their "received" list
        await setDoc(doc(db, "users", profileUserId, "receivedRequests", loggedInUser.uid), { ...senderData, requestReceivedAt: serverTimestamp() });
        // Notify them
        await createNotification(profileUserId, loggedInUser, "sent you a connection request.");
    };

    const handleAcceptRequest = async () => {
        const senderData = { uid: loggedInUser.uid, displayName: loggedInUser.displayName, photoURL: loggedInUser.photoURL };
        // 1. Create the connection for both users
        await setDoc(doc(db, "users", loggedInUser.uid, "connections", profileUserId), { ...profileData, connectedAt: serverTimestamp() });
        await setDoc(doc(db, "users", profileUserId, "connections", loggedInUser.uid), { ...senderData, connectedAt: serverTimestamp() });

        // 2. Delete the request from both users' lists
        await deleteDoc(doc(db, "users", loggedInUser.uid, "receivedRequests", profileUserId));
        await deleteDoc(doc(db, "users", profileUserId, "sentRequests", loggedInUser.uid));
        
        // 3. Notify them
        await createNotification(profileUserId, loggedInUser, "accepted your connection request.");
    };
    
    const handleCancelRequest = async () => {
        // Delete from my "sent" and their "received"
        await deleteDoc(doc(db, "users", loggedInUser.uid, "sentRequests", profileUserId));
        await deleteDoc(doc(db, "users", profileUserId, "receivedRequests", loggedInUser.uid));
    };

    const handleDisconnect = async () => {
        // Delete from both connections lists
        await deleteDoc(doc(db, "users", loggedInUser.uid, "connections", profileUserId));
        await deleteDoc(doc(db, "users", profileUserId, "connections", loggedInUser.uid));
    };

    // --- (handleSaveProfile, handleLike, handleComment, handleDeletePost are unchanged) ---
    const handleSaveProfile = async (formData) => {
        const userRef = doc(db, "users", loggedInUser.uid);
        await setDoc(userRef, { ...formData }, { merge: true });
        setIsEditing(false);
    };
    
    const handleLike = async (postId, postAuthorId, currentLikes) => {
        const postRef = doc(db, 'posts', postId);
        const hasLiked = currentLikes.includes(loggedInUser.uid);
        if (hasLiked) {
            await updateDoc(postRef, { likes: arrayRemove(loggedInUser.uid) });
        } else {
            await updateDoc(postRef, { likes: arrayUnion(loggedInUser.uid) });
            await createNotification(postAuthorId, loggedInUser, "liked your post.");
        }
    };

    const handleComment = async (postId, postAuthorId, commentText) => {
        if (commentText.trim() === '') return;
        const commentsRef = collection(db, 'posts', postId, 'comments');
        await addDoc(commentsRef, { text: commentText, authorId: loggedInUser.uid, authorName: loggedInUser.displayName, authorPhotoURL: loggedInUser.photoURL, createdAt: serverTimestamp() });
        await createNotification(postAuthorId, loggedInUser, "commented on your post.");
    };

    const handleDeletePost = async (post) => {
        if (confirm("Are you sure you want to delete this post?")) {
            try {
                await deleteDoc(doc(db, 'posts', post.id));
                if (post.imagePath) {
                    const imageRef = ref(storage, post.imagePath);
                    await deleteObject(imageRef);
                }
            } catch (error) { console.error("Error deleting post: ", error); }
        }
    };
    
    if (isLoading) return <div className="text-center p-10">Loading profile...</div>;
    if (!profileData) return <div className="text-center p-10">Could not load profile.</div>;
    
    const isOwnProfile = loggedInUser.uid === profileUserId;

    const renderConnectionButton = () => {
        switch(connectionStatus) {
            case 'connected':
                return <button onClick={handleDisconnect} className="flex items-center bg-gray-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition group"> <CheckCircle size={20} className="mr-2 group-hover:hidden" /> <UserX size={20} className="mr-2 hidden group-hover:inline" /> <span className="group-hover:hidden">Connected</span> <span className="hidden group-hover:inline">Disconnect</span> </button>;
            case 'request_sent':
                return <button onClick={handleCancelRequest} className="flex items-center bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded-lg transition"> <Send size={20} className="mr-2" /> Request Sent </button>;
            case 'request_received':
                return <button onClick={handleAcceptRequest} className="flex items-center bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition"> <UserCheck size={20} className="mr-2" /> Accept Request </button>;
            default: // 'none'
                return <button onClick={handleSendRequest} className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"> <UserPlus size={20} className="mr-2" /> Send Request </button>;
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md relative mb-6">
                {isOwnProfile && (<button onClick={() => setIsEditing(true)} className="absolute top-4 right-4 bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700 transition"><Edit size={20} /></button>)}
                <div className="flex flex-col items-center">
                    <img src={profileData.photoURL} alt="Profile" className="w-32 h-32 rounded-full border-4 border-purple-500 mb-4" />
                    <h2 className="text-2xl font-bold">{profileData.displayName}</h2>
                    <p className="text-gray-500 dark:text-gray-400">{profileData.email}</p>
                    {!isOwnProfile && <div className="mt-4">{renderConnectionButton()}</div>}
                </div>
                <div className="mt-6 w-full space-y-4">
                     <div><h3 className="font-semibold text-lg">Bio</h3><p className="text-gray-600 dark:text-gray-400 italic">{profileData.bio || "No bio yet."}</p></div>
                     <div><h3 className="font-semibold text-lg">Major</h3><p className="text-gray-600 dark:text-gray-400">{profileData.major || "Not specified."}</p></div>
                     <div><h3 className="font-semibold text-lg">Graduation Year</h3><p className="text-gray-600 dark:text-gray-400">{profileData.gradYear || "Not specified."}</p></div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">Posts by {profileData.displayName.split(' ')[0]}</h3>
                {userPosts.length > 0 ? (
                    userPosts.map(post => (
                        <PostItem 
                            key={post.id} post={post} user={loggedInUser}
                            onViewProfile={onViewProfile} onLike={handleLike}
                            onComment={handleComment} onDelete={handleDeletePost}
                        />
                    ))
                ) : ( <div className="bg-white dark:bg-gray-800 p-6 rounded-lg text-center text-gray-500">This user hasn't posted anything yet.</div> )}
            </div>

            {isEditing && <EditProfileModal userProfile={profileData} onSave={handleSaveProfile} onClose={() => setIsEditing(false)} />}
        </div>
    );
}

function EditProfileModal({ userProfile, onSave, onClose }) {
    const [formData, setFormData] = useState({ bio: userProfile.bio || '', major: userProfile.major || '', gradYear: userProfile.gradYear || '' });
    const handleChange = (e) => { setFormData(prev => ({ ...prev, [e.target.name]: e.target.value })); };
    const handleSubmit = (e) => { e.preventDefault(); onSave(formData); };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Edit Profile</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><X size={24}/></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="bio" className="block text-sm font-medium">Bio</label>
                        <textarea name="bio" id="bio" value={formData.bio} onChange={handleChange} rows="3" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"></textarea>
                    </div>
                    <div>
                        <label htmlFor="major" className="block text-sm font-medium">Major</label>
                        <input type="text" name="major" id="major" value={formData.major} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600" />
                    </div>
                    <div>
                        <label htmlFor="gradYear" className="block text-sm font-medium">Graduation Year</label>
                        <input type="number" name="gradYear" id="gradYear" value={formData.gradYear} onChange={handleChange} placeholder="e.g., 2026" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600" />
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">Cancel</button>
                        <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

