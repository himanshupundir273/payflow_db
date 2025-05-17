import React, { useState, useMemo } from 'react';
import { usePaymentStore } from '../store/paymentStore';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Download, FileSpreadsheet, Filter, Calendar, X, CheckCircle, Loader2 } from 'lucide-react';
import Input from '../components/ui/Input';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const ExportPage: React.FC = () => {
  const { payments } = usePaymentStore();
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(new Date().setDate(1)), 'yyyy-MM-dd'), // First day of current month
    endDate: format(new Date(), 'yyyy-MM-dd'), // Today
  });
  const [status, setStatus] = useState<string[]>(['approved', 'processed']);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  const filteredPayments = useMemo(() => {
    return payments.filter(payment => {
      // Filter by status
      if (status.length > 0 && !status.includes(payment.status)) {
        return false;
      }
      
      // Filter by date range
      const paymentDate = new Date(payment.date);
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      endDate.setHours(23, 59, 59); // Set to end of day
      
      return paymentDate >= startDate && paymentDate <= endDate;
    });
  }, [payments, status, dateRange]);
  
  const handleStatusToggle = (statusValue: string) => {
    if (statusValue === 'all') {
      setStatus([]);
      return;
    }

    setStatus(prev => {
      if (prev.includes(statusValue)) {
        return prev.filter(s => s !== statusValue);
      } else {
        return [...prev, statusValue];
      }
    });
  };
  
  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      // Prepare data for export
      const exportData = filteredPayments.map((payment, index) => {
        // Safely format dates
        const formatDate = (dateString: string) => {
          try {
            const date = new Date(dateString);
            return isNaN(date.getTime()) ? 'N/A' : format(date, 'dd/MM/yyyy');
          } catch (error) {
            return 'N/A';
          }
        };

        return {
          'SR. No.': index + 1,
          'Date': formatDate(payment.date),
          'Vendor Name': payment.vendorName || 'N/A',
          'Total Outstanding': payment.totalOutstanding || 0,
          'Advance/TDS': payment.advanceTds || 0,
          'Payment Amount': payment.paymentAmount || 0,
          'Balance Amount': payment.balanceAmount || 0,
          'Item Description': payment.itemDescription || 'N/A',
          'Bill No.': payment.bills?.[0]?.billNumber || 'N/A',
          'Bill Date': payment.bills?.[0]?.billDate ? formatDate(payment.bills[0].billDate) : 'N/A',
          'Requested By': payment.requestedBy?.name || 'N/A',
          'Approved By': payment.approvedBy?.name || 'N/A',
          'Company Name': payment.companyName || 'N/A',
          'Status': payment.status ? payment.status.charAt(0).toUpperCase() + payment.status.slice(1) : 'N/A',
        };
      });
      
      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Payments');
      
      // Generate Excel file
      const today = format(new Date(), 'yyyy-MM-dd');
      const fileName = `Payment_Report_${today}.xlsx`;
      
      if (Capacitor.isNativePlatform()) {
        try {
          // Convert workbook to binary string
          const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
          
          // Write file to cache directory first
          const result = await Filesystem.writeFile({
            path: fileName,
            data: excelBuffer,
            directory: Directory.Cache,
            recursive: true
          });
          
          // Get the file URI
          const fileUri = result.uri;
          
          // Share the file
          await Share.share({
            title: 'Payment Report',
            text: 'Payment Report Export',
            url: fileUri,
            dialogTitle: 'Share Payment Report'
          });
          
          setExportSuccess(true);
          setTimeout(() => setExportSuccess(false), 3000);
        } catch (error) {
          console.error('Error in mobile export process:', error);
          if (error instanceof Error) {
            alert(`Error exporting file: ${error.message}`);
          } else {
            alert('Error exporting file. Please try again.');
          }
        }
      } else {
        // Web platform
        XLSX.writeFile(workbook, fileName);
        setExportSuccess(true);
        setTimeout(() => setExportSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Error in export process:', error);
      if (error instanceof Error) {
        alert(`Error exporting file: ${error.message}`);
      } else {
        alert('Error exporting file. Please try again.');
      }
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Export Payments</h1>
        <p className="text-sm text-gray-500">
          Export payments data to Excel for processing
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="md:col-span-2">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Export Settings</h2>
          
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Date Range</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  type="date"
                  label="Start Date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  leftIcon={<Calendar className="h-5 w-5 text-gray-400" />}
                  fullWidth
                />
                <Input
                  type="date"
                  label="End Date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  leftIcon={<Calendar className="h-5 w-5 text-gray-400" />}
                  fullWidth
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Status Filter</label>
              <div className="flex flex-wrap gap-2">
                {['all', 'pending', 'approved', 'rejected', 'processed', 'query_raised'].map(statusOption => (
                  <button
                    key={statusOption}
                    onClick={() => handleStatusToggle(statusOption)}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      (statusOption === 'all' && status.length === 0) ||
                      (statusOption !== 'all' && status.includes(statusOption))
                        ? 'bg-primary-100 text-primary-800'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {statusOption === 'all' 
                      ? 'All Statuses'
                      : statusOption.charAt(0).toUpperCase() + statusOption.slice(1).replace('_', ' ')}
                  </button>
                ))}
              </div>
              {status.length > 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  Selected: {status.length} status{status.length !== 1 ? 'es' : ''}
                </p>
              )}
            </div>
            
            <div className="mt-6">
              <Button
                onClick={exportToExcel}
                icon={isExporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                disabled={filteredPayments.length === 0 || isExporting}
              >
                {isExporting ? 'Exporting...' : 'Export to Excel'}
              </Button>
              
              {exportSuccess && (
                <div className="mt-4 flex items-center text-success-600">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  <span>Export successful!</span>
                </div>
              )}
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Export Preview</h2>
            <Filter className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="text-center py-4">
            <div className="bg-gray-100 p-4 rounded-lg mb-4">
              <FileSpreadsheet className="h-12 w-12 text-primary-600 mx-auto" />
            </div>
            
            <p className="text-xl font-medium text-gray-900 mb-1">
              {filteredPayments.length} Payments
            </p>
            
            <p className="text-sm text-gray-500 mb-4">
              From {format(new Date(dateRange.startDate), 'dd MMM yyyy')} to {format(new Date(dateRange.endDate), 'dd MMM yyyy')}
            </p>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Approved:</span>
                <span className="font-medium">
                  {filteredPayments.filter(p => p.status === 'approved').length}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Processed:</span>
                <span className="font-medium">
                  {filteredPayments.filter(p => p.status === 'processed').length}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Amount:</span>
                <span className="font-medium">
                  {filteredPayments
                    .reduce((sum, p) => sum + p.paymentAmount, 0)
                    .toLocaleString('en-IN', { 
                      style: 'currency', 
                      currency: 'INR',
                      maximumFractionDigits: 0,
                    })}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ExportPage;