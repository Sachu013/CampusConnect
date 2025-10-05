import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig.js'; // Using absolute path from src
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Heart, MessageCircle, Send, Trash2 } from 'lucide-react';

// This is the standalone PostItem component.
export default function PostItem({ post, user, onViewProfile, onLike, onComment, onDelete }) {
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    
    // Effect to fetch comments when the comment section is opened
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
            <div className="flex items-start justify-between">
                <button onClick={() => onViewProfile(post.authorId)} className="flex items-center mb-3 text-left hover:opacity-80 transition-opacity">
                    <img src={post.authorPhotoURL} alt={post.authorName} className="w-10 h-10 rounded-full mr-3" />
                    <div>
                        <p className="font-semibold">{post.authorName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleString() : 'Just now'}
                        </p>
                    </div>
                </button>
                {/* Delete button, only shown for the author */}
                {user.uid === post.authorId && (
                    <button onClick={() => onDelete(post)} className="p-2 text-gray-400 hover:text-red-500 rounded-full transition-colors">
                        <Trash2 size={18} />
                    </button>
                )}
            </div>

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

