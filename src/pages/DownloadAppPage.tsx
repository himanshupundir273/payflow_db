import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone } from 'lucide-react';

const DownloadAppPage: React.FC = () => {
  // Google Drive direct download link
  const FILE_ID = '1wMwY9ZakgviMcchOwc9x2BitkWU2KDRV';
  const appUrl = `https://drive.google.com/uc?export=download&id=${FILE_ID}`;
  
  // Fixed date: June 17th, 2025
  const lastUpdateDate = '17_06_2025';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="flex flex-col items-center mb-6">
            <Smartphone className="h-12 w-12 text-primary-600 mb-4" />
            <h2 className="text-center text-2xl font-bold text-gray-900">
              Download PayFlow App
            </h2>
            <div className="mt-2 px-4 py-1.5 bg-primary-50 rounded-full">
              <p className="text-sm font-medium text-primary-700">
                Last updated: {lastUpdateDate.replace(/_/g, '/')}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="flex justify-center">
              <QRCodeSVG
                value={appUrl}
                size={250}
                level="H"
                includeMargin={true}
                className="rounded-lg"
              />
            </div>
            
            <p className="mt-6 text-center text-sm text-gray-600">
              Scan the QR code to download the PayFlow app
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DownloadAppPage; 