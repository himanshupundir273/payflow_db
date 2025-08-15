import React from 'react';
import { Table, FileText, Download, BarChart3, TrendingUp } from 'lucide-react';
import DownloadButtons from './DownloadButtons';

interface DataViewProps {
  data: any;
  downloadOptions: any;
  onDownload: (format: string, data: any, filename: string) => void;
}

const DataView: React.FC<DataViewProps> = ({ data, downloadOptions, onDownload }) => {
  const renderTableData = () => {
    if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
      return (
        <div className="text-center py-4 text-gray-500">
          <Table className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm">No data available</p>
        </div>
      );
    }

    const columns = data.columns || Object.keys(data.data[0] || {});
    const displayData = data.data.slice(0, 8); // Show first 8 rows

    return (
      <div className="max-h-48 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-gray-50">
            <tr className="border-b border-gray-200">
              {columns.slice(0, 6).map((col: string) => (
                <th key={col} className="text-left py-2 px-2 font-medium text-gray-700">
                  {col.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayData.map((row: any, idx: number) => (
              <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                {columns.slice(0, 6).map((col: string) => (
                  <td key={col} className="py-2 px-2 text-gray-700">
                    <div className="max-w-24 truncate" title={String(row[col] || '')}>
                      {String(row[col] || '').substring(0, 20)}
                      {String(row[col] || '').length > 20 && '...'}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        
        {data.data.length > 8 && (
          <div className="text-center py-2 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Showing first 8 of {data.data.length} records
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderSummaryData = () => {
    if (!data.data || typeof data.data !== 'object') return null;

    const summaryItems = Object.entries(data.data).filter(([key, value]) => 
      value !== null && value !== undefined && key !== 'timestamp'
    );

    if (summaryItems.length === 0) return null;

    return (
      <div className="space-y-3">
        {summaryItems.map(([key, value]) => (
          <div key={key} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
            <span className="text-sm text-gray-600 capitalize">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </span>
            <span className="text-sm font-medium text-gray-800">
              {typeof value === 'number' && key.toLowerCase().includes('amount') 
                ? `₹${value.toLocaleString()}` 
                : String(value)
              }
            </span>
          </div>
        ))}
      </div>
    );
  };

  const renderExportData = () => {
    if (!data.data || !Array.isArray(data.data)) return null;

    return (
      <div className="text-center py-4">
        <Download className="h-8 w-8 mx-auto mb-2 text-green-600" />
        <p className="text-sm font-medium text-gray-800 mb-1">
          {data.filename || 'data_export'}
        </p>
        <p className="text-xs text-gray-600">
          {data.data.length} records ready for export
        </p>
        {data.format && (
          <span className="inline-block mt-2 px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
            {data.format.toUpperCase()} format
          </span>
        )}
      </div>
    );
  };

  const getViewIcon = () => {
    switch (data.type) {
      case 'table':
        return <Table className="h-5 w-5 text-blue-600" />;
      case 'summary':
        return <TrendingUp className="h-5 w-5 text-green-600" />;
      case 'export':
        return <Download className="h-5 w-5 text-purple-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-600" />;
    }
  };

  const getViewTitle = () => {
    switch (data.type) {
      case 'table':
        return 'Data Table';
      case 'summary':
        return 'Summary';
      case 'export':
        return 'Export Ready';
      default:
        return 'Data View';
    }
  };

  const getViewColor = () => {
    switch (data.type) {
      case 'table':
        return 'from-blue-50 to-indigo-50 border-blue-200';
      case 'summary':
        return 'from-green-50 to-emerald-50 border-green-200';
      case 'export':
        return 'from-purple-50 to-pink-50 border-purple-200';
      default:
        return 'from-gray-50 to-slate-50 border-gray-200';
    }
  };

  return (
    <div className={`mt-3 p-4 bg-gradient-to-r ${getViewColor()} rounded-lg border`}>
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-gray-800 flex items-center">
          {getViewIcon()}
          <span className="ml-2">{getViewTitle()}</span>
        </h4>
        <span className="text-xs bg-white px-2 py-1 rounded-full border text-gray-700">
          {data.totalCount || data.data?.length || 0} records
        </span>
      </div>

      {/* Data Content */}
      <div className="mb-4">
        {data.type === 'table' && renderTableData()}
        {data.type === 'summary' && renderSummaryData()}
        {data.type === 'export' && renderExportData()}
        {!data.type && renderTableData()}
      </div>

      {/* Download Section */}
      <DownloadButtons 
        downloadOptions={downloadOptions} 
        onDownload={onDownload}
        data={data.data || data}
        filename={data.filename || 'data_export'}
      />
    </div>
  );
};

export default DataView;
