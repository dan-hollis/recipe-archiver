import {
    Disclosure,
    DisclosureButton,
    DisclosurePanel,
    Menu,
    MenuButton,
    MenuItem,
    MenuItems,
    Transition
} from '@headlessui/react';
import {
    Bars3Icon,
    BookOpenIcon,
    ChatBubbleLeftIcon,
    UserCircleIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import { Fragment, memo, useContext, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { UserContext } from '../contexts/UserContext';
import { api } from '../utils/api';
import { useSocketNotifications } from '../utils/socket';

function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
}

const Navbar = memo(function Navbar({ userData }) {
    const [notificationCount, setNotificationCount] = useState(0);
    const { isDarkMode, toggleTheme } = useTheme();
    const { setToken } = useContext(AuthContext);
    const { setUser } = useContext(UserContext);
    const navigate = useNavigate();
    const [error, setError] = useState(null);
    const { token } = useContext(AuthContext);
    const location = useLocation();

    useSocketNotifications(setNotificationCount);

    const handleLogout = async (e) => {
        e.preventDefault();
        try {
            // First clear contexts
            setToken(null);
            setUser(null);
            
            // Then call API to logout
            await api.logout();
            
            // Finally navigate
            navigate('/home', { replace: true });
        } catch (error) {
            setError('Failed to log out. Please try again.');
        }
    };

    const navigation = [
        { name: 'Home', href: '/home' },
        { name: 'Recipes', href: '/recipes' },
        { name: 'Users', href: '/users' },
    ]

    return (
        <Disclosure as="nav" className={`bg-background-light dark:bg-background-dark`}>
            {({ open }) => (
                <>
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <div className="flex h-16 justify-between">
                            <div className="flex">
                                <div className="-ml-2 mr-2 flex items-center md:hidden">
                                    <DisclosureButton className="relative inline-flex items-center justify-center rounded-md p-2 text-text-light dark:text-text-dark hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
                                        <span className="sr-only">Open main menu</span>
                                        {open ? (
                                            <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                                        ) : (
                                            <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                                        )}
                                    </DisclosureButton>
                                </div>
                                <div className="flex flex-shrink-0 items-center">
                                    <BookOpenIcon className="h-8 w-8 text-text-light dark:text-text-dark" />
                                </div>
                                <div className="hidden md:ml-6 md:flex md:items-center md:space-x-4">
                                    {navigation.map((item) => (
                                        <Link
                                            key={item.name}
                                            to={item.href}
                                            className={classNames(
                                                location.pathname === item.href
                                                    ? 'bg-gray-900 text-white'
                                                    : 'text-text-light dark:text-text-dark hover:bg-gray-700 hover:text-white',
                                                'rounded-md px-3 py-2 text-sm font-medium'
                                            )}
                                        >
                                            {item.name}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center">
                                <button
                                    onClick={toggleTheme}
                                    className="p-2 bg-gray-200 dark:bg-gray-800 rounded text-text-light dark:text-text-dark"
                                >
                                    {isDarkMode ? 'Light Mode' : 'Dark Mode'}
                                </button>
                                <Link
                                    to="/messages"
                                    className="relative rounded-full bg-background-light dark:bg-background-dark p-1 text-text-light dark:text-text-dark hover:text-white"
                                >
                                    <ChatBubbleLeftIcon className="h-6 w-6" />
                                    <div id="message_count">
                                        {notificationCount > 0 ? notificationCount : '\u00A0\u00A0'}
                                    </div>
                                </Link>

                                {token ? (
                                    <Menu as="div" className="relative ml-3">
                                        <MenuButton className="relative flex rounded-full bg-background-light dark:bg-background-dark text-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800">
                                            <UserCircleIcon className="h-8 w-8 text-text-light dark:text-text-dark" />
                                        </MenuButton>
                                        <Transition
                                            as={Fragment}
                                            enter="transition ease-out duration-100"
                                            enterFrom="transform opacity-0 scale-95"
                                            enterTo="transform opacity-100 scale-100"
                                            leave="transition ease-in duration-75"
                                            leaveFrom="transform opacity-100 scale-100"
                                            leaveTo="transform opacity-0 scale-95"
                                        >
                                            <MenuItems className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-card-bg-light dark:bg-card-bg-dark py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                                <MenuItem as={NavLink} to={`/profile`} className={({ isActive }) =>
                                                    classNames(
                                                        isActive ? 'bg-gray-100 dark:bg-gray-700' : '',
                                                        'block px-4 py-2 text-sm text-text-light dark:text-text-dark'
                                                    )
                                                }>
                                                    Your Profile
                                                </MenuItem>
                                                <MenuItem as="button" onClick={handleLogout} className={({ isActive }) =>
                                                    classNames(
                                                        isActive ? 'bg-gray-100 dark:bg-gray-700' : '',
                                                        'block w-full text-left px-4 py-2 text-sm text-text-light dark:text-text-dark'
                                                    )
                                                }>
                                                    Sign out
                                                </MenuItem>
                                            </MenuItems>
                                        </Transition>
                                    </Menu>
                                ) : (
                                    <div className="flex items-center space-x-4">
                                        <Link
                                            to="/login"
                                            className="text-text-light dark:text-text-dark hover:bg-gray-700 hover:text-white rounded-md px-3 py-2 text-sm font-medium"
                                        >
                                            Log In
                                        </Link>
                                        <Link
                                            to="/signup"
                                            className="text-text-light dark:text-text-dark hover:bg-gray-700 hover:text-white rounded-md px-3 py-2 text-sm font-medium"
                                        >
                                            Sign Up
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <DisclosurePanel className="md:hidden">
                        <div className="space-y-1 px-2 pb-3 pt-2">
                            {navigation.map((item) => (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={classNames(
                                        location.pathname === item.href
                                            ? 'bg-gray-900 text-white'
                                            : 'text-text-light dark:text-text-dark hover:bg-gray-700 hover:text-white',
                                        'block rounded-md px-3 py-2 text-base font-medium'
                                    )}
                                >
                                    {item.name}
                                </Link>
                            ))}
                        </div>
                    </DisclosurePanel>
                </>
            )}
        </Disclosure>
    )
});

export default Navbar;