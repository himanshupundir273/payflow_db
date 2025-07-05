import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useScheduledPaymentsStore, DashboardStats } from '../../store/scheduledPaymentsStore';
import Card from '../ui/Card';
import Button from '../ui/Button';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  ArrowRight,
  RefreshCw,
  TrendingUp,
  Activity,
  Zap,
  Repeat,
  IndianRupee,
} from 'lucide-react';

const ScheduledPaymentsDashboard: React.FC = () => {
  const { user } = useAuthStore();
  const { fetchDashboardStats, dashboardStats, isLoading } = useScheduledPaymentsStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    pending: 0,
    processed: 0,
    cancelled: 0,
    totalAmount: 0,
    pendingAmount: 0,
    processedAmount: 0,
    recurringCount: 0,
    upcomingToday: 0,
    upcomingThisWeek: 0,
    executedToday: 0,
    executedThisWeek: 0,
  });

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const dashboardData = await fetchDashboardStats();
        setStats(dashboardData);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      }
    };

    loadDashboardData();
  }, [fetchDashboardStats]);

  useEffect(() => {
    if (dashboardStats) {
      setStats(dashboardStats);
    }
  }, [dashboardStats]);

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    gradient: string;
    onClick?: () => void;
  }> = ({ title, value, icon, gradient, onClick }) => (
    <Card 
      className={`cursor-pointer transition-all duration-300 hover:shadow-xl hover:scale-105 transform ${
        onClick ? 'hover:shadow-lg' : ''
      } overflow-hidden relative group`}
      onClick={onClick}
    >
      <div className={`absolute inset-0 ${gradient} opacity-10 group-hover:opacity-20 transition-opacity duration-300`}></div>
      <div className="relative p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
            <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
          </div>
          <div className={`p-4 rounded-xl ${gradient} shadow-lg`}>
            {icon}
          </div>
        </div>
      </div>
    </Card>
  );

  const InsightCard: React.FC<{
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    borderColor: string;
    bgColor: string;
    iconBg: string;
    iconColor: string;
  }> = ({ title, icon, children, borderColor, bgColor, iconBg, iconColor }) => (
    <Card className={`border-l-4 ${borderColor} transition-all transform group overflow-hidden relative min-h-[200px] sm:min-h-[224px]`}>
      <div className={`absolute inset-0 ${bgColor} opacity-5 group-hover:opacity-10 transition-opacity duration-300`}></div>
      <div className="relative p-3 sm:p-4 h-full flex flex-col">
        <div className="flex items-center mb-3 sm:mb-4">
          <div className={`p-1 sm:p-2 rounded-xl shadow-md mr-3 sm:mr-4 flex-shrink-0 ${iconBg} group-hover:scale-110 transition-transform duration-300`}>
            <div className={`${iconColor} w-4 h-4 sm:w-5 sm:h-5`}>{icon}</div>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">{title}</h3>
        </div>
        <div className="flex-1 flex items-center mt-2">
          {children}
        </div>
      </div>
    </Card>
  );

  const handleRefresh = async () => {
    try {
      const dashboardData = await fetchDashboardStats();
      setStats(dashboardData);
    } catch (error) {
      console.error('Error refreshing dashboard data:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-medium text-gray-900 mb-2">Loading Dashboard...</h2>
          <p className="text-gray-500">Please wait while we fetch your scheduled payments data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header with gradient background */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 p-8 mb-8 text-white">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Scheduled Payments Dashboard</h1>
              <p className="text-blue-100 text-lg">
                Manage and monitor your scheduled payment activities with real-time insights
              </p>
            </div>
            <div className="flex items-center space-x-3 mt-4 md:mt-0">
              <Button
                variant="outline"
                onClick={handleRefresh}
                icon={<RefreshCw className="h-5 w-5" />}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                Refresh
              </Button>
              {user?.role === 'user' && (
                <Button
                  variant="outline"
                  onClick={() => navigate('/scheduled-payments/new')}
                  icon={<Plus className="h-5 w-5" />}
                  className="bg-white text-blue-600 hover:bg-gray-50"
                >
                  Schedule New Payment
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      
      {/* Insights Grid */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <InsightCard
            title="Upcoming Payments"
            icon={<Calendar className="h-5 w-5" />}
            borderColor="border-blue-500"
            bgColor="bg-blue-500"
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full">
              <div 
                className="flex flex-col items-center p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl cursor-pointer hover:shadow-md transition-all duration-300 hover:scale-105"
                onClick={() => navigate('/scheduled-payments?upcoming=today&view=table')}
              >
                <span className="text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2 text-center"> Today</span>
                <span className="text-2xl sm:text-3xl font-bold text-blue-600">{stats.upcomingToday}</span>
              </div>
              <div 
                className="flex flex-col items-center p-3 sm:p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl cursor-pointer hover:shadow-md transition-all duration-300 hover:scale-105"
                onClick={() => navigate('/scheduled-payments?upcoming=week&view=table')}
              >
                <span className="text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2 text-center">This week</span>
                <span className="text-2xl sm:text-3xl font-bold text-green-600">{stats.upcomingThisWeek}</span>
              </div>
            </div>
          </InsightCard>

          <InsightCard
            title="Executed Payments"
            icon={<CheckCircle2 className="h-5 w-5" />}
            borderColor="border-green-500"
            bgColor="bg-green-500"
            iconBg="bg-green-50"
            iconColor="text-green-600"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full">
              <div 
                className="flex flex-col items-center p-3 sm:p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl cursor-pointer hover:shadow-md transition-all duration-300 hover:scale-105"
                onClick={() => navigate('/scheduled-payments?status=processed&executed=today&view=table')}
              >
                <span className="text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2 text-center">Today</span>
                <span className="text-2xl sm:text-3xl font-bold text-green-600">{stats.executedToday}</span>
              </div>
              <div 
                className="flex flex-col items-center p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl cursor-pointer hover:shadow-md transition-all duration-300 hover:scale-105"
                onClick={() => navigate('/scheduled-payments?status=processed&executed=week&view=table')}
              >
                <span className="text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2 text-center">This week</span>
                <span className="text-2xl sm:text-3xl font-bold text-blue-600">{stats.executedThisWeek}</span>
              </div>
            </div>
          </InsightCard>

          <InsightCard
            title="Payment Types"
            icon={<IndianRupee className="h-5 w-5" />}
            borderColor="border-purple-500"
            bgColor="bg-purple-500"
            iconBg="bg-purple-50"
            iconColor="text-purple-600"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full">
              <div 
                className="flex flex-col items-center p-3 sm:p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl cursor-pointer hover:shadow-md transition-all duration-300 hover:scale-105"
                onClick={() => navigate('/scheduled-payments?recurring=false&view=table')}
              >
                <span className="text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2 text-center">One-time</span>
                <span className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.total - stats.recurringCount}</span>
              </div>
              <div 
                className="flex flex-col items-center p-3 sm:p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl cursor-pointer hover:shadow-md transition-all duration-300 hover:scale-105"
                onClick={() => navigate('/scheduled-payments?recurring=true&view=table')}
              >
                <span className="text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2 text-center">Recurring</span>
                <span className="text-2xl sm:text-3xl font-bold text-purple-600">{stats.recurringCount}</span>
              </div>
            </div>
          </InsightCard>
        </div>
      </div>

      {/* Statistics Cards - Full Width */}
      <div className="mb-8">
        <div className="flex items-center mb-6">
          <div className="p-2 bg-blue-50 rounded-lg mr-3">
            <Activity className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Payment Overview</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Scheduled"
            value={stats.total}
            icon={<Calendar className="h-6 w-6 text-white" />}
            gradient="bg-gradient-to-br from-blue-500 to-blue-600"
            onClick={() => navigate('/scheduled-payments?view=table')}
          />
          <StatCard
            title="Pending"
            value={stats.pending}
            icon={<Clock className="h-6 w-6 text-white" />}
            gradient="bg-gradient-to-br from-yellow-500 to-orange-500"
            onClick={() => navigate('/scheduled-payments?status=pending&view=table')}
          />
          <StatCard
            title="Processed"
            value={stats.processed}
            icon={<CheckCircle2 className="h-6 w-6 text-white" />}
            gradient="bg-gradient-to-br from-green-500 to-emerald-600"
            onClick={() => navigate('/scheduled-payments?status=processed&view=table')}
          />
          <StatCard
            title="Cancelled"
            value={stats.cancelled}
            icon={<XCircle className="h-6 w-6 text-white" />}
            gradient="bg-gradient-to-br from-red-500 to-pink-500"
            onClick={() => navigate('/scheduled-payments?status=cancelled&view=table')}
          />
        </div>
      </div>


    
    </div>
  );
};

export default ScheduledPaymentsDashboard; 