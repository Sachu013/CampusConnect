import React, { useState } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import SearchView from './SearchView';

export default function SearchContainer({ user, onViewProfile }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            setIsSearching(true);
        }
    };

    const handleInputChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        if (value.trim() === '') {
            setIsSearching(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            {/* Search Input */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
                <form onSubmit={handleSearch} className="flex items-center space-x-4">
                    <div className="flex-1 relative">
                        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={handleInputChange}
                            placeholder="Search for users, posts, or content..."
                            className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg border-2 border-transparent focus:outline-none focus:border-purple-500 text-lg"
                            autoFocus
                        />
                    </div>
                    <button
                        type="submit"
                        className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                    >
                        Search
                    </button>
                </form>
                {!isSearching && (
                    <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                        <p>💡 Try searching for:</p>
                        <ul className="ml-4 mt-2 space-y-1">
                            <li>• User names to find classmates</li>
                            <li>• Keywords in posts to find discussions</li>
                            <li>• Topics you're interested in</li>
                        </ul>
                    </div>
                )}
            </div>

            {/* Search Results */}
            {isSearching && searchTerm.trim() && (
                <SearchView 
                    searchTerm={searchTerm} 
                    onViewProfile={onViewProfile}
                />
            )}

            {/* Empty State */}
            {!isSearching && (
                <div className="text-center py-12">
                    <SearchIcon size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <h2 className="text-2xl font-bold text-gray-600 dark:text-gray-400 mb-2">Find Your Community</h2>
                    <p className="text-gray-500 dark:text-gray-400">
                        Search for classmates, discover interesting posts, and connect with your campus community.
                    </p>
                </div>
            )}
        </div>
    );
}