import React, { useState } from 'react';
import { Calendar, Megaphone } from 'lucide-react';
import CampusEvents from './CampusEvents.jsx';
import NoticeBoard from './NoticeBoard.jsx';

export default function EventsView({ user }) {
    const [activeTab, setActiveTab] = useState('events');

    return (
        <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    Campus Events & Notices
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Stay updated with campus events and official announcements
                </p>
            </div>

            {/* Tab Navigation */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setActiveTab('events')}
                        className={`flex items-center px-4 md:px-6 py-3 md:py-4 font-medium text-sm md:text-base transition-colors ${
                            activeTab === 'events'
                                ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400 bg-purple-50 dark:bg-purple-900/20'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    >
                        <Calendar size={20} className="mr-2" />
                        <span>Campus Events</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('notices')}
                        className={`flex items-center px-4 md:px-6 py-3 md:py-4 font-medium text-sm md:text-base transition-colors ${
                            activeTab === 'notices'
                                ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400 bg-purple-50 dark:bg-purple-900/20'
                                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                    >
                        <Megaphone size={20} className="mr-2" />
                        <span>Notice Board</span>
                    </button>
                </div>
            </div>

            {/* Tab Content */}
            <div className="min-h-[500px]">
                {activeTab === 'events' && <CampusEvents user={user} />}
                {activeTab === 'notices' && <NoticeBoard user={user} />}
            </div>
        </div>
    );
}