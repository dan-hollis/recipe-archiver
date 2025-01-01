import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const config = {
    plugins: [react()],
    build: {
        outDir: '../app/static/react',
        emptyOutDir: true,
        manifest: true,
        rollupOptions: {
            output: {
                manualChunks: {
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    'socket-vendor': ['socket.io-client'],
                    'auth-vendor': ['react-google-recaptcha-v3'],
                    'ui-components': [
                        '@headlessui/react', 
                        '@heroicons/react',
                        'react-error-boundary'
                    ],
                },
            },
        },
    },
    server: {
        hmr: true,
        watch: {
            usePolling: true
        },
        proxy: {
            '/api': 'http://127.0.0.1:6000',
            '/socket.io': {
                target: 'http://127.0.0.1:6000',
                ws: true
            }
        }
    }
}

export default defineConfig(config)
