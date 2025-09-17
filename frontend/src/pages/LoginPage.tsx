import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Pizza, Eye, EyeOff, Mail, User, Lock } from 'lucide-react';

const LoginPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(username, password);
      } else {
        await register(username, email, password);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-gradient-to-br from-red-200/30 to-orange-200/30 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-gradient-to-tr from-orange-200/30 to-yellow-200/30 blur-3xl"></div>
      </div>
      
      <div className="w-96 space-y-8 relative z-10">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-gradient-to-r from-red-500 to-orange-500 rounded-full blur-lg opacity-30 scale-110 animate-pulse"></div>
            <div className="relative bg-gradient-to-r from-red-600 to-orange-600 p-4 rounded-full shadow-xl">
              <Pizza className="h-12 w-12 text-white" />
            </div>
          </div>
          <h2 className="text-4xl font-bold bg-gradient-to-r from-red-600 via-orange-600 to-yellow-600 bg-clip-text text-transparent">
            Domino's Pizza Toppings
          </h2>
          <p className="text-gray-600 font-medium">
            {isLogin ? 'Welcome back! Sign in to continue' : 'Join us today and get started'}
          </p>
        </div>
        
        {/* Main Card */}
        <Card className="backdrop-blur-sm bg-blue-500 border-0 shadow-2xl ring-1 ring-gray-200/50 !rounded-3xl mx-4 my-6">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold text-gray-900">
              {isLogin ? 'Sign In' : 'Sign Up'}
            </CardTitle>
            <CardDescription className="text-gray-600">
              {isLogin 
                ? 'Enter your credentials to access your dashboard' 
                : 'Fill in your details to create your account'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username Field */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <User className="text-gray-500" style={{ width: '12px', height: '12px' }} />
                  Username
                </Label>
                <div className="relative">
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="Enter your username"
                    className="pl-10 h-12 border-gray-200 focus:border-red-500 focus:ring-red-500 rounded-2xl transition-all duration-200"
                  />
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" style={{ width: '14px', height: '14px' }} />
                </div>
              </div>
              
              {/* Email Field (Sign Up only) */}
              {!isLogin && (
                <div className="space-y-2 animate-in slide-in-from-top duration-300">
                  <Label htmlFor="email" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Mail className="text-gray-500" style={{ width: '12px', height: '12px' }} />
                    Email
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="Enter your email address"
                      className="pl-10 h-12 border-gray-200 focus:border-red-500 focus:ring-red-500 rounded-2xl transition-all duration-200"
                    />
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" style={{ width: '14px', height: '14px' }} />
                  </div>
                </div>
              )}
              
              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Lock className="text-gray-500" style={{ width: '12px', height: '12px' }} />
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                    className="pl-10 pr-12 h-12 border-gray-200 focus:border-red-500 focus:ring-red-500 rounded-2xl transition-all duration-200"
                  />
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" style={{ width: '14px', height: '14px' }} />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff style={{ width: '14px', height: '14px' }} /> : <Eye style={{ width: '14px', height: '14px' }} />}
                  </button>
                </div>
              </div>
              
              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-2xl animate-in slide-in-from-top duration-300">
                  <p className="text-red-600 text-sm font-medium">{error}</p>
                </div>
              )}
              
              {/* Submit Button */}
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02] disabled:transform-none disabled:opacity-50"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Loading...
                  </div>
                ) : (
                  isLogin ? 'Sign In' : 'Sign Up'
                )}
              </Button>
            </form>
            
            {/* Toggle Login/Register */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500">or</span>
              </div>
            </div>
            
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="w-full text-center text-sm font-medium text-gray-600 hover:text-red-600 transition-colors duration-200 py-2"
            >
              {isLogin 
                ? "Don't have an account? Sign up here" 
                : 'Already have an account? Sign in here'
              }
            </button>
            
            {/* Demo Account Info */}
            {isLogin && (
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl">
                <div>
                  <h4 className="text-sm font-semibold text-blue-900 mb-1 flex items-center gap-2">
                    <div className="bg-blue-100 rounded-full flex items-center justify-center" style={{ width: '36px', height: '36px' }}>
                      <User className="text-blue-600" style={{ width: '18px', height: '18px' }} />
                    </div>
                    Demo Account
                  </h4>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    <span className="font-medium">Username:</span> admin<br />
                    <span className="font-medium">Password:</span> admin123
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;