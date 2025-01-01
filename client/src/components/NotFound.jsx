import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

export default function NotFound() {
    const { isDarkMode } = useTheme();
    
    return (
        <div className={`flex flex-col items-center justify-center min-h-[60vh] ${
            isDarkMode ? 'text-text-dark' : 'text-text-light'
        }`}>
            <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
            <p className="mb-4">The page you're looking for doesn't exist.</p>
            <Link 
                to="/" 
                className={`${
                    isDarkMode 
                        ? 'text-blue-400 hover:text-blue-300' 
                        : 'text-blue-500 hover:text-blue-600'
                } transition-colors duration-200`}
            >
                Return Home
            </Link>
        </div>
    );
}