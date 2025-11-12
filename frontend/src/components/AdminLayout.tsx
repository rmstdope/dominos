import { Link, useLocation } from 'react-router-dom';
import { Home, Users, Pizza, Calendar, LogOut, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navigationItems = [
    { path: '/admin', label: 'Dashboard', icon: Home },
    { path: '/admin/users', label: 'Users', icon: Users },
    { path: '/admin/ingredients', label: 'Ingredients', icon: Pizza },
    { path: '/admin/events', label: 'Events', icon: Calendar },
  ];

  const getIconForPath = (path: string) => {
    const item = navigationItems.find(item => item.path === path);
    return item?.icon || Home;
  };

  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    return paths.map((path, index) => {
      const fullPath = '/' + paths.slice(0, index + 1).join('/');
      return {
        label: path.charAt(0).toUpperCase() + path.slice(1),
        path: fullPath,
        icon: getIconForPath(fullPath),
      };
    });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Pizza Admin</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm">{user?.username}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={logout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1">
        {/* Sidebar Navigation */}
        <nav className="w-60 border-r bg-muted/40">
          <div className="flex flex-col gap-2 p-4">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="no-underline"
                >
                  <Button
                    variant={isActive ? 'default' : 'ghost'}
                    className="w-full justify-start"
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1">
          <div className="container mx-auto p-6">
            {/* Breadcrumbs */}
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex items-center gap-2">
                {getBreadcrumbs().map((crumb, index) => {
                  const Icon = crumb.icon;
                  const isLast = index === getBreadcrumbs().length - 1;
                  
                  return (
                    <li key={crumb.path} className="flex items-center gap-2">
                      {index > 0 && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      {isLast ? (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10">
                          <Icon className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium text-primary">
                            {crumb.label}
                          </span>
                        </div>
                      ) : (
                        <Link
                          to={crumb.path}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-muted transition-colors"
                        >
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                            {crumb.label}
                          </span>
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ol>
            </nav>

            {/* Page Content */}
            <div>{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
