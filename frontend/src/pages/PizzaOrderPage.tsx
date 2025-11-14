import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiUrl } from '@/config/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, Calendar, MapPin, Check, User } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';

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

interface Order {
  id: number;
  userId: number;
  eventId: number;
  size: 'Standard' | 'Small';
  ingredientIds: number[];
  createdAt: string;
  updatedAt: string;
}

type PizzaSize = 'Standard' | 'Small';

export default function PizzaOrderPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<number>>(new Set());
  const [selectedSize, setSelectedSize] = useState<PizzaSize>('Standard');
  const [, setExistingOrder] = useState<Order | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEvent() {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(apiUrl(`/api/events/${id}`));

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
        const response = await fetch(apiUrl(`/api/events/${id}/ingredients`));

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

    async function fetchExistingOrder() {
      try {
        const response = await fetch(apiUrl(`/api/events/${id}/orders/my-order`), {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setExistingOrder(data.order);
          setHasSubmitted(true);
          setSelectedSize(data.order.size);
          setSelectedIngredients(new Set(data.order.ingredientIds));
        } else if (response.status === 404) {
          // No existing order - this is expected for users who haven't ordered yet
          // Silently continue without logging
        } else {
          // Other errors (500, etc.) - log but don't block the UI
          console.warn(`Unexpected response when fetching order: ${response.status}`);
        }
      } catch (err) {
        console.error('Error fetching existing order:', err);
        // Don't set error state - no existing order is not an error
      }
    }

    fetchEvent();
    fetchIngredients();
    fetchExistingOrder();
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

  function getToppingCountText(count: number): string {
    return `${count} ${count === 1 ? 'topping' : 'toppings'}`;
  }

  function isOrderValid(): boolean {
    return selectedIngredients.size > 0;
  }

  async function handleSubmitOrder() {
    if (!isOrderValid() || hasSubmitted || isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmissionError(null);

      const response = await fetch(apiUrl(`/api/events/${id}/orders`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          size: selectedSize,
          ingredientIds: Array.from(selectedIngredients),
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to submit order';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If JSON parsing fails, use default error message
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setExistingOrder(data.order);
      setHasSubmitted(true);
    } catch (err) {
      setSubmissionError(err instanceof Error ? err.message : 'Failed to submit order');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-center">Order Your Pizza</h1>
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
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6 text-center">Order Your Pizza</h1>
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
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 text-center">Order Your Pizza</h1>
        {user && (
          <p className="text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <User className="h-4 w-4" />
            <span>Ordering as <span className="font-medium">{user.username}</span></span>
          </p>
        )}
      </div>

      {hasSubmitted && (
        <Alert className="mb-4 border-green-500 bg-green-50 dark:bg-green-950">
          <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
          <AlertDescription className="text-green-900 dark:text-green-100">
            Order Submitted! Your pizza order has been received.
          </AlertDescription>
        </Alert>
      )}

      {submissionError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{submissionError}</AlertDescription>
        </Alert>
      )}
      
      <Card className="mb-4">
        <CardContent className="pt-6 pb-4">
          <h2 className="text-xl font-semibold mb-3">{event.name}</h2>
          <div className="space-y-1 text-sm text-muted-foreground">
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

      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Your Order</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Size:</span>
              <span className="font-medium">{selectedSize}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Toppings:</span>
              <span className="font-medium">
                {getToppingCountText(selectedIngredients.size)}
              </span>
            </div>
            {selectedIngredients.size > 0 && (
              <div className="pt-2 border-t">
                <div className="text-muted-foreground mb-1">Selected toppings:</div>
                <div className="flex flex-wrap gap-1">
                  {ingredients
                    .filter((ing) => selectedIngredients.has(ing.id))
                    .map((ing) => (
                      <span
                        key={ing.id}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900 text-green-900 dark:text-green-100 rounded text-xs"
                      >
                        <Check className="h-3 w-3" />
                        {ing.name}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Select Your Size</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(['Standard', 'Small'] as PizzaSize[]).map((size) => (
              <div
                key={size}
                className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedSize === size
                    ? 'border-green-500 bg-green-50 dark:bg-green-950'
                    : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                }`}
                onClick={() => setSelectedSize(size)}
              >
                <input
                  type="radio"
                  id={`size-${size.toLowerCase()}`}
                  name="pizza-size"
                  value={size}
                  checked={selectedSize === size}
                  onChange={() => setSelectedSize(size)}
                  className="h-4 w-4 text-green-600"
                  aria-label={size}
                />
                <Label
                  htmlFor={`size-${size.toLowerCase()}`}
                  className={`cursor-pointer flex-1 text-sm ${
                    selectedSize === size ? 'font-semibold text-green-900 dark:text-green-100' : ''
                  }`}
                >
                  {size}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Select Your Toppings</CardTitle>
        </CardHeader>
        <CardContent>
          {ingredients.length === 0 ? (
            <p className="text-muted-foreground text-center py-6 text-sm">
              No ingredients available for this event.
            </p>
          ) : (
            <div className="space-y-2">
              {ingredients.map((ingredient) => {
                const isSelected = selectedIngredients.has(ingredient.id);
                return (
                  <div 
                    key={ingredient.id} 
                    className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                      isSelected 
                        ? 'border-green-500 bg-green-50 dark:bg-green-950' 
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isSelected && (
                        <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                      )}
                      <Label 
                        htmlFor={`ingredient-${ingredient.id}`} 
                        className={`cursor-pointer text-sm ${
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

      <div className="mt-6">
        <Button
          type="button"
          className="w-full"
          disabled={!isOrderValid() || hasSubmitted || isSubmitting}
          onClick={handleSubmitOrder}
        >
          {isSubmitting ? 'Submitting...' : hasSubmitted ? 'Order Already Submitted' : 'Submit Order'}
        </Button>
      </div>
    </div>
  );
}
