import React, { useState } from 'react';
import { storage } from '../firebase';
import imageCompression from 'browser-image-compression';

export default function ImageUploader({ groupId, currentPhotoUrl, onPhotoUploaded, onPhotoRemoved }) {
    const [uploading, setUploading] = useState(false);

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert("Please select an image file.");
            return;
        }

        setUploading(true);
        try {
            const options = { maxSizeMB: 0.8, maxWidthOrHeight: 1200, useWebWorker: true };
            const compressedFile = await imageCompression(file, options);
            
            const fileRef = storage.ref(`pubs/${groupId}/${Date.now()}_${file.name}`);
            await fileRef.put(compressedFile);
            
            const url = await fileRef.getDownloadURL();
            onPhotoUploaded(url); // Sends the URL back to the parent page
        } catch (err) {
            console.error("Upload failed:", err);
            alert("Failed to upload image.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex items-center gap-4 w-full">
            <label className={`flex-1 flex flex-col items-center justify-center px-4 py-4 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                currentPhotoUrl 
                ? 'border-green-500 bg-green-50 dark:bg-green-900/10' 
                : 'border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500 bg-gray-50 dark:bg-gray-700/50'
            }`}>
                {uploading ? (
                    <svg className="animate-spin mb-1 h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                ) : (
                    <span className="text-2xl mb-1">📸</span>
                )}
                <span className="text-sm font-bold text-gray-600 dark:text-gray-300 text-center">
                    {uploading ? "Uploading Image..." : currentPhotoUrl ? "Change Photo" : "Upload or Take Photo"}
                </span>
                <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                    className="hidden" 
                    disabled={uploading} 
                />
            </label>

            {currentPhotoUrl && (
                <div className="relative w-20 h-20 group flex-shrink-0">
                    <img 
                        src={currentPhotoUrl} 
                        alt="Preview" 
                        className="w-full h-full object-cover rounded-xl shadow-md border-2 border-white dark:border-gray-600" 
                    />
                    <button 
                        type="button"
                        onClick={onPhotoRemoved}
                        className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition"
                    >
                        ✕
                    </button>
                </div>
            )}
        </div>
    );
}