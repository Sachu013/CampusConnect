import React, { useState, useEffect } from 'react';
import { db } from '@/firebaseConfig.js';
import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { Megaphone, Pin, Calendar, User, Plus, X, AlertCircle, Info, CheckCircle, BarChart3 } from 'lucide-react';
import ConfirmModal from '@/components/ConfirmModal.jsx';
import { DEPARTMENTS } from '@/constants/departments.js';

export default function NoticeBoard({ user, highlightId }) {
    const [notices, setNotices] = useState([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [insightsNotice, setInsightsNotice] = useState(null);

    // Filters
    const [searchText, setSearchText] = useState('');
    const [deptFilter, setDeptFilter] = useState('ALL');

    useEffect(() => {
        const noticesRef = query(
            collection(db, "notices"),
            orderBy("createdAt", "desc")
        );
        
        const unsubscribe = onSnapshot(noticesRef, (snapshot) => {
            const noticesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setNotices(noticesData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Auto-scroll to highlighted notice (must be before any early returns)
    useEffect(() => {
        if (highlightId) {
            const el = document.getElementById(`notice-${highlightId}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [highlightId, notices]);

    const handleDeleteNotice = async (noticeId, createdBy) => {
        if (createdBy !== user.uid) return;
        try {
            await deleteDoc(doc(db, "notices", noticeId));
        } catch (error) {
            console.error("Error deleting notice:", error);
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    const getPriorityIcon = (priority) => {
        switch (priority) {
            case 'high':
                return <AlertCircle size={16} className="text-red-500" />;
            case 'medium':
                return <Info size={16} className="text-yellow-500" />;
            case 'low':
                return <CheckCircle size={16} className="text-green-500" />;
            default:
                return <Info size={16} className="text-blue-500" />;
        }
    };

    const getPriorityBorder = (priority) => {
        switch (priority) {
            case 'high':
                return 'border-l-red-500';
            case 'medium':
                return 'border-l-yellow-500';
            case 'low':
                return 'border-l-green-500';
            default:
                return 'border-l-blue-500';
        }
    };

    const getCategoryColor = (category) => {
        switch (category) {
            case 'academic':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
            case 'exam':
                return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
            case 'event':
                return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
            case 'admin':
                return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
            case 'placement':
                return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
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
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Digital Notice Board</h2>
                    <p className="text-gray-600 dark:text-gray-400">Official college announcements and department notices</p>
                </div>
                <button
                    onClick={() => setShowCreateForm(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium flex items-center transition-colors"
                >
                    <Plus size={18} className="mr-2" />
                    <span className="hidden sm:inline">Post Notice</span>
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-4">
                <div className="flex flex-col md:flex-row gap-3">
                    <input
                        type="text"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        placeholder="Search notices by title or content..."
                        className="flex-1 p-2 rounded-md bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <select
                        value={deptFilter}
                        onChange={(e) => setDeptFilter(e.target.value)}
                        className="w-full md:w-64 p-2 rounded-md bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        <option value="ALL">ALL</option>
                        {DEPARTMENTS.map(dep => (
                            <option key={dep} value={dep}>{dep}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Notices List */}
            <div className="space-y-4">
                {notices
                    .filter(n => {
                        const matchesDept = deptFilter === 'ALL' ? true : (n.departmentFrom === deptFilter);
                        const text = `${n.title || ''} ${n.content || ''}`.toLowerCase();
                        const matchesText = searchText.trim() === '' ? true : text.includes(searchText.toLowerCase());
                        return matchesDept && matchesText;
                    })
                    .map(notice => (
                    <div 
                        id={`notice-${notice.id}`}
                        key={notice.id} 
                        className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border-l-4 ${getPriorityBorder(notice.priority)} border ${notice.id === highlightId ? 'border-yellow-400 ring-2 ring-yellow-300' : 'border-gray-200 dark:border-gray-700'} overflow-hidden`}
                    >
                        <div className="p-4 md:p-6">
                            {/* Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                                <div className="flex items-center space-x-3 mb-2 sm:mb-0">
                                    {notice.pinned && (
                                        <Pin size={16} className="text-yellow-500" />
                                    )}
                                    {getPriorityIcon(notice.priority)}
                                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                                        {notice.title}
                                    </h3>
                                    <span className={`px-2 py-1 text-xs rounded-full ${getCategoryColor(notice.category)}`}>
                                        {notice.category}
                                    </span>
                                </div>
                                
                                {/* Actions */}
                                <div className="flex items-center space-x-2">
                                    {notice.createdBy === user.uid && (
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => setInsightsNotice(notice)}
                                                className="px-2 py-1 rounded-md text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 hover:opacity-90 flex items-center"
                                                title="View Insights"
                                            >
                                                <BarChart3 size={14} className="mr-1" /> Insights
                                            </button>
                                            <button
                                                onClick={() => setDeleteTarget(notice)}
                                                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                                title="Delete Notice"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="mb-4">
                                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                    {notice.content}
                                </p>
                            </div>

                            {/* Attachments */}
                            {notice.attachmentURL && (
                                <div className="mb-4">
                                    <a 
                                        href={notice.attachmentURL} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center px-3 py-2 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 rounded-lg text-sm hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors"
                                    >
                                        <Pin size={16} className="mr-2" />
                                        View Attachment
                                    </a>
                                </div>
                            )}

                            {/* Footer */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-gray-200 dark:border-gray-600">
                                <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-2 sm:mb-0">
                                    <div className="flex items-center">
                                        <User size={14} className="mr-1" />
                                        <span>{notice.departmentFrom}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <Calendar size={14} className="mr-1" />
                                        <span>{formatDate(notice.createdAt)}</span>
                                    </div>
                                </div>
                                
                                {notice.expiresAt && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                        Expires: {formatDate(notice.expiresAt)}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {notices.length === 0 && (
                <div className="text-center py-12">
                    <Megaphone size={48} className="mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No notices yet</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">Be the first to post an official notice!</p>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                    >
                        Post First Notice
                    </button>
                </div>
            )}

            {/* Create Notice Modal */}
            {showCreateForm && (
                <CreateNoticeModal
                    user={user}
                    onClose={() => setShowCreateForm(false)}
                />
            )}

            {/* Delete confirm modal */}
            {deleteTarget && (
                <ConfirmModal
                    title="Delete Notice"
                    description="This will permanently remove the notice. This action cannot be undone."
                    confirmText="Delete"
                    confirmBtnClass="bg-red-600 hover:bg-red-700"
                    onConfirm={async () => {
                        await handleDeleteNotice(deleteTarget.id, deleteTarget.createdBy);
                        setDeleteTarget(null);
                    }}
                    onClose={() => setDeleteTarget(null)}
                />
            )}

            {insightsNotice && (
                <NoticeInsightsModal
                    notice={insightsNotice}
                    onClose={() => setInsightsNotice(null)}
                />
            )}
        </div>
    );
}

function NoticeInsightsModal({ notice, onClose }) {
    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h3 className="text-lg font-semibold">Notice Insights</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{notice.title}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
                        <X size={18} />
                    </button>
                </div>
                <div className="p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                            <p className="text-xs text-gray-500">Category</p>
                            <p className="font-medium">{notice.category}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                            <p className="text-xs text-gray-500">Priority</p>
                            <p className="font-medium capitalize">{notice.priority}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                            <p className="text-xs text-gray-500">Department</p>
                            <p className="font-medium">{notice.departmentFrom || '—'}</p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                            <p className="text-xs text-gray-500">Created</p>
                            <p className="font-medium">{notice.createdAt?.toDate ? notice.createdAt.toDate().toLocaleString() : ''}</p>
                        </div>
                    </div>
                    {notice.attachmentURL && (
                        <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded">
                            <p className="text-xs text-gray-500">Attachment</p>
                            <a className="text-purple-600 dark:text-purple-300 underline break-all" href={notice.attachmentURL} target="_blank" rel="noreferrer">{notice.attachmentURL}</a>
                        </div>
                    )}
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded">
                        <p className="text-xs text-gray-500">Pinned</p>
                        <p className="font-medium">{notice.pinned ? 'Yes' : 'No'}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function CreateNoticeModal({ user, onClose }) {
    const [formData, setFormData] = useState({
        title: '',
        content: '',
        category: 'academic',
        priority: 'medium',
        departmentFrom: '',
        expiresAt: '',
        attachmentURL: '',
        pinned: false
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            const docRef = await addDoc(collection(db, "notices"), {
                ...formData,
                expiresAt: formData.expiresAt ? new Date(formData.expiresAt) : null,
                createdBy: user.uid,
                createdByName: user.displayName,
                createdAt: serverTimestamp()
            });

            // Notify users based on department selection
            const usersSnap = await getDocs(collection(db, 'users'));
            const notifications = [];
            const targetDept = (formData.departmentFrom || '').toUpperCase();
            for (const u of usersSnap.docs) {
                const data = u.data() || {};
                const userDept = (data.department || data.major || '').toUpperCase();
                const shouldNotify = targetDept === 'ALL' || !userDept || userDept === targetDept;
                if (shouldNotify) {
                    notifications.push(addDoc(collection(db, 'users', u.id, 'notifications'), {
                        message: `New notice: ${formData.title}`,
                        type: 'notice',
                        noticeId: docRef.id,
                        department: formData.departmentFrom || '',
                        createdAt: serverTimestamp(),
                        read: false,
                    }));
                }
            }
            await Promise.allSettled(notifications);

            onClose();
        } catch (error) {
            console.error("Error creating notice:", error);
        }
        
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Post New Notice</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                        <X size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Notice Title
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
                            Notice Content
                        </label>
                        <textarea
                            value={formData.content}
                            onChange={(e) => setFormData({...formData, content: e.target.value})}
                            rows="4"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Category
                            </label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({...formData, category: e.target.value})}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="academic">Academic</option>
                                <option value="exam">Exam</option>
                                <option value="event">Event</option>
                                <option value="admin">Administrative</option>
                                <option value="placement">Placement</option>
                                <option value="library">Library</option>
                                <option value="hostel">Hostel</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Priority
                            </label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData({...formData, priority: e.target.value})}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Department
                            </label>
                            <select
                                value={formData.departmentFrom}
                                onChange={(e) => setFormData({...formData, departmentFrom: e.target.value})}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
                                required
                            >
                                <option value="">Select Department</option>
                                <option value="ALL">ALL</option>
                                {DEPARTMENTS.map(dep => (
                                    <option key={dep} value={dep}>{dep}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Expires On (Optional)
                            </label>
                            <input
                                type="datetime-local"
                                value={formData.expiresAt}
                                onChange={(e) => setFormData({...formData, expiresAt: e.target.value})}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Attachment URL (Optional)
                            </label>
                            <input
                                type="url"
                                value={formData.attachmentURL}
                                onChange={(e) => setFormData({...formData, attachmentURL: e.target.value})}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600"
                            />
                        </div>
                    </div>

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="pinned"
                            checked={formData.pinned}
                            onChange={(e) => setFormData({...formData, pinned: e.target.checked})}
                            className="mr-2 rounded text-purple-600 focus:ring-purple-500"
                        />
                        <label htmlFor="pinned" className="text-sm text-gray-700 dark:text-gray-300">
                            Pin this notice (appears at top)
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
                            {loading ? 'Posting...' : 'Post Notice'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}