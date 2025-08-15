import React from 'react';
import { BarChart3, Table, FileText, Download, TrendingUp, Users, DollarSign } from 'lucide-react';
import { Bar, Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

interface ResponseHandlerProps {
  response: any;
  onDownload: (format: string, data: any, filename: string) => void;
}

const ResponseHandler: React.FC<ResponseHandlerProps> = ({ response, onDownload }) => {
  if (!response || !response.data) {
    return (
      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">No data available</p>
      </div>
    );
  }

  // Handle nested data structure from MCP server
  const { type, data: responseData, downloadOptions, uiRequirements } = response.data;
  
  // Extract the actual data array from the nested structure
  const data = responseData?.data || responseData || [];

  // Simple data display based on UI requirements
  return (
    <div className="mt-3 space-y-4">
      {/* Chart - Show if needed */}
      {uiRequirements?.needsChart && uiRequirements.chartData && uiRequirements.chartData.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-800 flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-green-600" />
              Data Visualization
            </h4>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
              {uiRequirements.chartData.length} data points
            </span>
          </div>
          
          <div className="h-64">
            {uiRequirements.chartType === 'pie' ? (
              <Pie
                data={{
                  labels: uiRequirements.chartData.map((item: any) => item.label),
                  datasets: [{
                    data: uiRequirements.chartData.map((item: any) => item.value),
                    backgroundColor: [
                      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
                      '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        padding: 20,
                        usePointStyle: true
                      }
                    }
                  }
                }}
              />
            ) : uiRequirements.chartType === 'line' ? (
              <Line
                data={{
                  labels: uiRequirements.chartData.map((item: any) => item.label),
                  datasets: [{
                    label: 'Value',
                    data: uiRequirements.chartData.map((item: any) => item.value),
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                      }
                    },
                    x: {
                      grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                      }
                    }
                  }
                }}
              />
            ) : (
              <Bar
                data={{
                  labels: uiRequirements.chartData.map((item: any) => item.label),
                  datasets: [{
                    label: 'Value',
                    data: uiRequirements.chartData.map((item: any) => item.value),
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderColor: '#3B82F6',
                    borderWidth: 1,
                    borderRadius: 4
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                      }
                    },
                    x: {
                      grid: {
                        color: 'rgba(0, 0, 0, 0.1)'
                      }
                    }
                  }
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Data Table - Always show if data exists */}
      {uiRequirements?.needsTable && data && Array.isArray(data) && data.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-800 flex items-center">
              <Table className="h-5 w-5 mr-2 text-blue-600" />
              Data Results
            </h4>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              {data.length} records
            </span>
          </div>
          
          <div className="max-h-48 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="border-b border-gray-200">
                  {Object.keys(data[0] || {}).slice(0, 5).map((col) => (
                    <th key={col} className="text-left py-2 px-2 font-medium text-gray-700">
                      {col.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice(0, 8).map((row: any, idx: number) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                    {Object.keys(row).slice(0, 5).map((col) => (
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
            
            {data.length > 8 && (
              <div className="text-center py-2 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Showing first 8 of {data.length} records
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Download Buttons - Only show if needed */}
      {uiRequirements && (uiRequirements.needsCSV || uiRequirements.needsPDF) && (
        <div className="p-3 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h5 className="font-medium text-gray-800 flex items-center">
              <Download className="h-4 w-4 mr-2 text-gray-600" />
              Download Options
            </h5>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {uiRequirements.needsCSV && (
              <button
                onClick={() => onDownload('csv', data, 'payment_data')}
                className="flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium bg-green-500 hover:bg-green-600 text-white transition-all duration-200"
              >
                <FileText className="h-4 w-4" />
                <span>CSV</span>
              </button>
            )}
            
            {uiRequirements.needsPDF && (
              <button
                onClick={() => onDownload('pdf', data, 'payment_report')}
                className="flex items-center justify-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium bg-red-500 hover:bg-red-600 text-white transition-all duration-200"
              >
                <FileText className="h-4 w-4" />
                <span>PDF</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResponseHandler;
