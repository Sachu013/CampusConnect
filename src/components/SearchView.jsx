import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig.js'; // Corrected to use relative path
import { collection, query, where, orderBy, onSnapshot, limit, getDocs } from 'firebase/firestore';
import { User, FileText, Search as SearchIcon } from 'lucide-react';

export default function SearchView({ searchTerm, onViewProfile }) {
    const [userResults, setUserResults] = useState([]);
    const [postResults, setPostResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('users');

    useEffect(() => {
        if (!searchTerm || searchTerm.trim() === '') {
            setUserResults([]);
            setPostResults([]);
            return;
        }

        setLoading(true);
        
        const performSearch = async () => {
            try {
                // Search users with simple query
                const usersRef = collection(db, 'users');
                const userSnapshot = await getDocs(usersRef);
                const allUsers = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                // Filter users client-side to avoid index requirements
                // Filter users client-side to avoid index requirements
                const filteredUsers = allUsers.filter(u => (
                    u.displayName && u.displayName.toLowerCase().includes(searchTerm.toLowerCase())
                )).slice(0, 10);
                
                setUserResults(filteredUsers);

                // Search posts with simple query
                const postsRef = collection(db, 'posts');
                const postSnapshot = await getDocs(postsRef);
                const allPosts = postSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const usersById = Object.fromEntries(allUsers.map(u => [u.uid || u.id, u]));
                
                // Filter posts client-side to avoid index requirements
                const filteredPosts = allPosts.filter(post => (
                    post.content && post.content.toLowerCase().includes(searchTerm.toLowerCase())
                )).slice(0, 10);
                
                setPostResults(filteredPosts);
                setLoading(false);
            } catch (error) {
                console.error('Search error:', error);
                setLoading(false);
            }
        };

        // Debounce search to avoid too many queries
        const timeoutId = setTimeout(performSearch, 300);
        return () => clearTimeout(timeoutId);
    }, [searchTerm]);

    const highlightText = (text, searchTerm) => {
        if (!searchTerm) return text;
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        return text.split(regex).map((part, index) => 
            part.toLowerCase() === searchTerm.toLowerCase() ? 
                <span key={index} className="bg-yellow-200 dark:bg-yellow-600">{part}</span> : part
        );
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center mb-6">
                <SearchIcon className="mr-3 text-purple-600" size={24} />
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Search Results for "{searchTerm}"</h2>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex mb-6 border-b border-gray-200 dark:border-gray-700">
                <button 
                    onClick={() => setActiveTab('users')}
                    className={`flex items-center px-4 py-2 mr-4 font-medium transition-colors ${
                        activeTab === 'users' 
                            ? 'text-purple-600 border-b-2 border-purple-600' 
                            : 'text-gray-600 dark:text-gray-400 hover:text-purple-600'
                    }`}
                >
                    <User size={18} className="mr-2" />
                    Users ({userResults.length})
                </button>
                <button 
                    onClick={() => setActiveTab('posts')}
                    className={`flex items-center px-4 py-2 font-medium transition-colors ${
                        activeTab === 'posts' 
                            ? 'text-purple-600 border-b-2 border-purple-600' 
                            : 'text-gray-600 dark:text-gray-400 hover:text-purple-600'
                    }`}
                >
                    <FileText size={18} className="mr-2" />
                    Posts ({postResults.length})
                </button>
            </div>
            
            {loading && (
                <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    <p className="ml-3 text-gray-500">Searching...</p>
                </div>
            )}
            
            {/* Users Tab */}
            {!loading && activeTab === 'users' && (
                <div>
                    {userResults.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg text-center text-gray-500">
                            <User size={48} className="mx-auto mb-4 text-gray-300" />
                            <p>No users found matching your search.</p>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md divide-y dark:divide-gray-700">
                            {userResults.map(user => (
                                <button 
                                    key={user.id}
                                    onClick={() => onViewProfile(user.id)}
                                    className="w-full text-left flex items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                >
                                    <img src={user.photoURL} alt={user.displayName} className="w-12 h-12 rounded-full mr-4" />
                                    <div className="flex-1">
                                        <p className="font-semibold text-lg">
                                            {highlightText(user.displayName, searchTerm)}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                                        {(user.department || user.major) && (
                                            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">{user.department || user.major}</p>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        {user.lastLogin ? new Date(user.lastLogin.seconds * 1000).toLocaleDateString() : ''}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Posts Tab */}
            {!loading && activeTab === 'posts' && (
                <div>
                    {postResults.length === 0 ? (
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg text-center text-gray-500">
                            <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                            <p>No posts found matching your search.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {postResults.map(post => (
                                <div key={post.id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                                    <button 
                                        onClick={() => onViewProfile(post.authorId)}
                                        className="flex items-center mb-3 text-left hover:opacity-80 transition-opacity"
                                    >
                                        <img src={post.authorPhotoURL} alt={post.authorName} className="w-8 h-8 rounded-full mr-2" />
                                        <div>
                                            <p className="font-medium text-sm">{post.authorName}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleDateString() : 'Just now'}
                                            </p>
                                        </div>
                                    </button>
                                    <div className="text-gray-700 dark:text-gray-300 mb-2">
                                        {highlightText(post.content, searchTerm)}
                                    </div>
                                    <div className="text-xs text-purple-600 dark:text-purple-400 mb-2">
                                        {(usersById[post.authorId]?.department || usersById[post.authorId]?.major) || ''}
                                    </div>
                                    {post.imageUrl && (
                                        <img src={post.imageUrl} alt="Post content" className="rounded-lg mb-2 max-h-40 w-full object-cover" />
                                    )}
                                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                        <span>{post.likes?.length || 0} likes</span>
                                        <span className="mx-2">•</span>
                                        <span>Click to view full post</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

