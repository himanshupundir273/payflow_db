import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { UserRole } from '../../types';
import {
  LogOut,
  Menu,
  X,
  Wallet,
  BarChart3,
  FileText,
  Lock,
  LayoutDashboard,
  Download,
} from 'lucide-react';
import Button from '../ui/Button';
import ChangePasswordDialog from '../auth/ChangePasswordDialog';

const roleNames: Record<UserRole, string> = {
  user: 'Employee',
  admin: 'Admin',
  accounts: 'Accounts',
};

const Navbar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsProfileOpen(false);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleProfile = () => {
    setIsProfileOpen(!isProfileOpen);
  };

  const handleChangePasswordClick = () => {
    setIsProfileOpen(false);
    setIsChangePasswordOpen(true);
  };

  return (
    <>
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Wallet className="h-8 w-8 text-primary-600" />
                <Link to="/dashboard">
                  <span className="ml-2 text-xl font-bold text-primary-900">
                    PayFlow
                  </span>
                </Link>
              </div>

              {/* Desktop menu */}
              {user && (
                <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
                  <Link
                    to="/dashboard"
                    className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-md"
                  >
                    Dashboard
                  </Link>

                  {user.role === 'accounts' && (
                    <Link
                      to="/export"
                      className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-md"
                    >
                      Export
                    </Link>
                  )}

                  {user.role !== 'user' && (
                    <Link
                      to="/cms"
                      className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-md"
                    >
                      CMS
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Right side */}
            <div className="flex items-center">
              {user ? (
                <div className="hidden sm:flex sm:items-center">
                  <div className="relative" ref={profileRef}>
                    <button
                      onClick={toggleProfile}
                      className="flex items-center max-w-xs rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="ml-2 font-medium text-gray-700">
                        {user.name}
                      </span>
                      <span className="ml-1 text-xs bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full">
                        {roleNames[user.role]}
                      </span>
                    </button>

                    {isProfileOpen && (
                      <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 z-10">
                        <button
                          onClick={handleChangePasswordClick}
                          className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 flex items-center"
                        >
                          <Lock className="h-4 w-4 mr-2" />
                          Change Password
                        </button>
                        <button
                          onClick={handleLogout}
                          className="w-full px-4 py-2 text-sm text-left text-gray-700 hover:bg-gray-100 flex items-center"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Sign out
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="hidden sm:flex items-center space-x-2">
                  {location.pathname !== '/download-app' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/download-app')}
                      icon={<Download className="h-4 w-4" />}
                    >
                      Download App
                    </Button>
                  )}
                  {location.pathname !== '/login' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/login')}
                    >
                      Login
                    </Button>
                  )}
                </div>
              )}

              {/* Mobile menu button */}
              <div className="flex items-center sm:hidden">
                <button
                  onClick={toggleMenu}
                  className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500"
                >
                  <span className="sr-only">Open main menu</span>
                  {isMenuOpen ? (
                    <X className="block h-6 w-6" />
                  ) : (
                    <Menu className="block h-6 w-6" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="sm:hidden bg-white border-b border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {user ? (
              <>
                <div className="px-4 py-2 flex items-center">
                  <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-700">
                      {user.name}
                    </div>
                    <div className="text-xs text-gray-500">{roleNames[user.role]}</div>
                  </div>
                </div>
                <Link
                  to="/dashboard"
                  className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-md"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
                {user.role === 'accounts' && (
                  <Link
                    to="/export"
                    className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-md"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Export
                  </Link>
                )}
                {user.role !== 'user' && (
                  <Link
                    to="/cms"
                    className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-md"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    CMS
                  </Link>
                )}
                <button
                  onClick={handleChangePasswordClick}
                  className="block w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-md"
                >
                  Change Password
                </button>
                <button
                  onClick={handleLogout}
                  className="block w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-md"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                {location.pathname !== '/download-app' && (
                  <button
                    onClick={() => {
                      navigate('/download-app');
                      setIsMenuOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-md"
                  >
                    Download App
                  </button>
                )}
                {location.pathname !== '/login' && (
                  <button
                    onClick={() => {
                      navigate('/login');
                      setIsMenuOpen(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-md"
                  >
                    Login
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <ChangePasswordDialog
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </>
  );
};

export default Navbar;
