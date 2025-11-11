import { useState, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, TextField, Button, Text, Callout, Flex, Box } from '@radix-ui/themes';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    username?: string;
    password?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  function handleInputChange(field: 'username' | 'password', value: string) {
    if (field === 'username') {
      setUsername(value);
    } else {
      setPassword(value);
    }
    
    // Clear errors when user starts typing
    setError(null);
    setValidationErrors({});
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    
    // Validation
    const errors: { username?: string; password?: string } = {};
    
    if (!username.trim()) {
      errors.username = 'Username is required';
    }
    
    if (!password) {
      errors.password = 'Password is required';
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    // Attempt login
    try {
      setIsLoading(true);
      setError(null);
      setValidationErrors({});
      
      // Make the login request directly to get status code
      const response = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        // Handle different HTTP status codes
        if (response.status === 401) {
          setError('Invalid username or password');
        } else {
          setError('An error occurred. Please try again.');
        }
        return;
      }

      // If successful, call the login function to update auth state
      await login(username, password);
      
      // Redirect to admin dashboard on success
      navigate('/admin');
    } catch (_err) {
      // Handle network errors or other exceptions
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Box
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--gray-2)',
      }}
    >
      <Card size="4" style={{ width: '100%', maxWidth: '400px' }}>
        <Flex direction="column" gap="4">
          <Text size="6" weight="bold" align="center">
            Sign In
          </Text>
          
          {error && (
            <Callout.Root color="red">
              <Callout.Icon>
                <ExclamationTriangleIcon />
              </Callout.Icon>
              <Callout.Text>{error}</Callout.Text>
            </Callout.Root>
          )}
          
          <form onSubmit={handleSubmit}>
            <Flex direction="column" gap="4">
              <div>
                <Text as="label" size="2" weight="bold" mb="1" htmlFor="username">
                  Username
                </Text>
                <TextField.Root
                  id="username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    handleInputChange('username', e.target.value)
                  }
                  disabled={isLoading}
                />
                {validationErrors.username && (
                  <Text size="1" color="red" mt="1">
                    {validationErrors.username}
                  </Text>
                )}
              </div>
              
              <div>
                <Text as="label" size="2" weight="bold" mb="1" htmlFor="password">
                  Password
                </Text>
                <TextField.Root
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    handleInputChange('password', e.target.value)
                  }
                  disabled={isLoading}
                />
                {validationErrors.password && (
                  <Text size="1" color="red" mt="1">
                    {validationErrors.password}
                  </Text>
                )}
              </div>
              
              <Button type="submit" size="3" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </Flex>
          </form>
        </Flex>
      </Card>
    </Box>
  );
}
