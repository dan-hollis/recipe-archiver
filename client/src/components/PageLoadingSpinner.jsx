
export default function PageLoadingSpinner() {
    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-center items-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
        </div>
    );
} 