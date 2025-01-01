import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../contexts/UserContext';

export default function Home() {
    const navigate = useNavigate();
    const { user, loading } = useContext(UserContext);

    if (loading) {
        return null;
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {user ? (
                <>
                    {/* Welcome Card - Only show if logged in */}
                    <div className="bg-card-bg-light dark:bg-card-bg-dark p-6 rounded-lg shadow-md">
                        <h2 className="text-2xl font-bold mb-4">
                            Welcome, {user.username}!
                        </h2>
                        <p className="text-card-text-light dark:text-card-text-dark">
                            Manage your recipes and connect with other food enthusiasts.
                        </p>
                    </div>
                    {/* Activity Card - Only show if logged in */}
                    <div className="bg-card-bg-light dark:bg-card-bg-dark p-6 rounded-lg shadow-md">
                        <h3 className="text-xl font-semibold mb-4">Your Activity</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-card-text-light dark:text-card-text-dark">Saved Recipes</span>
                                <span className="font-bold">{user.recipes?.length || 0}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-card-text-light dark:text-card-text-dark">Shared Recipes</span>
                                <span className="font-bold">0</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-card-text-light dark:text-card-text-dark">Comments</span>
                                <span className="font-bold">0</span>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                // Guest Welcome Section - Spans full width on larger screens
                <div className="bg-card-bg-light dark:bg-card-bg-dark p-6 rounded-lg shadow-md md:col-span-2 lg:col-span-3">
                    <h2 className="text-3xl font-bold mb-4 text-center">
                        Welcome to Recipe Archiver!
                    </h2>
                    <p className="text-card-text-light dark:text-card-text-dark text-center text-lg mb-6">
                        Join our community to save and share your favorite recipes.
                    </p>
                    <div className="flex justify-center gap-4">
                        <button 
                            onClick={() => navigate('/signup')}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium shadow-sm"
                        >
                            Get Started
                        </button>
                        <button 
                            onClick={() => navigate('/login')}
                            className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium shadow-sm"
                        >
                            Sign In
                        </button>
                    </div>
                </div>
            )}

            {/* Quick Actions Card */}
            <div className={`bg-card-bg-light dark:bg-card-bg-dark p-6 rounded-lg shadow-md ${
                !user ? 'md:col-span-2 lg:col-span-3' : ''
            }`}>
                <h3 className="text-xl font-semibold mb-4">Quick Actions</h3>
                <div className="space-y-4">
                    {user ? (
                        <>
                            <button 
                                onClick={() => navigate('/recipes/add')}
                                className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                            >
                                Add New Recipe
                            </button>
                            <button 
                                onClick={() => navigate('/recipes')}
                                className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                            >
                                Browse Recipes
                            </button>
                            <button 
                                onClick={() => navigate('/profile')}
                                className="w-full bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors"
                            >
                                View Profile
                            </button>
                        </>
                    ) : (
                        <>
                            <button 
                                onClick={() => navigate('/recipes')}
                                className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                            >
                                Browse Recipes
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Recent Activity Card */}
            <div className="bg-card-bg-light dark:bg-card-bg-dark p-6 rounded-lg shadow-md md:col-span-2 lg:col-span-3">
                <h3 className="text-xl font-semibold mb-4">Recent Activity</h3>
                <div className="space-y-4">
                    <div className="text-center text-card-text-light dark:text-card-text-dark py-8">
                        <p>No recent activity to display.</p>
                        <p className="mt-2">
                            {user ? (
                                'Start by adding or browsing recipes!'
                            ) : (
                                'Log in to start adding and managing recipes!'
                            )}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
