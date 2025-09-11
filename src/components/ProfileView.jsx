import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
// --- FIX: Using an absolute path from the project root for reliability ---
import { db } from '/src/firebaseConfig.js'; 
import { Edit, X } from 'lucide-react';

// --- EditProfileModal Component ---
// This is the pop-up form for editing the profile.
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


// --- Main ProfileView Component ---
// This is the component that displays the profile information.
function ProfileView({ loggedInUser, profileUserId }) {
    const [profileData, setProfileData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (!profileUserId) return;
        
        setIsLoading(true);
        const userRef = doc(db, "users", profileUserId);

        const unsubscribe = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                setProfileData(docSnap.data());
            } else {
                console.error("No such user profile!");
                setProfileData(null);
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [profileUserId]);

    const handleSaveProfile = async (formData) => {
        const userRef = doc(db, "users", loggedInUser.uid);
        try {
            await setDoc(userRef, {
                ...formData
            }, { merge: true });
            setIsEditing(false); // Close modal on success
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

// This line makes the component available to be imported in App.jsx
export default ProfileView;

