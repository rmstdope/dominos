import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import type { PizzaDinner, Ingredient } from '../types';
import api from '../lib/api';
import { Plus, Calendar, ChefHat, Edit, Trash2 } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [pizzaDinners, setPizzaDinners] = useState<PizzaDinner[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pizza dinner form state
  const [showPizzaDinnerForm, setShowPizzaDinnerForm] = useState(false);
  const [pizzaDinnerForm, setPizzaDinnerForm] = useState({
    title: '',
    description: '',
    scheduled_date: ''
  });
  
  // Ingredient form state
  const [showIngredientForm, setShowIngredientForm] = useState(false);
  const [ingredientForm, setIngredientForm] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [pizzaDinnersData, ingredientsData] = await Promise.all([
        api.getPizzaDinners(),
        api.getIngredients()
      ]);
      
      setPizzaDinners(pizzaDinnersData);
      setIngredients(ingredientsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePizzaDinner = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createPizzaDinner(pizzaDinnerForm);
      setPizzaDinnerForm({ title: '', description: '', scheduled_date: '' });
      setShowPizzaDinnerForm(false);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create pizza dinner');
    }
  };

  const handleCreateIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createIngredient(ingredientForm);
      setIngredientForm({ name: '', description: '' });
      setShowIngredientForm(false);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create ingredient');
    }
  };

  const handleDeletePizzaDinner = async (id: number) => {
    if (confirm('Are you sure you want to delete this pizza dinner?')) {
      try {
        await api.deletePizzaDinner(id);
        loadData();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete pizza dinner');
      }
    }
  };

  const handleDeleteIngredient = async (id: number) => {
    if (confirm('Are you sure you want to delete this ingredient?')) {
      try {
        await api.deleteIngredient(id);
        loadData();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete ingredient');
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Admin Dashboard" />
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Admin Dashboard" />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Navigation */}
          <div className="mb-6">
            <Link
              to="/dashboard"
              className="text-blue-600 hover:text-blue-500 text-sm"
            >
              ← Back to User Dashboard
            </Link>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pizza Dinners Management */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <Calendar className="h-5 w-5 mr-2" />
                      Pizza Dinners
                    </CardTitle>
                    <CardDescription>
                      Manage scheduled pizza dinners
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowPizzaDinnerForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Dinner
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {showPizzaDinnerForm && (
                  <form onSubmit={handleCreatePizzaDinner} className="mb-4 p-4 border rounded-lg bg-gray-50">
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="dinner-title">Title</Label>
                        <Input
                          id="dinner-title"
                          value={pizzaDinnerForm.title}
                          onChange={(e) => setPizzaDinnerForm(prev => ({ ...prev, title: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="dinner-description">Description</Label>
                        <Input
                          id="dinner-description"
                          value={pizzaDinnerForm.description}
                          onChange={(e) => setPizzaDinnerForm(prev => ({ ...prev, description: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="dinner-date">Scheduled Date & Time</Label>
                        <Input
                          id="dinner-date"
                          type="datetime-local"
                          value={pizzaDinnerForm.scheduled_date}
                          onChange={(e) => setPizzaDinnerForm(prev => ({ ...prev, scheduled_date: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button type="submit" size="sm">Create</Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setShowPizzaDinnerForm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </form>
                )}

                <div className="space-y-3">
                  {pizzaDinners.length === 0 ? (
                    <p className="text-gray-500">No pizza dinners scheduled</p>
                  ) : (
                    pizzaDinners.map(dinner => (
                      <div key={dinner.id} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium">{dinner.title}</h3>
                            <p className="text-sm text-gray-600">{dinner.description}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatDate(dinner.scheduled_date)}
                            </p>
                          </div>
                          <div className="flex space-x-1">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeletePizzaDinner(dinner.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Ingredients Management */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <ChefHat className="h-5 w-5 mr-2" />
                      Ingredients
                    </CardTitle>
                    <CardDescription>
                      Manage available pizza toppings
                    </CardDescription>
                  </div>
                  <Button onClick={() => setShowIngredientForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Ingredient
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {showIngredientForm && (
                  <form onSubmit={handleCreateIngredient} className="mb-4 p-4 border rounded-lg bg-gray-50">
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="ingredient-name">Name</Label>
                        <Input
                          id="ingredient-name"
                          value={ingredientForm.name}
                          onChange={(e) => setIngredientForm(prev => ({ ...prev, name: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="ingredient-description">Description</Label>
                        <Input
                          id="ingredient-description"
                          value={ingredientForm.description}
                          onChange={(e) => setIngredientForm(prev => ({ ...prev, description: e.target.value }))}
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button type="submit" size="sm">Create</Button>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setShowIngredientForm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </form>
                )}

                <div className="space-y-3">
                  {ingredients.length === 0 ? (
                    <p className="text-gray-500">No ingredients available</p>
                  ) : (
                    ingredients.map(ingredient => (
                      <div key={ingredient.id} className="p-3 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium">{ingredient.name}</h3>
                            <p className="text-sm text-gray-600">{ingredient.description}</p>
                          </div>
                          <div className="flex space-x-1">
                            <Button variant="ghost" size="sm">
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDeleteIngredient(ingredient.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;