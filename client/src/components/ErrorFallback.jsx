import { useTheme } from '../contexts/ThemeContext';

export default function ErrorFallback({ error, resetErrorBoundary }) {
    const { isDarkMode } = useTheme();
    
    return (
        <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark">
            <div className="max-w-xl w-full bg-card-bg-light dark:bg-card-bg-dark p-8 rounded-lg shadow-md">
                <h1 className="text-2xl font-bold text-red-600 mb-4">
                    Something went wrong
                </h1>
                <pre className="text-sm overflow-auto p-4 bg-gray-100 dark:bg-gray-800 rounded mb-4">
                    {error.message}
                </pre>
                <button
                    onClick={resetErrorBoundary}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200"
                >
                    Try again
                </button>
                <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                    If the problem persists, please contact support.
                </p>
            </div>
        </div>
    );
}