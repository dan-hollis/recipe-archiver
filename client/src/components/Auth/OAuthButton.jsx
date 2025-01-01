import { API_URL } from "../../utils/api";

export default function OAuthButton({ provider, isLink = false }) {
    const PROVIDER_CONFIG = {
        discord: {
            bgColor: 'bg-[#5865F2]',
            hoverColor: 'hover:bg-[#4752C4]',
            ringColor: 'focus:ring-[#5865F2]',
            icon: (
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    {/* Discord icon path */}
                </svg>
            )
        }
    };

    const providerKey = provider.toLowerCase();
    const { bgColor, hoverColor, ringColor, icon } = PROVIDER_CONFIG[providerKey];

    const handleClick = async (e) => {
        e.preventDefault();
        if (isLink) {
            try {
                const response = await fetch(`${API_URL}/api/oauth/${providerKey}/link/init`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                const data = await response.json();
                if (data.success && data.state) {
                    window.location.href = `${API_URL}/api/oauth/${providerKey}/link?state=${data.state}`;
                }
            } catch (error) {
                console.error('Failed to initiate OAuth link:', error);
            }
        } else {
            window.location.href = `${API_URL}/oauth/${providerKey}`;
        }
    };

    return (
        <button
            onClick={handleClick}
            className={`w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${bgColor} ${hoverColor} focus:outline-none focus:ring-2 focus:ring-offset-2 ${ringColor}`}
        >
            {icon}
            {isLink ? `Connect ${provider}` : `Continue with ${provider}`}
        </button>
    );
}