import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { UserCheck, MessageSquare, UserMinus, Search } from 'lucide-react';

export default function NetworksView({ user, onViewProfile, onStartDirectMessage }) {
    const [connections, setConnections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (!user) return;

        const connectionsRef = collection(db, 'users', user.uid, 'connections');
        const q = query(connectionsRef);
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const connectionsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setConnections(connectionsData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const filteredConnections = connections.filter(connection =>
        connection.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                <p className="ml-3 text-gray-500">Loading your network...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                    <UserCheck className="mr-3 text-purple-600" size={24} />
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                        Your Networks
                        <span className="ml-2 text-sm font-normal text-gray-500">
                            ({connections.length} connection{connections.length !== 1 ? 's' : ''})
                        </span>
                    </h2>
                </div>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search your connections..."
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                </div>
            </div>

            {connections.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 p-8 rounded-lg text-center text-gray-500">
                    <UserCheck size={48} className="mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium mb-2">No connections yet</h3>
                    <p>Start connecting with your classmates to build your campus network!</p>
                </div>
            ) : filteredConnections.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 p-8 rounded-lg text-center text-gray-500">
                    <Search size={48} className="mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-medium mb-2">No matches found</h3>
                    <p>Try searching with different keywords.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredConnections.map(connection => (
                        <div key={connection.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                            <div className="text-center">
                                <img 
                                    src={connection.photoURL} 
                                    alt={connection.displayName}
                                    className="w-20 h-20 rounded-full mx-auto mb-4 object-cover"
                                />
                                <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200 mb-1">
                                    {connection.displayName}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 truncate">
                                    {connection.email}
                                </p>
                                
                                <div className="flex space-x-2 justify-center">
                                    <button
                                        onClick={() => onViewProfile(connection.id)}
                                        className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                                    >
                                        <UserCheck size={16} className="mr-1" />
                                        View Profile
                                    </button>
                                    
                                    <button
                                        onClick={() => onStartDirectMessage(connection)}
                                        className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                                    >
                                        <MessageSquare size={16} className="mr-1" />
                                        Message
                                    </button>
                                </div>
                                
                                {connection.lastLogin && (
                                    <p className="text-xs text-gray-400 mt-3">
                                        Last seen: {new Date(connection.lastLogin.seconds * 1000).toLocaleDateString()}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {/* Statistics */}
            <div className="mt-8 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/20 dark:to-blue-900/20 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Network Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div>
                        <div className="text-2xl font-bold text-purple-600">{connections.length}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Total Connections</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-blue-600">
                            {connections.filter(c => c.lastLogin && 
                                new Date(c.lastLogin.seconds * 1000) > new Date(Date.now() - 7*24*60*60*1000)
                            ).length}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Active This Week</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold text-green-600">
                            {Math.round((connections.length / 100) * 100) || 0}%
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Network Growth</div>
                    </div>
                </div>
            </div>
        </div>
    );
}