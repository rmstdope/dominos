import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Calendar, MapPin, Check } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

interface Event {
  id: number;
  name: string;
  date: string;
  location: string;
}

interface Ingredient {
  id: number;
  name: string;
}

export default function PizzaOrderPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvent() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`http://localhost:3000/api/events/${id}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Event not found');
          }
          throw new Error('Failed to load event');
        }

        const data = await response.json();
        setEvent(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load event');
      } finally {
        setIsLoading(false);
      }
    }

    async function fetchIngredients() {
      try {
        const response = await fetch(`http://localhost:3000/api/events/${id}/ingredients`);

        if (!response.ok) {
          throw new Error('Failed to load ingredients');
        }

        const data = await response.json();
        setIngredients(data.ingredients);
      } catch (err) {
        console.error('Error fetching ingredients:', err);
        // Don't set error state here - we still want to show the page
      }
    }

    fetchEvent();
    fetchIngredients();
  }, [id]);

  function formatEventDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  function handleIngredientToggle(ingredientId: number) {
    setSelectedIngredients((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(ingredientId)) {
        newSet.delete(ingredientId);
      } else {
        newSet.add(ingredientId);
      }
      return newSet;
    });
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Order Your Pizza</h1>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading event details...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Order Your Pizza</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!event) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Order Your Pizza</h1>
      
      <Card className="mb-6">
        <CardContent className="pt-6">
          <h2 className="text-2xl font-semibold mb-4">{event.name}</h2>
          <div className="space-y-2 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{formatEventDate(event.date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>{event.location}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Select Your Toppings</CardTitle>
        </CardHeader>
        <CardContent>
          {ingredients.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No ingredients available for this event.
            </p>
          ) : (
            <div className="space-y-4">
              {ingredients.map((ingredient) => {
                const isSelected = selectedIngredients.has(ingredient.id);
                return (
                  <div 
                    key={ingredient.id} 
                    className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                      isSelected 
                        ? 'border-green-500 bg-green-50 dark:bg-green-950' 
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isSelected && (
                        <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                      )}
                      <Label 
                        htmlFor={`ingredient-${ingredient.id}`} 
                        className={`cursor-pointer text-base ${
                          isSelected ? 'font-semibold text-green-900 dark:text-green-100' : ''
                        }`}
                      >
                        {ingredient.name}
                      </Label>
                    </div>
                    <Switch
                      id={`ingredient-${ingredient.id}`}
                      checked={isSelected}
                      onCheckedChange={() => handleIngredientToggle(ingredient.id)}
                      aria-label={ingredient.name}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
