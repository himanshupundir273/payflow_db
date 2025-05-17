import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { toast } from 'react-hot-toast';

const FileViewerPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { url, type, fileName, paymentId } = location.state as { url: string; type: string; fileName: string; paymentId: string };
  const [fileUrl, setFileUrl] = useState<string>(url);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('No internet connection. Please check your connection and try again.');
      if (paymentId) {
        navigate(`/payments/${paymentId}`);
      } else {
        navigate(-1);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [navigate, paymentId]);

  useEffect(() => {
    const handleFile = async () => {
      if (!isOnline) {
        setError('No internet connection. Please check your connection and try again.');
        setIsLoading(false);
        return;
      }

      if (Capacitor.isNativePlatform())
        try {
          // For images, we can use the URL directly
          if (type === 'image') {
            setFileUrl(url);
            setIsLoading(false);
            return;
          }

          // For PDFs, we'll use the URL directly
          if (type === 'pdf') {
            setFileUrl(url);
            setIsLoading(false);
            return;
          }

          // For other file types, we need to download and store them
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.statusText}`);
          }

          const blob = await response.blob();
          const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Failed to convert file to base64'));
            reader.readAsDataURL(blob);
          });

          const result = await Filesystem.writeFile({
            path: fileName,
            data: base64Data as string,
            directory: Directory.Cache,
            recursive: true
          });

          setFileUrl(result.uri);
        } catch (error) {
          console.error('Error handling file:', error);
          setError('Failed to load file. Please try again.');
        } finally {
          setIsLoading(false);
        }
      else {
        // For web platform, use the URL directly
        setFileUrl(url);
        setIsLoading(false);
      }
    };

    handleFile();
  }, [url, fileName, type, isOnline]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading file...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="text-primary-600 hover:text-primary-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header with back button */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="flex items-center px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            <span>Back</span>
          </button>
          <h1 className="ml-4 text-lg font-medium text-gray-900 truncate">
            {fileName || 'File Preview'}
          </h1>
        </div>
      </div>

      {/* File content */}
      <div className="p-4">
        {type === 'image' && (
          <div className="flex justify-center">
            <img
              src={fileUrl}
              alt="Preview"
              className="max-w-full h-auto"
              onError={(e) => {
                console.error('Error loading image:', e);
                setError('Failed to load image');
              }}
            />
          </div>
        )}
        {type === 'pdf' && (
          <div className="h-[calc(100vh-4rem)] relative">
            {isPdfLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading PDF...</p>
                </div>
              </div>
            )}
            <div className="w-full h-full overflow-hidden">
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`}
                className="w-full h-[calc(100%+50px)] border-none -mt-[40px]"
                title="PDF Preview"
                onLoad={() => setIsPdfLoading(false)}
                onError={(e) => {
                  console.error('Error loading PDF:', e);
                  setError('Failed to load PDF. Please check your internet connection and try again.');
                  setIsPdfLoading(false);
                }}
              />
            </div>
          </div>
        )}
        {type === 'document' && (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
            <p className="text-gray-500 mb-4">Document preview is not available.</p>
            <button
              onClick={async () => {
                try {
                  if (Capacitor.isNativePlatform()) {
                    await Share.share({
                      title: fileName,
                      url: fileUrl,
                      dialogTitle: 'Share File'
                    });
                  } else {
                    const link = document.createElement('a');
                    link.href = fileUrl;
                    link.download = fileName;
                    link.click();
                  }
                } catch (error) {
                  console.error('Error sharing file:', error);
                  setError('Failed to share file');
                }
              }}
              className="text-primary-600 hover:text-primary-700"
            >
              Download File
            </button>
          </div>
        )}
        {type === 'unknown' && (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
            <p className="text-gray-500 mb-4">Preview is not available for this file type.</p>
            <button
              onClick={async () => {
                try {
                  if (Capacitor.isNativePlatform()) {
                    await Share.share({
                      title: fileName,
                      url: fileUrl,
                      dialogTitle: 'Share File'
                    });
                  } else {
                    const link = document.createElement('a');
                    link.href = fileUrl;
                    link.download = fileName;
                    link.click();
                  }
                } catch (error) {
                  console.error('Error sharing file:', error);
                  setError('Failed to share file');
                }
              }}
              className="text-primary-600 hover:text-primary-700"
            >
              Download File
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="fixed bottom-0 left-0 right-0 bg-red-100 p-4">
          <div className="max-w-4xl mx-auto">
            <p className="text-red-800 font-medium">Error:</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-red-600 hover:text-red-800"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileViewerPage; 