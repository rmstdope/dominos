import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, Calendar, MapPin } from 'lucide-react';
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
              {ingredients.map((ingredient) => (
                <div key={ingredient.id} className="flex items-center justify-between">
                  <Label htmlFor={`ingredient-${ingredient.id}`} className="cursor-pointer">
                    {ingredient.name}
                  </Label>
                  <Switch
                    id={`ingredient-${ingredient.id}`}
                    checked={selectedIngredients.has(ingredient.id)}
                    onCheckedChange={() => handleIngredientToggle(ingredient.id)}
                    aria-label={ingredient.name}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
