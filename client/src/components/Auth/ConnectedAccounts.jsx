import React from 'react';

export default function ConnectedAccounts({ connectedAccounts }) {
    return (
        <div className="mt-4">
            <h3 className="text-lg font-medium">Connected Accounts</h3>
            <div className="mt-2 space-y-4">
                {/* Discord */}
                <div className="flex items-center justify-between">
                    <span>Discord</span>
                    {connectedAccounts?.discord ? (
                        <div className="flex items-center">
                            <span className="text-sm text-gray-500 mr-2">
                                Connected as {connectedAccounts.discord.username}
                            </span>
                            <button
                                onClick={() => handleUnlink('discord')}
                                className="text-red-600 hover:text-red-800"
                            >
                                Unlink
                            </button>
                        </div>
                    ) : (
                        <a
                            href="/oauth/discord/link"
                            className="text-blue-600 hover:text-blue-800"
                        >
                            Connect
                        </a>
                    )}
                </div>
                
                {/* Add other providers here */}
            </div>
        </div>
    );
}