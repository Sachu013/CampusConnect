import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig.js'; // Using relative path
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Heart, MessageCircle, Send, Trash2, Share2, X } from 'lucide-react';

// This is the standalone PostItem component.
export default function PostItem({ post, user, onViewProfile, onLike, onComment, onDelete, onShare }) {
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [showShareModal, setShowShareModal] = useState(false);
    const [connections, setConnections] = useState([]);
    const [shareLoading, setShareLoading] = useState(false);
    
    // Effect to fetch comments when the comment section is opened
    useEffect(() => {
        if (!showComments) return;
        const q = query(collection(db, 'posts', post.id, 'comments'), orderBy('createdAt', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [showComments, post.id]);

    // Effect to fetch connections when share modal is opened
    useEffect(() => {
        if (!showShareModal) return;
        const q = query(collection(db, 'users', user.uid, 'connections'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setConnections(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [showShareModal, user.uid]);

    const submitComment = (e) => {
        e.preventDefault();
        onComment(post.id, post.authorId, newComment);
        setNewComment('');
    };

    const handleShare = async (recipientIds) => {
        if (onShare && recipientIds.length > 0) {
            setShareLoading(true);
            for (const recipientId of recipientIds) {
                await onShare(post, recipientId);
            }
            setShareLoading(false);
            setShowShareModal(false);
        }
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
                <button onClick={() => setShowShareModal(true)} className="flex items-center space-x-2 hover:text-purple-500 transition">
                    <Share2 size={20} />
                    <span>Share</span>
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

            {/* Share Modal */}
            {showShareModal && (
                <ShareModal 
                    post={post}
                    connections={connections}
                    onShare={handleShare}
                    onClose={() => setShowShareModal(false)}
                    loading={shareLoading}
                />
            )}
        </div>
    );
}

function ShareModal({ post, connections, onShare, onClose, loading }) {
    const [selectedUsers, setSelectedUsers] = useState([]);
    
    const toggleUser = (userId) => {
        setSelectedUsers(prev => 
            prev.includes(userId) 
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };
    
    const handleConfirmShare = () => {
        if (selectedUsers.length > 0) {
            onShare(selectedUsers);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-md max-h-96 overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Share Post</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <X size={24}/>
                    </button>
                </div>
                
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center mb-2">
                        <img src={post.authorPhotoURL} alt={post.authorName} className="w-6 h-6 rounded-full mr-2" />
                        <span className="text-sm font-medium">{post.authorName}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">{post.content}</p>
                </div>
                
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Select connections to share with ({selectedUsers.length} selected):
                </h3>
                
                {connections.length === 0 ? (
                    <div className="text-center text-gray-500 py-6">
                        <p>No connections to share with.</p>
                        <p className="text-sm mt-1">Connect with classmates first!</p>
                    </div>
                ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {connections.map(connection => (
                            <label
                                key={connection.id}
                                className="w-full flex items-center p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                            >
                                <input 
                                    type="checkbox"
                                    checked={selectedUsers.includes(connection.id)}
                                    onChange={() => toggleUser(connection.id)}
                                    className="mr-3 rounded text-purple-600 focus:ring-purple-500"
                                />
                                <img 
                                    src={connection.photoURL} 
                                    alt={connection.displayName} 
                                    className="w-10 h-10 rounded-full mr-3" 
                                />
                                <div className="flex-1">
                                    <p className="font-semibold text-sm">{connection.displayName}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{connection.email}</p>
                                </div>
                            </label>
                        ))}
                    </div>
                )}
                
                <div className="mt-6 flex justify-end space-x-3">
                    <button 
                        onClick={onClose}
                        className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleConfirmShare}
                        disabled={selectedUsers.length === 0 || loading}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 flex items-center"
                    >
                        {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>}
                        Share ({selectedUsers.length})
                    </button>
                </div>
            </div>
        </div>
    );
}

