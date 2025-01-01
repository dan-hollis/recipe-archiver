import { useContext, useEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';
import { Navigate, Route, BrowserRouter as Router, Routes, useNavigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from './components/Auth/Login';
import OAuthCallback from './components/Auth/OAuthCallback';
import Signup from './components/Auth/Signup';
import ChatWindow from './components/Chat/ChatWindow';
import Inbox from './components/Chat/Inbox';
import ErrorFallback from './components/ErrorFallback';
import Home from './components/Home';
import Layout from './components/Layout';
import MFASetup from './components/MFA/Setup';
import MFAVerify from './components/MFA/Verify';
import NotFound from './components/NotFound';
import EditProfile from './components/Profile/EditProfile';
import Profile from './components/Profile/Profile';
import ProtectedRoute from './components/ProtectedRoute';
import AddRecipe from './components/Recipes/AddRecipe';
import Recipe from './components/Recipes/Recipe';
import RecipesTable from './components/Recipes/RecipesTable';
import UsersTable from './components/Users/UsersTable';
import { AuthContext } from './contexts/AuthContext';
import { UserContext } from './contexts/UserContext';
import { initializeSocket, socket } from './utils/socket';

function AppRoutes() {
	const navigate = useNavigate();
	const { setToken, token } = useContext(AuthContext);
	const { setUser } = useContext(UserContext);
	
	useEffect(() => {
		if (token) {
			initializeSocket(token);
		}
	}, [token]);
	
	const handleReset = () => {
		// Clear any cached data or state that might have caused the error
		localStorage.removeItem('cached_data');
		sessionStorage.clear();
		
		// Reset any global state management
		setUser(null);
		setToken(null);
		
		// Force refresh API clients or sockets
		socket.disconnect();
		socket.connect();
		
		// Navigate to a safe route
		navigate('/', { replace: true });
		
		// If all else fails, hard refresh
		if (import.meta.env.NODE_ENV === 'production') {
			window.location.href = '/';
		}
	};
	
	return (
		<ErrorBoundary 
			FallbackComponent={ErrorFallback}
			onReset={handleReset}
		>
			<div className="min-h-screen bg-background-light dark:bg-background-dark">
				<ToastContainer />
				<Routes>
					<Route path="/" element={<Navigate to="/home" replace />} />
					<Route path="/home" element={<Layout><Home /></Layout>} />
					<Route path="/login" element={
						<ReCaptchaProtectedComponent>
							<Login />
						</ReCaptchaProtectedComponent>
					} />
					<Route path="/signup" element={
						<ReCaptchaProtectedComponent>
							<Signup />
						</ReCaptchaProtectedComponent>
					} />
					<Route path="/oauth/:provider/callback" element={<OAuthCallback />} />
					<Route path="/messages" element={
						<ProtectedRoute>
							<Layout><Inbox /></Layout>
						</ProtectedRoute>
					} />
					<Route path="/messages/:userId" element={
						<ProtectedRoute>
							<Layout><ChatWindow /></Layout>
						</ProtectedRoute>
					} />
					<Route path="/mfa/setup" element={
						<ProtectedRoute>
							<Layout><MFASetup /></Layout>
						</ProtectedRoute>
					} />
					<Route path="/mfa/verify/:userId" element={
						<Layout>
							<MFAVerify />
						</Layout>
					} />
					<Route path="/mfa/disable" element={
						<ProtectedRoute>
							<Layout><MFAVerify /></Layout>
						</ProtectedRoute>
					} />
					<Route path="/profile/:userId?" element={
						<Layout>
							<Profile />
						</Layout>
					} />
					<Route path="/profile/edit" element={
						<ProtectedRoute>
							<Layout><EditProfile /></Layout>
						</ProtectedRoute>
					} />
					<Route path="/recipes/:recipeId" element={
						<Layout>
							<Recipe />
						</Layout>
					} />
					<Route path="/recipes" element={
						<Layout>
							<RecipesTable />
						</Layout>
					} />
					<Route path="/recipes/add" element={
						<ProtectedRoute>
							<Layout><AddRecipe /></Layout>
						</ProtectedRoute>
					} />
					<Route path="/users" element={
						<Layout>
							<UsersTable />
						</Layout>
					} />
					<Route path="*" element={
						<Layout>
							<NotFound />
						</Layout>
					} />
				</Routes>
			</div>
		</ErrorBoundary>
	);
}

function ReCaptchaProtectedComponent({ children }) {
	return (
		<GoogleReCaptchaProvider reCaptchaKey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}>
			{children}
		</GoogleReCaptchaProvider>
	);
}

function App() {
	return (
		<Router>
			<AppRoutes />
		</Router>
	);
}

export default App;