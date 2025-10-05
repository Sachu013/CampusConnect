import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebaseConfig.js'; // Using relative path
import { collection, query, onSnapshot, serverTimestamp, addDoc, doc, updateDoc, arrayUnion, arrayRemove, orderBy, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { Image as ImageIcon, X } from 'lucide-react';
import PostItem from './PostItem.jsx'; // --- NEW: Import the standalone PostItem component ---

// createNotification helper function is unchanged
const createNotification = async (recipientId, sender, message) => {
    if (recipientId === sender.uid) return;
    const notificationsRef = collection(db, 'users', recipientId, 'notifications');
    await addDoc(notificationsRef, {
        message,
        senderId: sender.uid,
        senderName: sender.displayName,
        senderPhotoURL: sender.photoURL,
        createdAt: serverTimestamp(),
        read: false,
    });
};

export default function FeedView({ user, onViewProfile }) {
    const [posts, setPosts] = useState([]);
    const [newPost, setNewPost] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    // This useEffect is unchanged
    useEffect(() => {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            setPosts(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, []);

    // All handler functions are unchanged
    const handlePost = async (e) => {
        e.preventDefault();
        if (newPost.trim() === '' && !imageFile) return;
        setUploading(true);
        let imageUrl = '';
        let imagePath = '';
        if (imageFile) {
            imagePath = `posts/${user.uid}/${Date.now()}_${imageFile.name}`;
            const imageRef = ref(storage, imagePath);
            const snapshot = await uploadBytes(imageRef, imageFile);
            imageUrl = await getDownloadURL(snapshot.ref);
        }
        try {
            await addDoc(collection(db, "posts"), {
                content: newPost, imageUrl, imagePath,
                authorId: user.uid, authorName: user.displayName, authorPhotoURL: user.photoURL,
                createdAt: serverTimestamp(), likes: [],
            });
            setNewPost(''); setImageFile(null);
        } catch (error) {
            console.error("Error adding post: ", error);
        } finally {
            setUploading(false);
        }
    };

    const handleLike = async (postId, postAuthorId, currentLikes) => {
        const postRef = doc(db, 'posts', postId);
        const hasLiked = currentLikes.includes(user.uid);
        if (hasLiked) {
            await updateDoc(postRef, { likes: arrayRemove(user.uid) });
        } else {
            await updateDoc(postRef, { likes: arrayUnion(user.uid) });
            await createNotification(postAuthorId, user, "liked your post.");
        }
    };

    const handleComment = async (postId, postAuthorId, commentText) => {
        if (commentText.trim() === '') return;
        const commentsRef = collection(db, 'posts', postId, 'comments');
        await addDoc(commentsRef, {
            text: commentText, authorId: user.uid, authorName: user.displayName,
            authorPhotoURL: user.photoURL, createdAt: serverTimestamp(),
        });
        await createNotification(postAuthorId, user, "commented on your post.");
    };
    
    const handleDeletePost = async (post) => {
        if (confirm("Are you sure you want to delete this post?")) {
            try {
                await deleteDoc(doc(db, 'posts', post.id));
                if (post.imagePath) {
                    const imageRef = ref(storage, post.imagePath);
                    await deleteObject(imageRef);
                }
            } catch (error) {
                console.error("Error deleting post: ", error);
            }
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            {/* New Post form is unchanged */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-6">
                <form onSubmit={handlePost}>
                    <textarea value={newPost} onChange={(e) => setNewPost(e.target.value)} placeholder="Share an achievement or ask a question..." className="w-full p-2 bg-gray-100 dark:bg-gray-700 rounded-lg border-2 border-transparent focus:outline-none focus:border-purple-500 resize-none" rows="2"></textarea>
                    {imageFile && ( <div className="mt-2 relative"> <img src={URL.createObjectURL(imageFile)} alt="Preview" className="rounded-lg max-h-40" /> <button onClick={() => setImageFile(null)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1"><X size={14} /></button> </div> )}
                    <div className="flex justify-between items-center mt-2">
                        <label className="cursor-pointer text-purple-500 hover:text-purple-600"> <ImageIcon size={24} /> <input type="file" className="hidden" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} /> </label>
                        <button type="submit" disabled={uploading} className="bg-purple-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50"> {uploading ? 'Posting...' : 'Post'} </button>
                    </div>
                </form>
            </div>
            
            <div className="space-y-4">
                {/* Now we map over posts and render the imported PostItem component */}
                {posts.map(post => (
                    <PostItem 
                        key={post.id} 
                        post={post} 
                        user={user} 
                        onViewProfile={onViewProfile}
                        onLike={handleLike}
                        onComment={handleComment}
                        onDelete={handleDeletePost}
                    />
                ))}
            </div>
        </div>
    );
}

