import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebaseConfig.js'; // Using absolute path
import { collection, query, where, orderBy, onSnapshot, doc, setDoc, deleteDoc, updateDoc, arrayUnion, arrayRemove, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { Edit, X, UserPlus, CheckCircle, UserX } from 'lucide-react';
import PostItem from './PostItem.jsx'; // Using absolute path

// createNotification helper function
const createNotification = async (recipientId, sender, message) => {
    if (recipientId === sender.uid) return;
    const notificationsRef = collection(db, 'users', recipientId, 'notifications');
    await addDoc(notificationsRef, { message, senderId: sender.uid, senderName: sender.displayName, senderPhotoURL: sender.photoURL, createdAt: serverTimestamp(), read: false });
};

export default function ProfileView({ loggedInUser, profileUserId, onViewProfile }) {
    const [profileData, setProfileData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [connections, setConnections] = useState([]);
    const [isAlreadyConnected, setIsAlreadyConnected] = useState(false);
    const [userPosts, setUserPosts] = useState([]);

    // Fetches the profile data of the user being viewed
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

    // Fetches the logged-in user's list of connections
    useEffect(() => {
        if (!loggedInUser) return;
        const connectionsRef = collection(db, "users", loggedInUser.uid, "connections");
        const unsubscribe = onSnapshot(connectionsRef, (snapshot) => {
            setConnections(snapshot.docs.map(doc => doc.id));
        });
        return () => unsubscribe();
    }, [loggedInUser]);

    // Checks if the viewed user is already a connection
    useEffect(() => {
        setIsAlreadyConnected(connections.includes(profileUserId));
    }, [connections, profileUserId]);

    // Fetches all posts made by the viewed user
    useEffect(() => {
        if (!profileUserId) return;
        const postsRef = collection(db, "posts");
        const q = query(postsRef, where("authorId", "==", profileUserId), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setUserPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [profileUserId]);

    // Handler functions to be passed down to PostItem
    const handleConnect = async () => {
        if (!profileData) return;
        const myConnectionRef = doc(db, "users", loggedInUser.uid, "connections", profileUserId);
        await setDoc(myConnectionRef, { uid: profileData.uid, displayName: profileData.displayName, photoURL: profileData.photoURL, connectedAt: serverTimestamp() });
        const theirConnectionRef = doc(db, "users", profileUserId, "connections", loggedInUser.uid);
        await setDoc(theirConnectionRef, { uid: loggedInUser.uid, displayName: loggedInUser.displayName, photoURL: loggedInUser.photoURL, connectedAt: serverTimestamp() });
        await createNotification(profileUserId, loggedInUser, "connected with you.");
    };

    const handleDisconnect = async () => {
        if (!profileData) return;
        const myConnectionRef = doc(db, "users", loggedInUser.uid, "connections", profileUserId);
        await deleteDoc(myConnectionRef);
        const theirConnectionRef = doc(db, "users", profileUserId, "connections", loggedInUser.uid);
        await deleteDoc(theirConnectionRef);
    };

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

    return (
        <div className="max-w-3xl mx-auto">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md relative mb-6">
                {isOwnProfile && (<button onClick={() => setIsEditing(true)} className="absolute top-4 right-4 bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700 transition"><Edit size={20} /></button>)}
                <div className="flex flex-col items-center">
                    <img src={profileData.photoURL} alt="Profile" className="w-32 h-32 rounded-full border-4 border-purple-500 mb-4" />
                    <h2 className="text-2xl font-bold">{profileData.displayName}</h2>
                    <p className="text-gray-500 dark:text-gray-400">{profileData.email}</p>
                    {!isOwnProfile && ( <div className="mt-4"> {isAlreadyConnected ? (<button onClick={handleDisconnect} className="flex items-center bg-gray-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition group"> <CheckCircle size={20} className="mr-2 group-hover:hidden" /> <UserX size={20} className="mr-2 hidden group-hover:inline" /> <span className="group-hover:hidden">Connected</span> <span className="hidden group-hover:inline">Disconnect</span> </button>) : (<button onClick={handleConnect} className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"> <UserPlus size={20} className="mr-2" /> Connect </button>)} </div> )}
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
    const [formData, setFormData] = useState({
        bio: userProfile.bio || '',
        major: userProfile.major || '',
        gradYear: userProfile.gradYear || '',
    });

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

