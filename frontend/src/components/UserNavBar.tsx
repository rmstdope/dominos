import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, LogIn, Calendar, Moon, Sun } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '@/components/ui/button';

export function UserNavBar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <header className="border-b sticky top-0 bg-background z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-6">
            <h1 className="text-2xl font-bold">Pizza Orders</h1>
            
            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-4">
              <Link
                to="/events"
                className={`text-sm transition-colors hover:text-primary ${
                  isActive('/events') ? 'font-semibold text-primary' : 'text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Events
                </div>
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
            </Button>

            {/* Authentication Section */}
            {user ? (
              <>
                <span className="text-sm hidden md:inline">{user.username}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </>
            ) : (
              <Link to="/login">
                <Button variant="outline" size="sm">
                  <LogIn className="mr-2 h-4 w-4" />
                  Login
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
