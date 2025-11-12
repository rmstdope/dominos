import { useEffect, useState } from 'react';
import { Table, Badge, Switch, Text, Callout } from '@radix-ui/themes';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';

interface User {
  id: number;
  username: string;
  email: string;
  isAdmin: boolean;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:3000/api/admin/users', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load users');
      }

      const data = await response.json();
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleAdminStatus(userId: number, currentStatus: boolean) {
    try {
      setUpdateError(null);
      
      const response = await fetch(`http://localhost:3000/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ isAdmin: !currentStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update user');
      }

      // Update local state
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, isAdmin: !currentStatus }
          : user
      ));
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : 'Failed to update user');
    }
  }

  if (isLoading) {
    return <Text>Loading users...</Text>;
  }

  if (error) {
    return (
      <Callout.Root color="red">
        <Callout.Icon>
          <ExclamationTriangleIcon />
        </Callout.Icon>
        <Callout.Text>{error}</Callout.Text>
      </Callout.Root>
    );
  }

  return (
    <div>
      <Text size="6" weight="bold" mb="4">
        Users Management
      </Text>

      {updateError && (
        <Callout.Root color="red" mb="4">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>{updateError}</Callout.Text>
        </Callout.Root>
      )}

      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Username</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Email</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Role</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Admin Access</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {users.map((user) => (
            <Table.Row key={user.id}>
              <Table.Cell>
                <Text weight="medium">{user.username}</Text>
              </Table.Cell>
              <Table.Cell>{user.email}</Table.Cell>
              <Table.Cell>
                {user.isAdmin && (
                  <Badge color="blue" variant="soft">
                    Admin
                  </Badge>
                )}
              </Table.Cell>
              <Table.Cell>
                <Switch
                  checked={user.isAdmin}
                  onCheckedChange={() => toggleAdminStatus(user.id, user.isAdmin)}
                />
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </div>
  );
}
