import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Loader2, Calendar, Pizza, ChefHat, Plus, Trash2 } from 'lucide-react';

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

export default function EventIngredientsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [eventIngredients, setEventIngredients] = useState<Ingredient[]>([]);
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);

  // Compute available ingredients (ingredients not in the event)
  const availableIngredients = allIngredients
    .filter((ingredient) => !eventIngredients.some((ei) => ei.id === ingredient.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId !== null) {
      fetchEventIngredients(selectedEventId);
      fetchAllIngredients();
    }
  }, [selectedEventId]);

  async function fetchEvents() {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('http://localhost:3000/api/admin/events', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load events');
      }

      const data = await response.json();
      setEvents(data.events);

      // Select first event by default
      if (data.events.length > 0) {
        setSelectedEventId(data.events[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchEventIngredients(eventId: number) {
    try {
      const response = await fetch(`http://localhost:3000/api/admin/events/${eventId}/ingredients`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load event ingredients');
      }

      const data = await response.json();
      const ingredients = Array.isArray(data) ? data : [];
      setEventIngredients(ingredients);
    } catch (err) {
      console.error('Error fetching event ingredients:', err);
      setEventIngredients([]);
    }
  }

  async function fetchAllIngredients() {
    try {
      const response = await fetch('http://localhost:3000/api/admin/ingredients', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load ingredients');
      }

      const data = await response.json();
      setAllIngredients(data.ingredients);
    } catch (err) {
      console.error('Error fetching ingredients:', err);
    }
  }

  async function addIngredientToEvent(ingredientId: number) {
    if (!selectedEventId) return;

    try {
      const response = await fetch(`http://localhost:3000/api/admin/events/${selectedEventId}/ingredients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ ingredientId }),
      });

      if (!response.ok) {
        throw new Error('Failed to add ingredient');
      }

      // Refresh the event ingredients after adding
      await fetchEventIngredients(selectedEventId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add ingredient');
    }
  }

  async function removeIngredientFromEvent(ingredientId: number) {
    if (!selectedEventId) return;

    try {
      const response = await fetch(`http://localhost:3000/api/admin/events/${selectedEventId}/ingredients/${ingredientId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to remove ingredient');
      }

      // Refresh the event ingredients after removing
      await fetchEventIngredients(selectedEventId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove ingredient');
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Event Ingredients Management</h2>
        <p className="text-muted-foreground mt-2">
          Manage which ingredients are available at specific events
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" role="status" />
        </div>
      ) : (
        <>
          {/* Event Selector */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <CardTitle>Select Event</CardTitle>
              </div>
              <CardDescription>
                Choose an event to manage its available ingredients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      selectedEventId === event.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedEventId(event.id)}
                  >
                    <div className="font-medium">{event.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {event.date} • {event.location}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Event Ingredients Section */}
          {selectedEventId && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Pizza className="h-5 w-5" />
                  <CardTitle>Event Ingredients</CardTitle>
                </div>
                <CardDescription>
                  Ingredients currently available at this event
                </CardDescription>
              </CardHeader>
                            <CardContent>
                {eventIngredients.length === 0 ? (
                  <p className="text-muted-foreground">No ingredients added to this event yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {eventIngredients.map((ingredient) => (
                      <li key={ingredient.id} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Pizza className="h-4 w-4" />
                          <span>{ingredient.name}</span>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => removeIngredientFromEvent(ingredient.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}

          {/* Available Ingredients Section */}
          {selectedEventId && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ChefHat className="h-5 w-5" />
                  <CardTitle>Available Ingredients</CardTitle>
                </div>
                <CardDescription>
                  Ingredients that can be added to this event
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {availableIngredients.map((ingredient) => (
                    <div
                      key={ingredient.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <span>{ingredient.name}</span>
                      <Button
                        size="sm"
                        onClick={() => addIngredientToEvent(ingredient.id)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
