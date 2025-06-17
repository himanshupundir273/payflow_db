import  { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/ui/Card';
import { Users, Tags, Layers, Store, RefreshCw, Building2, MapPin } from 'lucide-react';
import { useCMSStore } from '../../store/cmsStore';

const Home = () => {
  const navigate = useNavigate();
  const { stats, isLoading, error, fetchStats } = useCMSStore();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const cards = [
    {
      title: 'Vendors',
      icon: Store,
      count: stats?.vendors ?? 0,
      description: 'Manage vendor information and details',
      path: '/cms/vendors',
      color: 'bg-orange-50 text-orange-600',
    },
    {
      title: 'Categories',
      icon: Tags,
      count: stats?.categories ?? 0,
      description: 'Manage categories for payment request form',
      path: '/cms/categories',
      color: 'bg-green-50 text-green-600',
    },
    {
      title: 'Subcategories',
      icon: Layers,
      count: stats?.subcategories ?? 0,
      description: 'Manage sub-categories for payment request form',
      path: '/cms/subcategories',
      color: 'bg-purple-50 text-purple-600',
    },
    {
      title: 'Users',
      icon: Users,
      count: stats?.users ?? 0,
      description: 'Manage user accounts and permissions',
      path: '/cms/users',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Companies',
      icon: Building2,
      count: stats?.companies ?? 0,
      description: 'Manage companies information and details',
      path: '/cms/companies',
      color: 'bg-orange-50 text-orange-600',
    },
    {
      title: 'Branches',
      icon: MapPin,
      count: stats?.branches ?? 0,
      description: 'Manage branch locations and details',
      path: '/cms/branches',
      color: 'bg-indigo-50 text-indigo-600',
    },
  ];

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
          <p className="font-medium">Error loading statistics</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Content Management</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your content, users, and vendors from one place
            </p>
          </div>
          <button
            onClick={() => fetchStats()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map((card) => (
            <Card
              key={card.title}
              className="overflow-hidden hover:shadow-lg transition-all duration-200"
              onClick={() => navigate(card.path)}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{card.title}</h3>
                  <div className={`p-2 rounded-lg ${card.color}`}>
                    <card.icon className="w-6 h-6" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {isLoading ? (
                    <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
                  ) : (
                    card.count
                  )}
                </div>
                <p className="text-sm text-gray-500">{card.description}</p>
              </div>
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-100">
                <p className="text-sm text-gray-600">Click to manage</p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home; 