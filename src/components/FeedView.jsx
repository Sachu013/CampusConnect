import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig.js'; // Corrected the import path
import {
    collection,
    query,
    onSnapshot,
    addDoc,
    serverTimestamp,
    doc,
    updateDoc,
    arrayUnion,
    arrayRemove
} from 'firebase/firestore';
import { Heart, Send } from 'lucide-react';

export default function FeedView({ user, onViewProfile }) {
    const [posts, setPosts] = useState([]);
    const [newPost, setNewPost] = useState('');

    // Effect to fetch all posts from Firestore in real-time
    useEffect(() => {
        const q = query(collection(db, "posts"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const postsData = [];
            querySnapshot.forEach((doc) => postsData.push({ id: doc.id, ...doc.data() }));
            // Sort posts by newest first
            postsData.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
            setPosts(postsData);
        });
        return () => unsubscribe();
    }, []);

    // Function to handle creating a new post
    const handlePost = async (e) => {
        e.preventDefault();
        if (newPost.trim() === '') return;
        await addDoc(collection(db, "posts"), {
            content: newPost,
            authorId: user.uid,
            authorName: user.displayName,
            authorPhotoURL: user.photoURL,
            createdAt: serverTimestamp(),
            likes: [] // Initialize likes as an empty array
        });
        setNewPost('');
    };
    
    // --- NEW: Function to handle liking/unliking a post ---
    const handleLike = async (postId, currentLikes) => {
        const postRef = doc(db, "posts", postId);
        const hasLiked = currentLikes.includes(user.uid);

        if (hasLiked) {
            // User has already liked, so we unlike
            await updateDoc(postRef, {
                likes: arrayRemove(user.uid)
            });
        } else {
            // User has not liked, so we like
            await updateDoc(postRef, {
                likes: arrayUnion(user.uid)
            });
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
            {/* New Post Form */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-6">
                <form onSubmit={handlePost} className="flex space-x-4">
                    <img src={user.photoURL} alt="You" className="w-12 h-12 rounded-full" />
                    <textarea value={newPost} onChange={(e) => setNewPost(e.target.value)} placeholder="Share something..." className="flex-1 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg border-2 border-transparent focus:outline-none focus:border-purple-500" rows="2"></textarea>
                    <button type="submit" className="self-end bg-purple-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors">
                        <Send size={20} />
                    </button>
                </form>
            </div>

            {/* Posts List */}
            <div className="space-y-4">
                {posts.map(post => {
                    // Ensure likes is an array to prevent errors
                    const postLikes = post.likes || [];
                    const isLiked = postLikes.includes(user.uid);

                    return (
                        <div key={post.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                            <button onClick={() => onViewProfile(post.authorId)} className="flex items-center mb-3 text-left hover:opacity-80 transition-opacity w-full">
                                <img src={post.authorPhotoURL} alt={post.authorName} className="w-10 h-10 rounded-full mr-3" />
                                <div>
                                    <p className="font-semibold">{post.authorName}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleString() : 'Just now'}
                                    </p>
                                </div>
                            </button>
                            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-4">{post.content}</p>
                            
                            {/* --- NEW: Like button and count --- */}
                            <div className="flex items-center gap-4 border-t border-gray-200 dark:border-gray-700 pt-2">
                                <button onClick={() => handleLike(post.id, postLikes)} className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-500 transition-colors">
                                    <Heart size={20} className={isLiked ? 'text-red-500 fill-current' : ''} />
                                    <span>Like</span>
                                </button>
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {postLikes.length} {postLikes.length === 1 ? 'like' : 'likes'}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

