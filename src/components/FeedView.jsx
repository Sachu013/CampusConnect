import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebaseConfig.js'; // Using relative path
import { collection, query, onSnapshot, serverTimestamp, addDoc, doc, updateDoc, arrayUnion, arrayRemove, orderBy } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Heart, MessageCircle, Send, Image as ImageIcon, X } from 'lucide-react';

// Helper function to create notifications
const createNotification = async (recipientId, sender, message) => {
    // Prevent users from getting notifications for their own actions
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

    useEffect(() => {
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const postsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPosts(postsData);
        });
        return () => unsubscribe();
    }, []);

    const handlePost = async (e) => {
        e.preventDefault();
        if (newPost.trim() === '' && !imageFile) return;

        setUploading(true);
        let imageUrl = '';

        if (imageFile) {
            const imageRef = ref(storage, `posts/${user.uid}/${Date.now()}_${imageFile.name}`);
            const snapshot = await uploadBytes(imageRef, imageFile);
            imageUrl = await getDownloadURL(snapshot.ref);
        }

        try {
            await addDoc(collection(db, "posts"), {
                content: newPost,
                imageUrl: imageUrl,
                authorId: user.uid,
                authorName: user.displayName,
                authorPhotoURL: user.photoURL,
                createdAt: serverTimestamp(),
                likes: [],
            });
            setNewPost('');
            setImageFile(null);
        } catch (error) {
            console.error("Error adding post: ", error);
        } finally {
            setUploading(false);
        }
    };
    
    // UPDATED: handleLike now creates a notification
    const handleLike = async (postId, postAuthorId, currentLikes) => {
        const postRef = doc(db, 'posts', postId);
        const hasLiked = currentLikes.includes(user.uid);

        if (hasLiked) {
            await updateDoc(postRef, { likes: arrayRemove(user.uid) });
        } else {
            await updateDoc(postRef, { likes: arrayUnion(user.uid) });
            // Create notification for the post author
            await createNotification(
                postAuthorId,
                user,
                "liked your post."
            );
        }
    };
    
    // UPDATED: handleComment now creates a notification
    const handleComment = async (postId, postAuthorId, commentText) => {
        if (commentText.trim() === '') return;
        const commentsRef = collection(db, 'posts', postId, 'comments');
        await addDoc(commentsRef, {
            text: commentText,
            authorId: user.uid,
            authorName: user.displayName,
            authorPhotoURL: user.photoURL,
            createdAt: serverTimestamp(),
        });
        
        // Create notification for the post author
        await createNotification(
            postAuthorId,
            user,
            "commented on your post."
        );
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-6">
                <form onSubmit={handlePost}>
                    <textarea
                        value={newPost}
                        onChange={(e) => setNewPost(e.target.value)}
                        placeholder="Share an achievement or ask a question..."
                        className="w-full p-2 bg-gray-100 dark:bg-gray-700 rounded-lg border-2 border-transparent focus:outline-none focus:border-purple-500 resize-none"
                        rows="2"
                    ></textarea>
                    {imageFile && (
                        <div className="mt-2 relative">
                            <img src={URL.createObjectURL(imageFile)} alt="Preview" className="rounded-lg max-h-40" />
                            <button onClick={() => setImageFile(null)} className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1"><X size={14} /></button>
                        </div>
                    )}
                    <div className="flex justify-between items-center mt-2">
                        <label className="cursor-pointer text-purple-500 hover:text-purple-600">
                            <ImageIcon size={24} />
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} />
                        </label>
                        <button type="submit" disabled={uploading} className="bg-purple-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-purple-700 transition disabled:opacity-50">
                            {uploading ? 'Posting...' : 'Post'}
                        </button>
                    </div>
                </form>
            </div>
            <div className="space-y-4">
                {posts.map(post => (
                    <PostItem 
                        key={post.id} 
                        post={post} 
                        user={user} 
                        onViewProfile={onViewProfile}
                        onLike={handleLike}
                        onComment={handleComment}
                    />
                ))}
            </div>
        </div>
    );
}

function PostItem({ post, user, onViewProfile, onLike, onComment }) {
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');

    useEffect(() => {
        if (!showComments) return;
        const q = query(collection(db, 'posts', post.id, 'comments'), orderBy('createdAt', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [showComments, post.id]);

    const submitComment = (e) => {
        e.preventDefault();
        onComment(post.id, post.authorId, newComment);
        setNewComment('');
    };
    
    const hasLiked = post.likes?.includes(user.uid);

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
            <button onClick={() => onViewProfile(post.authorId)} className="flex items-center mb-3 text-left hover:opacity-80 transition-opacity">
                <img src={post.authorPhotoURL} alt={post.authorName} className="w-10 h-10 rounded-full mr-3" />
                <div>
                    <p className="font-semibold">{post.authorName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleString() : 'Just now'}
                    </p>
                </div>
            </button>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap mb-3">{post.content}</p>
            {post.imageUrl && <img src={post.imageUrl} alt="Post content" className="rounded-lg mb-3 max-h-96 w-full object-cover" />}
            
            <div className="flex justify-between items-center text-gray-500 dark:text-gray-400 border-t dark:border-gray-700 pt-2">
                <button onClick={() => onLike(post.id, post.authorId, post.likes || [])} className={`flex items-center space-x-2 hover:text-purple-500 transition ${hasLiked ? 'text-red-500' : ''}`}>
                    <Heart fill={hasLiked ? 'currentColor' : 'none'} size={20} />
                    <span>{post.likes?.length || 0}</span>
                </button>
                <button onClick={() => setShowComments(!showComments)} className="flex items-center space-x-2 hover:text-purple-500 transition">
                    <MessageCircle size={20} />
                    <span>{comments.length > 0 ? comments.length : 'Comment'}</span>
                </button>
            </div>
            
            {showComments && (
                <div className="mt-4 pt-4 border-t dark:border-gray-700 space-y-3">
                    {comments.map(comment => (
                        <div key={comment.id} className="flex items-start gap-2">
                            <img src={comment.authorPhotoURL} alt={comment.authorName} className="w-8 h-8 rounded-full" />
                            <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg flex-1">
                                <p className="font-semibold text-sm">{comment.authorName}</p>
                                <p className="text-sm">{comment.text}</p>
                            </div>
                        </div>
                    ))}
                    <form onSubmit={submitComment} className="flex items-center gap-2 pt-2">
                        <img src={user.photoURL} alt="You" className="w-8 h-8 rounded-full" />
                        <input
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Write a comment..."
                            className="flex-1 bg-gray-100 dark:bg-gray-700 p-2 rounded-full border-2 border-transparent focus:outline-none focus:border-purple-500"
                        />
                        <button type="submit" className="text-purple-600 hover:text-purple-700"><Send size={20} /></button>
                    </form>
                </div>
            )}
        </div>
    );
}

