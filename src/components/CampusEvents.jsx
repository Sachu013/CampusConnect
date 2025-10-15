import React, { useState, useEffect } from 'react';
import { db } from '@/firebaseConfig.js';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy, where } from 'firebase/firestore';
import { Calendar, Clock, MapPin, Users, Plus, Check, X, Star } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal.jsx';

export default function CampusEvents({ user }) {
    const [events, setEvents] = useState([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState(null);

    useEffect(() => {
        const eventsRef = query(
            collection(db, "events"),
            orderBy("startDate", "asc")
        );
        
        const unsubscribe = onSnapshot(eventsRef, (snapshot) => {
            const eventsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setEvents(eventsData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleRSVP = async (eventId, status) => {
        try {
            const eventRef = doc(db, "events", eventId);
            const event = events.find(e => e.id === eventId);
            
            const currentAttendees = event.attendees || [];
            const userIndex = currentAttendees.findIndex(attendee => attendee.uid === user.uid);
            
            let updatedAttendees;
            if (userIndex !== -1) {
                // Update existing RSVP
                updatedAttendees = [...currentAttendees];
                updatedAttendees[userIndex] = {
                    uid: user.uid,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    status: status,
                    rsvpDate: new Date()
                };
            } else {
                // Add new RSVP
                updatedAttendees = [...currentAttendees, {
                    uid: user.uid,
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    status: status,
                    rsvpDate: new Date()
                }];
            }
            
            await updateDoc(eventRef, {
                attendees: updatedAttendees
            });
        } catch (error) {
            console.error("Error updating RSVP:", error);
        }
    };

    const handleDeleteEvent = async (eventId, createdBy) => {
        if (createdBy !== user.uid) return;
        try {
            await deleteDoc(doc(db, "events", eventId));
        } catch (error) {
            console.error("Error deleting event:", error);
        }
    };

    const getUserRSVPStatus = (event) => {
        if (!event.attendees) return null;
        const userRSVP = event.attendees.find(attendee => attendee.uid === user.uid);
        return userRSVP ? userRSVP.status : null;
    };

    const getAttendeeCount = (event, status) => {
        if (!event.attendees) return 0;
        return event.attendees.filter(attendee => attendee.status === status).length;
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const isEventPast = (endDate) => {
        if (!endDate) return false;
        const eventEnd = endDate.toDate ? endDate.toDate() : new Date(endDate);
        return eventEnd < new Date();
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    return (
        <div>
            {/* Header with Create Button */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Upcoming Events</h2>
                    <p className="text-gray-600 dark:text-gray-400">College fests, seminars, and club activities</p>
                </div>
                <button
                    onClick={() => setShowCreateForm(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium flex items-center transition-colors"
                >
                    <Plus size={18} className="mr-2" />
                    <span className="hidden sm:inline">Create Event</span>
                </button>
            </div>

            {/* Events Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {events.map(event => {
                    const userRSVP = getUserRSVPStatus(event);
                    const isPast = isEventPast(event.endDate);
                    
                    return (
                        <div key={event.id} className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${isPast ? 'opacity-75' : ''}`}>
                            {/* Event Image */}
                            {event.imageURL && (
                                <div className="h-48 bg-cover bg-center" style={{ backgroundImage: `url(${event.imageURL})` }}>
                                    <div className="h-full bg-black bg-opacity-40 flex items-end p-4">
                                        {event.featured && (
                                            <div className="bg-yellow-500 text-yellow-900 px-2 py-1 rounded text-xs font-medium flex items-center">
                                                <Star size={12} className="mr-1" />
                                                Featured
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            <div className="p-4">
                                {/* Event Title and Category */}
                                <div className="mb-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-semibold text-lg text-gray-900 dark:text-white line-clamp-1">
                                            {event.title}
                                        </h3>
                                        <div className="flex items-center space-x-2">
                                            <span className={`px-2 py-1 text-xs rounded-full ${
                                                event.category === 'fest' ? 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200' :
                                                event.category === 'seminar' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                                event.category === 'club' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                            }`}>
                                                {event.category}
                                            </span>
                                            {event.createdBy === user.uid && (
                                                <button
                                                    onClick={() => setDeleteTarget(event)}
                                                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                                    title="Delete Event"
                                                >
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                                        {event.description}
                                    </p>
                                </div>

                                {/* Event Details */}
                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                        <Calendar size={16} className="mr-2" />
                                        {formatDate(event.startDate)}
                                    </div>
                                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                        <Clock size={16} className="mr-2" />
                                        {formatTime(event.startDate)} - {formatTime(event.endDate)}
                                    </div>
                                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                                        <MapPin size={16} className="mr-2" />
                                        {event.location}
                                    </div>
                                </div>

                                {/* RSVP Statistics */}
                                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4">
                                    <div className="flex items-center">
                                        <Users size={14} className="mr-1" />
                                        <span>{getAttendeeCount(event, 'going')} going</span>
                                        <span className="mx-2">•</span>
                                        <span>{getAttendeeCount(event, 'interested')} interested</span>
                                    </div>
                                </div>

                                {/* RSVP Buttons */}
                                {!isPast && (
                                    <div className="flex space-x-2">
                                        <button
                                            onClick={() => handleRSVP(event.id, 'going')}
                                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                                                userRSVP === 'going'
                                                    ? 'bg-green-600 text-white'
                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-green-900'
                                            }`}
                                        >
                                            <Check size={16} className="mr-1 inline" />
                                            Going
                                        </button>
                                        <button
                                            onClick={() => handleRSVP(event.id, 'interested')}
                                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                                                userRSVP === 'interested'
                                                    ? 'bg-yellow-500 text-white'
                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-yellow-100 dark:hover:bg-yellow-900'
                                            }`}
                                        >
                                            <Star size={16} className="mr-1 inline" />
                                            Interested
                                        </button>
                                        <button
                                            onClick={() => handleRSVP(event.id, 'not-going')}
                                            className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                                                userRSVP === 'not-going'
                                                    ? 'bg-red-600 text-white'
                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-red-900'
                                            }`}
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                )}
                                
                                {isPast && (
                                    <div className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 py-2 px-3 rounded-lg text-sm text-center">
                                        Event Ended
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {events.length === 0 && (
                <div className="text-center py-12">
                    <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No events yet</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">Be the first to create a campus event!</p>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                    >
                        Create First Event
                    </button>
                </div>
            )}

            {/* Create Event Modal */}
            {showCreateForm && (
                <CreateEventModal
                    user={user}
                    onClose={() => setShowCreateForm(false)}
                />
            )}

            {/* Delete confirm modal */}
            {deleteTarget && (
                <ConfirmModal
                    title="Delete Event"
                    description="This action will permanently remove the event and its RSVP data. This cannot be undone."
                    confirmText="Delete"
                    confirmBtnClass="bg-red-600 hover:bg-red-700"
                    onConfirm={async () => {
                        await handleDeleteEvent(deleteTarget.id, deleteTarget.createdBy);
                        setDeleteTarget(null);
                    }}
                    onClose={() => setDeleteTarget(null)}
                />
            )}
        </div>
    );
}

function CreateEventModal({ user, onClose }) {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: 'club',
        startDate: '',
        endDate: '',
        location: '',
        imageURL: '',
        featured: false
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            await addDoc(collection(db, "events"), {
                ...formData,
                startDate: new Date(formData.startDate),
                endDate: new Date(formData.endDate),
                createdBy: user.uid,
                createdByName: user.displayName,
                createdAt: serverTimestamp(),
                attendees: []
            });
            onClose();
        } catch (error) {
            console.error("Error creating event:", error);
        }
        
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create New Event</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <X size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Event Title
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Description
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                            rows="3"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Category
                            </label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({...formData, category: e.target.value})}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="club">Club Activity</option>
                                <option value="fest">College Fest</option>
                                <option value="seminar">Seminar</option>
                                <option value="workshop">Workshop</option>
                                <option value="sports">Sports</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Location
                            </label>
                            <input
                                type="text"
                                value={formData.location}
                                onChange={(e) => setFormData({...formData, location: e.target.value})}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Start Date & Time
                            </label>
                            <input
                                type="datetime-local"
                                value={formData.startDate}
                                onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                End Date & Time
                            </label>
                            <input
                                type="datetime-local"
                                value={formData.endDate}
                                onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Event Image URL (Optional)
                        </label>
                        <input
                            type="url"
                            value={formData.imageURL}
                            onChange={(e) => setFormData({...formData, imageURL: e.target.value})}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
                        />
                    </div>

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="featured"
                            checked={formData.featured}
                            onChange={(e) => setFormData({...formData, featured: e.target.checked})}
                            className="mr-2 rounded text-purple-600 focus:ring-purple-500"
                        />
                        <label htmlFor="featured" className="text-sm text-gray-700 dark:text-gray-300">
                            Mark as featured event
                        </label>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                        >
                            {loading ? 'Creating...' : 'Create Event'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}