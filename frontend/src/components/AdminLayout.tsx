import { Link, useLocation } from 'react-router-dom';
import { Box, Flex, Button, Container, Text } from '@radix-ui/themes';
import { HomeIcon, PersonIcon, MixIcon, CalendarIcon, ExitIcon } from '@radix-ui/react-icons';
import { useAuth } from '../contexts/AuthContext';
import type { ReactNode } from 'react';

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navigationItems = [
    { path: '/admin', label: 'Dashboard', icon: HomeIcon },
    { path: '/admin/users', label: 'Users', icon: PersonIcon },
    { path: '/admin/ingredients', label: 'Ingredients', icon: MixIcon },
    { path: '/admin/events', label: 'Events', icon: CalendarIcon },
  ];

  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    return paths.map((path, index) => ({
      label: path.charAt(0).toUpperCase() + path.slice(1),
      path: '/' + paths.slice(0, index + 1).join('/'),
    }));
  };

  return (
    <Box style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box
        style={{
          borderBottom: '1px solid var(--gray-5)',
          padding: '1rem 0',
        }}
      >
        <Container>
          <Flex justify="between" align="center">
            <Text size="5" weight="bold">
              Pizza Admin
            </Text>
            <Flex gap="4" align="center">
              <Text size="2">{user?.username}</Text>
              <Button
                variant="soft"
                color="red"
                onClick={logout}
                style={{ cursor: 'pointer' }}
              >
                <ExitIcon />
                Logout
              </Button>
            </Flex>
          </Flex>
        </Container>
      </Box>

      {/* Main Content Area */}
      <Flex style={{ flex: 1 }}>
        {/* Sidebar Navigation */}
        <Box
          asChild
          style={{
            width: '240px',
            borderRight: '1px solid var(--gray-5)',
            padding: '1.5rem 0',
          }}
        >
          <nav>
            <Flex direction="column" gap="2" px="4">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    style={{
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <Button
                      variant={isActive ? 'solid' : 'ghost'}
                      style={{
                        width: '100%',
                        justifyContent: 'flex-start',
                        cursor: 'pointer',
                      }}
                    >
                      <Icon />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </Flex>
          </nav>
        </Box>

        {/* Main Content */}
        <Box style={{ flex: 1 }}>
          <Container>
            {/* Breadcrumbs */}
            <Box py="4">
              <Flex gap="2" align="center">
                {getBreadcrumbs().map((crumb, index) => (
                  <Flex key={crumb.path} gap="2" align="center">
                    {index > 0 && <Text color="gray">/</Text>}
                    <Text size="2" color={index === getBreadcrumbs().length - 1 ? undefined : 'gray'}>
                      {crumb.label}
                    </Text>
                  </Flex>
                ))}
              </Flex>
            </Box>

            {/* Page Content */}
            <Box py="4">{children}</Box>
          </Container>
        </Box>
      </Flex>
    </Box>
  );
}
