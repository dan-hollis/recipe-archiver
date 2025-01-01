import { useContext } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { UserContext } from '../contexts/UserContext';
import Navbar from './Navbar';

const Layout = ({ children }) => {
    const { user } = useContext(UserContext);
    const { isDarkMode } = useTheme();

    return (
        <div className={`min-h-screen bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark`}>
            <Navbar userData={user} />
            <div className="container mx-auto px-4 py-8">
                {children}
            </div>
        </div>
    );
};

export default Layout;