import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { LogOut, Pizza, Settings } from 'lucide-react';

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Pizza className="h-8 w-8 text-red-600 mr-3" />
            <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {user?.is_admin && (
              <Link
                to={location.pathname === '/admin' ? '/dashboard' : '/admin'}
                className="flex items-center text-sm text-gray-600 hover:text-gray-900"
              >
                <Settings className="h-4 w-4 mr-1" />
                {location.pathname === '/admin' ? 'User View' : 'Admin Panel'}
              </Link>
            )}
            <span className="text-sm text-gray-600">
              Welcome, {user?.username}
              {user?.is_admin && <span className=" ml-1 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Admin</span>}
            </span>
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;