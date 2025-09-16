import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import type { PizzaDinner, Ingredient, UserSelection } from '../types';
import api from '../lib/api';
import { Calendar, Clock } from 'lucide-react';

const UserDashboard: React.FC = () => {
  const [pizzaDinners, setPizzaDinners] = useState<PizzaDinner[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedDinner, setSelectedDinner] = useState<PizzaDinner | null>(null);
  const [userSelections, setUserSelections] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedDinner) {
      loadUserSelections(selectedDinner.id);
    }
  }, [selectedDinner]);

  const loadData = async () => {
    try {
      const [pizzaDinnersData, ingredientsData] = await Promise.all([
        api.getPizzaDinners(),
        api.getIngredients()
      ]);
      
      setPizzaDinners(pizzaDinnersData);
      setIngredients(ingredientsData);
      
      // Auto-select the first active pizza dinner
      if (pizzaDinnersData.length > 0) {
        setSelectedDinner(pizzaDinnersData[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadUserSelections = async (pizzaDinnerId: number) => {
    try {
      const selections: UserSelection[] = await api.getUserSelections(pizzaDinnerId);
      setUserSelections(selections.map(s => s.ingredient_id));
    } catch (err) {
      console.error('Failed to load user selections:', err);
    }
  };

  const handleIngredientToggle = (ingredientId: number) => {
    setUserSelections(prev => 
      prev.includes(ingredientId)
        ? prev.filter(id => id !== ingredientId)
        : [...prev, ingredientId]
    );
  };

  const saveSelections = async () => {
    if (!selectedDinner) return;
    
    setSaving(true);
    try {
      await api.updateUserSelections({
        pizza_dinner_id: selectedDinner.id,
        ingredient_ids: userSelections
      });
      // Show success message briefly
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save selections');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Pizza Topping Selection" />
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Pizza Topping Selection" />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pizza Dinners */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Scheduled Pizza Dinners
                  </CardTitle>
                  <CardDescription>
                    Select a pizza dinner to choose your toppings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {pizzaDinners.length === 0 ? (
                    <p className="text-gray-500">No pizza dinners scheduled</p>
                  ) : (
                    pizzaDinners.map(dinner => (
                      <div
                        key={dinner.id}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedDinner?.id === dinner.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                        onClick={() => setSelectedDinner(dinner)}
                      >
                        <h3 className="font-medium">{dinner.title}</h3>
                        <p className="text-sm text-gray-600">{dinner.description}</p>
                        <div className="flex items-center mt-2 text-xs text-gray-500">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formatDate(dinner.scheduled_date)}
                          <Clock className="h-3 w-3 ml-3 mr-1" />
                          {formatTime(dinner.scheduled_date)}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Toppings Selection */}
            <div className="lg:col-span-2">
              {selectedDinner ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Choose Your Toppings</CardTitle>
                    <CardDescription>
                      Select the toppings you want for: <strong>{selectedDinner.title}</strong>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {error && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-red-800 text-sm">{error}</p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {ingredients.map(ingredient => (
                        <div
                          key={ingredient.id}
                          className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-gray-50"
                        >
                          <Checkbox
                            id={`ingredient-${ingredient.id}`}
                            checked={userSelections.includes(ingredient.id)}
                            onCheckedChange={() => handleIngredientToggle(ingredient.id)}
                          />
                          <div className="flex-1">
                            <Label
                              htmlFor={`ingredient-${ingredient.id}`}
                              className="font-medium cursor-pointer"
                            >
                              {ingredient.name}
                            </Label>
                            {ingredient.description && (
                              <p className="text-sm text-gray-600 mt-1">
                                {ingredient.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-600">
                        {userSelections.length} topping{userSelections.length !== 1 ? 's' : ''} selected
                      </p>
                      <Button onClick={saveSelections} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Selections'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center h-64">
                    <p className="text-gray-500">Select a pizza dinner to choose your toppings</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserDashboard;