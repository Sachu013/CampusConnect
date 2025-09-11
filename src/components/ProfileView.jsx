import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig.js'; // Use relative path
import { doc, setDoc, onSnapshot, collection, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { Edit, X, UserPlus, CheckCircle, UserX } from 'lucide-react';

export default function ProfileView({ loggedInUser, profileUserId }) {
    const [profileData, setProfileData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    
    // State for connections
    const [connections, setConnections] = useState([]);
    const [isAlreadyConnected, setIsAlreadyConnected] = useState(false);

    // Effect to fetch the user's profile data
    useEffect(() => {
        if (!profileUserId) return;
        
        setIsLoading(true);
        const userRef = doc(db, "users", profileUserId);
        const unsubscribe = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                setProfileData(docSnap.data());
            } else {
                setProfileData(null);
            }
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, [profileUserId]);

    // Effect to fetch the LOGGED-IN user's connections
    useEffect(() => {
        if (!loggedInUser) return;
        const connectionsRef = collection(db, "users", loggedInUser.uid, "connections");
        const unsubscribe = onSnapshot(connectionsRef, (snapshot) => {
            const connectedIds = snapshot.docs.map(doc => doc.id);
            setConnections(connectedIds);
        });
        return () => unsubscribe();
    }, [loggedInUser]);

    // Effect to check if the viewed profile is in our connections
    useEffect(() => {
        setIsAlreadyConnected(connections.includes(profileUserId));
    }, [connections, profileUserId]);

    // Function to handle adding a connection
    const handleConnect = async () => {
        if (!profileData) return;
        // Add the viewed user to the logged-in user's connection list
        const myConnectionRef = doc(db, "users", loggedInUser.uid, "connections", profileUserId);
        await setDoc(myConnectionRef, {
            uid: profileData.uid,
            displayName: profileData.displayName,
            photoURL: profileData.photoURL,
            connectedAt: serverTimestamp()
        });

        // Add the logged-in user to the viewed user's connection list
        const theirConnectionRef = doc(db, "users", profileUserId, "connections", loggedInUser.uid);
        await setDoc(theirConnectionRef, {
            uid: loggedInUser.uid,
            displayName: loggedInUser.displayName,
            photoURL: loggedInUser.photoURL,
            connectedAt: serverTimestamp()
        });
    };

    // Function to handle removing a connection
    const handleDisconnect = async () => {
        if (!profileData) return;
        // Remove from my list
        const myConnectionRef = doc(db, "users", loggedInUser.uid, "connections", profileUserId);
        await deleteDoc(myConnectionRef);

        // Remove me from their list
        const theirConnectionRef = doc(db, "users", profileUserId, "connections", loggedInUser.uid);
        await deleteDoc(theirConnectionRef);
    };

    const handleSaveProfile = async (formData) => {
        const userRef = doc(db, "users", loggedInUser.uid);
        try {
            await setDoc(userRef, { ...formData }, { merge: true });
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating profile:", error);
        }
    };

    if (isLoading) {
        return <div className="text-center p-10">Loading profile...</div>;
    }
    if (!profileData) {
        return <div className="text-center p-10">Could not load profile.</div>;
    }
    
    const isOwnProfile = loggedInUser.uid === profileUserId;

    return (
        <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md relative">
            {isOwnProfile && (
                <button onClick={() => setIsEditing(true)} className="absolute top-4 right-4 bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700 transition">
                    <Edit size={20} />
                </button>
            )}

            <div className="flex flex-col items-center">
                <img src={profileData.photoURL} alt="Profile" className="w-32 h-32 rounded-full border-4 border-purple-500 mb-4" />
                <h2 className="text-2xl font-bold">{profileData.displayName}</h2>
                <p className="text-gray-500 dark:text-gray-400">{profileData.email}</p>
                 
                {!isOwnProfile && (
                    <div className="mt-4">
                        {isAlreadyConnected ? (
                            <button onClick={handleDisconnect} className="flex items-center bg-gray-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg transition group">
                                <CheckCircle size={20} className="mr-2 group-hover:hidden" />
                                <UserX size={20} className="mr-2 hidden group-hover:inline" />
                                <span className="group-hover:hidden">Connected</span>
                                <span className="hidden group-hover:inline">Disconnect</span>
                            </button>
                        ) : (
                            <button onClick={handleConnect} className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition">
                                <UserPlus size={20} className="mr-2" />
                                Connect
                            </button>
                        )}
                    </div>
                )}
            </div>
            
            <div className="mt-6 w-full space-y-4">
                <div>
                    <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">Bio</h3>
                    <p className="text-gray-600 dark:text-gray-400 italic">{profileData.bio || "No bio yet."}</p>
                </div>
                 <div>
                    <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">Major</h3>
                    <p className="text-gray-600 dark:text-gray-400">{profileData.major || "Not specified."}</p>
                </div>
                 <div>
                    <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200">Graduation Year</h3>
                    <p className="text-gray-600 dark:text-gray-400">{profileData.gradYear || "Not specified."}</p>
                </div>
            </div>

            {isEditing && (
                <EditProfileModal 
                    userProfile={profileData}
                    onSave={handleSaveProfile}
                    onClose={() => setIsEditing(false)}
                />
            )}
        </div>
    );
}

function EditProfileModal({ userProfile, onSave, onClose }) {
    const [formData, setFormData] = useState({
        bio: userProfile.bio || '',
        major: userProfile.major || '',
        gradYear: userProfile.gradYear || '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Edit Profile</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <X size={24}/>
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bio</label>
                            <textarea name="bio" id="bio" value={formData.bio} onChange={handleChange} rows="3" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"></textarea>
                        </div>
                        <div>
                            <label htmlFor="major" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Major</label>
                            <input type="text" name="major" id="major" value={formData.major} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600" />
                        </div>
                        <div>
                            <label htmlFor="gradYear" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Graduation Year</label>
                            <input type="number" name="gradYear" id="gradYear" value={formData.gradYear} onChange={handleChange} placeholder="e.g., 2026" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600" />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">
                            Cancel
                        </button>
                        <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700">
                            Save Changes
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

