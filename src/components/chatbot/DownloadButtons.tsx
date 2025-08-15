import React from 'react';
import { Download, FileText, BarChart3, Image, FileSpreadsheet } from 'lucide-react';

interface DownloadButtonsProps {
  downloadOptions: any;
  onDownload: (format: string, data: any, filename: string) => void;
  data: any;
  filename: string;
}

const DownloadButtons: React.FC<DownloadButtonsProps> = ({ 
  downloadOptions, 
  onDownload, 
  data, 
  filename 
}) => {
  if (!downloadOptions || Object.keys(downloadOptions).length === 0) {
    return null;
  }

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'csv':
      case 'excel':
        return <FileSpreadsheet className="h-4 w-4" />;
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      case 'png':
      case 'svg':
        return <Image className="h-4 w-4" />;
      default:
        return <Download className="h-4 w-4" />;
    }
  };

  const getFormatLabel = (format: string) => {
    switch (format) {
      case 'csv':
        return 'CSV';
      case 'excel':
        return 'Excel';
      case 'pdf':
        return 'PDF';
      case 'png':
        return 'PNG';
      case 'svg':
        return 'SVG';
      default:
        return format.toUpperCase();
    }
  };

  const getFormatColor = (format: string) => {
    switch (format) {
      case 'csv':
        return 'bg-green-500 hover:bg-green-600 text-white';
      case 'excel':
        return 'bg-emerald-500 hover:bg-emerald-600 text-white';
      case 'pdf':
        return 'bg-red-500 hover:bg-red-600 text-white';
      case 'png':
        return 'bg-blue-500 hover:bg-blue-600 text-white';
      case 'svg':
        return 'bg-purple-500 hover:bg-purple-600 text-white';
      default:
        return 'bg-gray-500 hover:bg-gray-600 text-white';
    }
  };

  const handleDownload = (format: string) => {
    if (downloadOptions[format]) {
      onDownload(format, data, filename);
    }
  };

  const availableFormats = Object.entries(downloadOptions)
    .filter(([format, available]) => available)
    .map(([format]) => format);

  if (availableFormats.length === 0) {
    return null;
  }

  return (
    <div className="p-3 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-3">
        <h5 className="font-medium text-gray-800 flex items-center">
          <Download className="h-4 w-4 mr-2 text-gray-600" />
          Download Options
        </h5>
        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
          {availableFormats.length} formats
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {availableFormats.map((format) => (
          <button
            key={format}
            onClick={() => handleDownload(format)}
            className={`flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${getFormatColor(format)}`}
            title={`Download as ${getFormatLabel(format)}`}
          >
            {getFormatIcon(format)}
            <span>{getFormatLabel(format)}</span>
          </button>
        ))}
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          Click any button above to download your data
        </p>
      </div>
    </div>
  );
};

export default DownloadButtons;
