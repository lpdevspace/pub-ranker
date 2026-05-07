export default function LoadingScreen({ text = '' }) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="loader"></div>
            <p className="ml-4 text-gray-600 dark:text-gray-400">{text} Loading...</p>
        </div>
    );
}
