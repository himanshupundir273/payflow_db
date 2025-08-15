import React from 'react';
import { BarChart3, TrendingUp, BarChart } from 'lucide-react';
import DownloadButtons from './DownloadButtons';

interface ChartViewProps {
  data: any;
  downloadOptions: any;
  onDownload: (format: string, data: any, filename: string) => void;
}

const ChartView: React.FC<ChartViewProps> = ({ data, downloadOptions, onDownload }) => {
  const chartData = data.data || [];
  const chartConfig = data.chartConfig || {};

  // Simple bar chart visualization
  const maxValue = Math.max(...chartData.map((item: any) => item.value || 0));
  
  return (
    <div className="mt-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-gray-800 flex items-center">
          <BarChart3 className="h-5 w-5 mr-2 text-green-600" />
          {chartConfig.title || 'Chart Visualization'}
        </h4>
        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
          {chartData.length} data points
        </span>
      </div>

      {/* Chart Configuration Info */}
      {chartConfig && (
        <div className="mb-4 p-3 bg-white rounded border border-green-100">
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-gray-600">Chart Type:</span>
              <span className="ml-2 font-medium text-gray-800 capitalize">{chartConfig.type || 'bar'}</span>
            </div>
            <div>
              <span className="text-gray-600">X-Axis:</span>
              <span className="ml-2 font-medium text-gray-800">{chartConfig.xAxis || 'Category'}</span>
            </div>
            <div>
              <span className="text-gray-600">Y-Axis:</span>
              <span className="ml-2 font-medium text-gray-800">{chartConfig.yAxis || 'Value'}</span>
            </div>
            <div>
              <span className="text-gray-600">Max Value:</span>
              <span className="ml-2 font-medium text-gray-800">{maxValue}</span>
            </div>
          </div>
        </div>
      )}

      {/* Simple Bar Chart Visualization */}
      <div className="space-y-3 mb-4">
        {chartData.slice(0, 10).map((item: any, idx: number) => {
          const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          return (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700 capitalize font-medium min-w-0 flex-1">
                  {item.label}
                </span>
                <span className="text-gray-800 font-semibold ml-2">
                  {item.value}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-green-400 to-emerald-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
        
        {chartData.length > 10 && (
          <p className="text-xs text-gray-500 text-center pt-2">
            +{chartData.length - 10} more data points
          </p>
        )}
      </div>

      {/* Data Table View */}
      <div className="mt-4 p-3 bg-white rounded border border-green-100">
        <h5 className="font-medium text-gray-800 mb-2 flex items-center">
          <BarChart className="h-4 w-4 mr-2 text-green-600" />
          Data Table
        </h5>
        <div className="max-h-32 overflow-y-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-1 font-medium text-gray-700">Label</th>
                <th className="text-right py-1 font-medium text-gray-700">Value</th>
                {chartData[0]?.count && (
                  <th className="text-right py-1 font-medium text-gray-700">Count</th>
                )}
              </tr>
            </thead>
            <tbody>
              {chartData.slice(0, 8).map((item: any, idx: number) => (
                <tr key={idx} className="border-b border-gray-100">
                  <td className="py-1 text-gray-700 capitalize">{item.label}</td>
                  <td className="py-1 text-right font-medium text-gray-800">{item.value}</td>
                  {item.count && (
                    <td className="py-1 text-right text-gray-600">{item.count}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Download Section */}
      <DownloadButtons 
        downloadOptions={downloadOptions} 
        onDownload={onDownload}
        data={chartData}
        filename="chart_data"
      />
    </div>
  );
};

export default ChartView;
