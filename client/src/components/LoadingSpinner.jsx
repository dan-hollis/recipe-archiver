import { useTheme } from '../contexts/ThemeContext';

export default function LoadingSpinner() {
    const { isDarkMode } = useTheme();
    
    return (
        <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
                <p className={`mt-4 text-lg ${
                    isDarkMode ? 'text-text-dark' : 'text-text-light'
                }`}>
                    Loading...
                </p>
            </div>
        </div>
    );
}