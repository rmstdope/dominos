import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Pizza, 
  Calendar, 
  TrendingUp, 
  AlertCircle, 
  Loader2,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalAdmins: number;
  totalIngredients: number;
  totalEvents: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  async function fetchDashboardStats() {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch users
      const usersResponse = await fetch('http://localhost:3000/api/admin/users', {
        credentials: 'include',
      });

      // Fetch ingredients
      const ingredientsResponse = await fetch('http://localhost:3000/api/admin/ingredients', {
        credentials: 'include',
      });

      if (!usersResponse.ok || !ingredientsResponse.ok) {
        throw new Error('Failed to load dashboard data');
      }

      const usersData = await usersResponse.json();
      const ingredientsData = await ingredientsResponse.json();

      const admins = usersData.users.filter((user: { isAdmin: boolean }) => user.isAdmin);

      setStats({
        totalUsers: usersData.users.length,
        totalAdmins: admins.length,
        totalIngredients: ingredientsData.ingredients.length,
        totalEvents: 0, // TODO: Will be implemented when events API is ready
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground mt-2">
            Loading dashboard overview...
          </p>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading statistics...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground mt-2">
            Welcome to the Pizza Admin Dashboard
          </p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      description: `${stats?.totalAdmins || 0} administrators`,
      icon: Users,
      link: '/admin/users',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Ingredients',
      value: stats?.totalIngredients || 0,
      description: 'Available pizza toppings',
      icon: Pizza,
      link: '/admin/ingredients',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: 'Events',
      value: stats?.totalEvents || 0,
      description: 'Coming soon',
      icon: Calendar,
      link: '/admin/events',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'System Status',
      value: 'Active',
      description: 'All systems operational',
      icon: TrendingUp,
      link: '#',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      isText: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground mt-2">
          Welcome to the Pizza Admin Dashboard. Here's an overview of your system.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`rounded-full p-2 ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stat.isText ? stat.value : stat.value.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Management
            </CardTitle>
            <CardDescription>
              Manage user accounts and administrative privileges
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Total Users</p>
                <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Admins</p>
                  <p className="text-lg font-semibold">{stats?.totalAdmins || 0}</p>
                </div>
              </div>
            </div>
            <Link to="/admin/users">
              <Button className="w-full" variant="outline">
                Manage Users
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pizza className="h-5 w-5" />
              Ingredients
            </CardTitle>
            <CardDescription>
              Manage available pizza toppings and ingredients
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium">Available Toppings</p>
              <p className="text-2xl font-bold">{stats?.totalIngredients || 0}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {stats?.totalIngredients === 0 
                  ? 'No ingredients added yet' 
                  : 'ingredients ready to use'}
              </p>
            </div>
            <Link to="/admin/ingredients">
              <Button className="w-full" variant="outline">
                Manage Ingredients
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Events Management
          </CardTitle>
          <CardDescription>
            Coming soon - Manage pizza dinner events and track topping preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">Events Feature Coming Soon</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This feature will allow you to create pizza dinner events, invite users, and collect their topping preferences.
            </p>
            <Link to="/admin/events">
              <Button variant="secondary">
                Learn More
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
