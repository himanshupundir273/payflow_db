import React, { useState, useMemo, useEffect } from 'react';
import { usePaymentStore } from '../store/paymentStore';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Download, FileSpreadsheet, Filter, Calendar, X, CheckCircle, Loader2 } from 'lucide-react';
import Input from '../components/ui/Input';
import { format, startOfDay, endOfDay } from 'date-fns';
import * as XLSX from 'xlsx';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { supabase } from '../lib/supabase';

// Import company options
const COMPANY_MAPPING = {
  'ATC': 'Atlanta',
  'ATCL': 'Atlanta (L)',
  'BTC': 'Bestco',
  'CLITE': 'Copperlite',
  'NOTO': 'NotoFire',
  'VCON': 'Valuecon',
  'SGC': 'Satguru',
  'NCCE': 'New',
  'GJ-SB': 'New'
} as const;

const COMPANY_OPTIONS = Object.keys(COMPANY_MAPPING);

const ExportPage: React.FC = () => {
  const { payments, fetchPayments, isLoading: storeLoading } = usePaymentStore();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(new Date().setDate(1)), 'yyyy-MM-dd'), // First day of current month
    endDate: today, // Today
  });
  const [status, setStatus] = useState<string[]>(['approved', 'processed']);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchedPayments, setSearchedPayments] = useState<typeof payments>([]);
  
  // Update searchedPayments whenever payments change
  useEffect(() => {
    setSearchedPayments(payments);
  }, [payments]);
  
  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    try {
      // Only update if the date is valid or if the field is empty
      if (value === '' || !isNaN(new Date(value).getTime())) {
        setDateRange(prev => ({
          ...prev,
          [field]: value
        }));
      }
    } catch (error) {
      console.error('Invalid date:', error);
    }
  };
  
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
  
  const handleCompanyToggle = (companyValue: string) => {
    if (companyValue === 'all') {
      setSelectedCompanies([]);
      return;
    }

    setSelectedCompanies(prev => {
      if (prev.includes(companyValue)) {
        return prev.filter(c => c !== companyValue);
      } else {
        return [...prev, companyValue];
      }
    });
  };
  
  const handleSearch = async () => {
    setIsSearching(true);
    try {
      // Convert dates to start of day and end of day
      const startDate = startOfDay(new Date(dateRange.startDate));
      const endDate = endOfDay(new Date(dateRange.endDate));

      // First fetch with a large page size to get total count
      await fetchPayments(1, 10000, true, {
        status,
        dateRange: {
          start: format(startDate, 'yyyy-MM-dd'),
          end: format(endDate, 'yyyy-MM-dd')
        },
        company: null, // Not using the legacy company field
        companyList: selectedCompanies.length > 0 
          ? selectedCompanies.map(code => ({ 
              code, 
              fullName: COMPANY_MAPPING[code as keyof typeof COMPANY_MAPPING]
            }))
          : null
      });
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };
  
  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      // Fetch vendor details for all payments
      const vendorIds = searchedPayments
        .filter(p => p.vendorId)
        .map(p => p.vendorId);
      
      const { data: vendors } = await supabase
        .from('vendors')
        .select('id, account_number, ifsc_code')
        .in('id', vendorIds);

      // Create a map of vendor details for quick lookup
      const vendorDetails = vendors?.reduce((acc, vendor) => {
        acc[vendor.id] = {
          accountNumber: vendor.account_number,
          ifscCode: vendor.ifsc_code
        };
        return acc;
      }, {} as Record<string, { accountNumber: string; ifscCode: string }>) || {};

      // Prepare data for export
      const exportData = searchedPayments.map((payment, index) => {
        // Safely format dates
        const formatDate = (dateString: string) => {
          try {
            const date = new Date(dateString);
            return isNaN(date.getTime()) ? 'N/A' : format(date, 'dd/MM/yyyy');
          } catch (error) {
            return 'N/A';
          }
        };

        // Get vendor details if available
        const vendorInfo = payment.vendorId ? vendorDetails[payment.vendorId] : null;

        return {
          'SR. No.': index + 1,
          'Date': formatDate(payment.date),
          'Vendor Name': payment.vendorName || 'N/A',
          'Account Number': vendorInfo?.accountNumber || 'N/A',
          'IFSC Code': vendorInfo?.ifscCode || 'N/A',
          'Total Outstanding': payment.totalOutstanding || 0,
          'Payment Amount': payment.paymentAmount || 0,
          'Balance Amount': payment.balanceAmount || 0,
          'Item Description': payment.itemDescription || 'N/A',
          'Bill No.': payment.bills?.[0]?.billNumber || 'N/A',
          'Bill Date': payment.bills?.[0]?.billDate ? formatDate(payment.bills[0].billDate) : 'N/A',
          'Requested By': payment.requestedBy?.name || 'N/A',
          'Approved By': payment.approvedBy?.name || 'N/A',
          'Company Name': payment.companyName || 'N/A',
          'Status': payment.status ? payment.status.charAt(0).toUpperCase() + payment.status.slice(1) : 'N/A',
          'Processed Date': payment.status === 'processed' ? formatDate(payment.updatedAt) : 'N/A',
        };
      });
      
      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Payments');
      
      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const fileName = `Payment_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      
      if (Capacitor.isNativePlatform()) {
        // For mobile platforms
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });

        const path = await Filesystem.writeFile({
          path: fileName,
          data: base64Data.split(',')[1],
          directory: Directory.Cache,
        });

        await Share.share({
          title: fileName,
          url: path.uri,
        });
      } else {
        // For web platform
        const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };
  
  // Calculate counts for all statuses
  const statusCounts = useMemo(() => {
    return searchedPayments.reduce((acc, payment) => {
      acc[payment.status] = (acc[payment.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [searchedPayments]);

  // Calculate total amount for filtered payments
  const totalAmount = useMemo(() => {
    return searchedPayments.reduce((sum, p) => sum + (p.paymentAmount || 0), 0);
  }, [searchedPayments]);

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
                  onChange={(e) => handleDateChange('startDate', e.target.value)}
                  leftIcon={<Calendar className="h-5 w-5 text-gray-400" />}
                  max={dateRange.endDate}
                  fullWidth
                />
                <Input
                  type="date"
                  label="End Date"
                  value={dateRange.endDate}
                  onChange={(e) => handleDateChange('endDate', e.target.value)}
                  leftIcon={<Calendar className="h-5 w-5 text-gray-400" />}
                  min={dateRange.startDate}
                  max={today}
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

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Company Filter</label>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleCompanyToggle('all')}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    selectedCompanies.length === 0
                      ? 'bg-primary-100 text-primary-800'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  All Companies
                </button>
                {COMPANY_OPTIONS.map(companyOption => (
                  <button
                    key={companyOption}
                    onClick={() => handleCompanyToggle(companyOption)}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedCompanies.includes(companyOption)
                        ? 'bg-primary-100 text-primary-800'
                        : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {companyOption} - {COMPANY_MAPPING[companyOption as keyof typeof COMPANY_MAPPING]}
                  </button>
                ))}
              </div>
              {selectedCompanies.length > 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  Selected companies: {selectedCompanies.length}
                  <br />
                  {selectedCompanies.map(code => 
                    `${code} - ${COMPANY_MAPPING[code as keyof typeof COMPANY_MAPPING]}`
                  ).join(', ')}
                </p>
              )}
            </div>

            <div className="flex gap-4">
              <Button
                onClick={handleSearch}
                icon={isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Filter className="h-5 w-5" />}
                disabled={isSearching || storeLoading}
              >
                {isSearching ? 'Filtering...' : 'Filter'}
              </Button>

              <Button
                onClick={exportToExcel}
                icon={isExporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                disabled={searchedPayments.length === 0 || isExporting}
                variant="primary"
              >
                {isExporting ? 'Exporting...' : 'Export to Excel'}
              </Button>
            </div>
              
            {exportSuccess && (
              <div className="mt-4 flex items-center text-success-600">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span>Export successful!</span>
              </div>
            )}
          </div>
        </Card>
        
        <Card>
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Export Preview</h2>
            <Filter className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="text-center py-4">
            <FileSpreadsheet className="h-12 w-12 text-primary-600 mx-auto" />
          </div>
          
          <p className="text-xl font-medium text-gray-900 mb-1">
            {searchedPayments.length} Payments
          </p>
          
          <p className="text-sm text-gray-500 mb-4">
            From {format(new Date(dateRange.startDate), 'dd MMM yyyy')} to {format(new Date(dateRange.endDate), 'dd MMM yyyy')}
          </p>
          
          <div className="space-y-2">
            {['pending', 'approved', 'rejected', 'processed', 'query_raised'].map(statusType => (
              <div key={statusType} className="flex justify-between text-sm">
                <span className="text-gray-500">
                  {statusType.charAt(0).toUpperCase() + statusType.slice(1).replace('_', ' ')}:
                </span>
                <span className="font-medium">
                  {statusCounts[statusType] || 0}
                </span>
              </div>
            ))}
            
            <div className="flex justify-between text-sm pt-2 border-t">
              <span className="text-gray-500">Total Amount:</span>
              <span className="font-medium">
                {totalAmount.toLocaleString('en-IN', { 
                  style: 'currency', 
                  currency: 'INR',
                  maximumFractionDigits: 0,
                })}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ExportPage;