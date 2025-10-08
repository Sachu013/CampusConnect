import React, { useState, useEffect } from 'react';
import { db, storage } from '../firebaseConfig'; // Corrected import
import { collection, query, onSnapshot, serverTimestamp, addDoc, doc, updateDoc, arrayUnion, arrayRemove, orderBy, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { Heart, MessageCircle, Send, Image as ImageIcon, X, Trash2, AlertTriangle } from 'lucide-react';
import PostItem from './PostItem'; // Corrected import

// Helper function to create notifications
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
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [postToDelete, setPostToDelete] = useState(null);

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
        let imagePath = '';
        if (imageFile) {
            imagePath = `posts/${user.uid}/${Date.now()}_${imageFile.name}`;
            const imageRef = ref(storage, imagePath);
            const snapshot = await uploadBytes(imageRef, imageFile);
            imageUrl = await getDownloadURL(snapshot.ref);
        }
        try {
            await addDoc(collection(db, "posts"), {
                content: newPost,
                imageUrl: imageUrl,
                imagePath: imagePath,
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
            text: commentText,
            authorId: user.uid,
            authorName: user.displayName,
            authorPhotoURL: user.photoURL,
            createdAt: serverTimestamp(),
        });
        await createNotification(postAuthorId, user, "commented on your post.");
    };

    const handleDeletePost = (post) => {
        setPostToDelete(post);
        setShowDeleteConfirm(true);
    };

    const confirmDeletePost = async () => {
        if (!postToDelete) return;
        try {
            await deleteDoc(doc(db, 'posts', postToDelete.id));
            if (postToDelete.imagePath) {
                const imageRef = ref(storage, postToDelete.imagePath);
                await deleteObject(imageRef);
            }
        } catch (error) {
            console.error("Error deleting post: ", error);
        }
        setShowDeleteConfirm(false);
        setPostToDelete(null);
    };

    const handleSharePost = async (post, recipientId) => {
        try {
            // Create DM conversation ID (consistent ordering)
            const dmId = [user.uid, recipientId].sort().join('_');
            
            // Create message in DM conversation
            const messagesRef = collection(db, 'directMessages', dmId, 'messages');
            await addDoc(messagesRef, {
                text: `Shared a post: "${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}"`
                    + (post.imageUrl ? ' [Image attached]' : ''),
                sharedPost: {
                    id: post.id,
                    content: post.content,
                    imageUrl: post.imageUrl,
                    authorName: post.authorName,
                    authorPhotoURL: post.authorPhotoURL,
                    authorId: post.authorId,
                    createdAt: post.createdAt,
                    likes: post.likes
                },
                createdAt: serverTimestamp(),
                uid: user.uid,
                displayName: user.displayName,
                photoURL: user.photoURL,
                type: 'shared_post'
            });
            
            // Also create a notification
            await createNotification(
                recipientId, 
                user, 
                `shared a post with you in your chat`
            );
            
            console.log('Post shared successfully to DM');
        } catch (error) {
            console.error('Error sharing post:', error);
        }
    };

    return (
        <div className="max-w-3xl mx-auto">
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
                {posts.map(post => (
                    <PostItem 
                        key={post.id} 
                        post={post} 
                        user={user} 
                        onViewProfile={onViewProfile}
                        onLike={handleLike}
                        onComment={handleComment}
                        onDelete={handleDeletePost}
                        onShare={handleSharePost}
                    />
                ))}
            </div>
            
            {/* Delete Post Confirmation Modal */}
            {showDeleteConfirm && (
                <DeletePostModal 
                    post={postToDelete}
                    onConfirm={confirmDeletePost}
                    onClose={() => {
                        setShowDeleteConfirm(false);
                        setPostToDelete(null);
                    }}
                />
            )}
        </div>
    );
}

function DeletePostModal({ post, onConfirm, onClose }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-sm">
                <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mr-4">
                        <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Post</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone</p>
                    </div>
                </div>
                
                <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center mb-2">
                        <img src={post?.authorPhotoURL} alt={post?.authorName} className="w-6 h-6 rounded-full mr-2" />
                        <span className="text-sm font-medium">{post?.authorName}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
                        {post?.content?.length > 100 ? `${post.content.substring(0, 100)}...` : post?.content}
                    </p>
                    {post?.imageUrl && (
                        <div className="mt-2">
                            <img src={post.imageUrl} alt="Post content" className="rounded-lg max-h-20 w-full object-cover" />
                        </div>
                    )}
                </div>
                
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Are you sure you want to delete this post? It will be permanently removed and cannot be recovered.
                </p>
                
                <div className="flex justify-end space-x-3">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={onConfirm}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center"
                    >
                        <Trash2 size={16} className="mr-2" />
                        Delete Post
                    </button>
                </div>
            </div>
        </div>
    );
}

