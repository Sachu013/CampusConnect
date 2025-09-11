import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig.js'; // Corrected import path
// --- NEW: Import Firebase Storage functions ---
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
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
import { Heart, MessageCircle, Send, Image as ImageIcon, X } from 'lucide-react';

// Initialize Firebase Storage
const storage = getStorage();

// This is the main component for the entire feed
export default function FeedView({ user, onViewProfile }) {
    const [posts, setPosts] = useState([]);
    const [newPost, setNewPost] = useState('');
    // --- NEW: State for image upload ---
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    // Effect to fetch all posts
    useEffect(() => {
        const q = query(collection(db, "posts"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const postsData = [];
            querySnapshot.forEach((doc) => {
                postsData.push({ id: doc.id, ...doc.data() });
            });
            // Sort posts by newest first
            postsData.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
            setPosts(postsData);
        });
        return () => unsubscribe();
    }, []);

    // --- MAJOR UPDATE: handlePost now supports image uploads ---
    const handlePost = async (e) => {
        e.preventDefault();
        if (newPost.trim() === '' && !imageFile) return;
        setIsUploading(true);

        let imageUrl = '';

        // 1. If there's an image, upload it first
        if (imageFile) {
            const imageRef = ref(storage, `posts/${user.uid}/${Date.now()}_${imageFile.name}`);
            try {
                const snapshot = await uploadBytes(imageRef, imageFile);
                imageUrl = await getDownloadURL(snapshot.ref);
            } catch (error) {
                console.error("Error uploading image: ", error);
                setIsUploading(false);
                return; // Stop if image upload fails
            }
        }

        // 2. Create the post document in Firestore
        try {
            await addDoc(collection(db, "posts"), {
                content: newPost,
                imageUrl: imageUrl, // Add the image URL
                authorId: user.uid,
                authorName: user.displayName,
                authorPhotoURL: user.photoURL,
                createdAt: serverTimestamp(),
                likes: [],
            });
            // Reset form
            setNewPost('');
            setImageFile(null);
            setImagePreview(null);
        } catch (error) {
            console.error("Error adding post: ", error);
        } finally {
            setIsUploading(false);
        }
    };

    // --- NEW: Handler for when a user selects a file ---
    const handleImageChange = (e) => {
        if (e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };
    
    // --- NEW: Function to cancel image selection ---
    const cancelImageSelection = () => {
        setImageFile(null);
        setImagePreview(null);
    };

    return (
        <div className="max-w-3xl mx-auto">
            {/* --- UPDATED: New Post Form --- */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-6">
                <form onSubmit={handlePost}>
                    <div className="flex space-x-4">
                         <img src={user.photoURL} alt="You" className="w-10 h-10 rounded-full" />
                         <textarea
                            value={newPost}
                            onChange={(e) => setNewPost(e.target.value)}
                            placeholder="What's on your mind?"
                            className="flex-1 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg border-2 border-transparent focus:outline-none focus:border-purple-500 resize-none"
                            rows="2"
                         />
                    </div>

                    {/* --- NEW: Image Preview Section --- */}
                    {imagePreview && (
                        <div className="mt-4 relative">
                            <img src={imagePreview} alt="Preview" className="w-full max-h-80 object-cover rounded-lg" />
                            <button onClick={cancelImageSelection} className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-1 rounded-full hover:bg-opacity-75">
                                <X size={18} />
                            </button>
                        </div>
                    )}

                    <div className="flex justify-between items-center mt-4">
                        <label htmlFor="image-upload" className="flex items-center space-x-2 text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 cursor-pointer transition-colors">
                            <ImageIcon size={20} />
                            <span>Add Image</span>
                        </label>
                        <input id="image-upload" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                        
                        <button type="submit" disabled={isUploading} className="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed">
                            {isUploading ? 'Uploading...' : 'Post'}
                        </button>
                    </div>
                </form>
            </div>

            {/* List of all posts */}
            <div className="space-y-4">
                {posts.map(post => (
                    <PostCard key={post.id} post={post} user={user} onViewProfile={onViewProfile} />
                ))}
            </div>
        </div>
    );
}

// --- UPDATED: PostCard now displays images ---
function PostCard({ post, user, onViewProfile }) {
    const [showComments, setShowComments] = useState(false);

    const handleLike = async () => {
        const postRef = doc(db, 'posts', post.id);
        if (post.likes?.includes(user.uid)) {
            // User has liked, so unlike
            await updateDoc(postRef, {
                likes: arrayRemove(user.uid)
            });
        } else {
            // User has not liked, so like
            await updateDoc(postRef, {
                likes: arrayUnion(user.uid)
            });
        }
    };

    const isLiked = post.likes?.includes(user.uid);

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
            {/* Post author section */}
            <button onClick={() => onViewProfile(post.authorId)} className="flex items-center mb-3 text-left hover:opacity-80 transition-opacity w-full">
                <img src={post.authorPhotoURL} alt={post.authorName} className="w-10 h-10 rounded-full mr-3" />
                <div>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{post.authorName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleString() : 'Just now'}
                    </p>
                </div>
            </button>
            
            {/* Post content */}
            {post.content && (
                 <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-4">{post.content}</p>
            )}

            {/* --- NEW: Display Image if it exists --- */}
            {post.imageUrl && (
                <div className="my-4">
                    <img src={post.imageUrl} alt="Post content" className="w-full h-auto max-h-[500px] object-contain rounded-lg bg-gray-100 dark:bg-gray-700" />
                </div>
            )}

            {/* Like and Comment buttons */}
            <div className="flex justify-between items-center text-gray-500 dark:text-gray-400 border-t border-b border-gray-200 dark:border-gray-700 py-2">
                <button onClick={handleLike} className={`flex items-center space-x-2 hover:text-purple-500 transition-colors ${isLiked ? 'text-red-500' : ''}`}>
                    <Heart fill={isLiked ? 'currentColor' : 'none'} size={20} />
                    <span>{post.likes?.length || 0} Likes</span>
                </button>
                <button onClick={() => setShowComments(!showComments)} className="flex items-center space-x-2 hover:text-purple-500 transition-colors">
                    <MessageCircle size={20} />
                    <span>Comments</span>
                </button>
            </div>

            {/* Comment Section */}
            {showComments && <CommentSection post={post} user={user} />}
        </div>
    );
}

// A dedicated component for the comment section
function CommentSection({ post, user }) {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');

    useEffect(() => {
        const commentsQuery = query(collection(db, 'posts', post.id, 'comments'));
        const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
            const commentsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            commentsData.sort((a, b) => a.createdAt?.seconds - b.createdAt?.seconds);
            setComments(commentsData);
        });
        return unsubscribe;
    }, [post.id]);

    const handleComment = async (e) => {
        e.preventDefault();
        if (newComment.trim() === '') return;

        await addDoc(collection(db, 'posts', post.id, 'comments'), {
            text: newComment,
            authorId: user.uid,
            authorName: user.displayName,
            authorPhotoURL: user.photoURL,
            createdAt: serverTimestamp(),
        });
        setNewComment('');
    };

    return (
        <div className="pt-4">
            <form onSubmit={handleComment} className="flex items-center space-x-3 mb-4">
                <img src={user.photoURL} alt="You" className="w-8 h-8 rounded-full" />
                <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write a comment..."
                    className="flex-1 p-2 bg-gray-100 dark:bg-gray-700 rounded-lg border-2 border-transparent focus:outline-none focus:border-purple-500 text-sm"
                />
                <button type="submit" className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition">
                    <Send size={16} />
                </button>
            </form>
            
            <div className="space-y-3">
                {comments.map(comment => (
                    <div key={comment.id} className="flex items-start space-x-3 text-sm">
                        <img src={comment.authorPhotoURL} alt={comment.authorName} className="w-8 h-8 rounded-full" />
                        <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg flex-1">
                            <p className="font-semibold text-gray-800 dark:text-gray-200">{comment.authorName}</p>
                            <p className="text-gray-600 dark:text-gray-300">{comment.text}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

