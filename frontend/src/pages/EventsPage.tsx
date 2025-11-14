import { useEffect, useState } from 'react';
import { apiUrl } from '@/config/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, Trash2, Plus, Calendar, MapPin, Loader2 } from 'lucide-react';

interface Event {
  id: number;
  name: string;
  date: string;
  location: string;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [newEventName, setNewEventName] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(apiUrl('/api/admin/events'), {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load events');
      }

      const data = await response.json();
      setEvents(data.events);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
    } finally {
      setIsLoading(false);
    }
  }

  async function addEvent(e: React.FormEvent) {
    e.preventDefault();
    
    if (!newEventName.trim() || !newEventDate || !newEventLocation.trim()) {
      return;
    }

    try {
      setActionError(null);

      const response = await fetch('http://localhost:3000/api/admin/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: newEventName.trim(),
          date: newEventDate,
          location: newEventLocation.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add event');
      }

      // Clear form
      setNewEventName('');
      setNewEventDate('');
      setNewEventLocation('');

      // Refresh events list
      await fetchEvents();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to add event');
    }
  }

  async function deleteEvent(id: number, name: string) {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) {
      return;
    }

    try {
      setActionError(null);

      const response = await fetch(apiUrl(`/api/admin/events/${id}`), {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete event');
      }

      // Refresh events list
      await fetchEvents();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete event');
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Events Management</h2>
        <p className="text-muted-foreground mt-2">
          Schedule and manage pizza evening events
        </p>
      </div>

      {/* Action Error Alert */}
      {actionError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      {/* Add New Event Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <CardTitle>Add New Event</CardTitle>
          </div>
          <CardDescription>
            Schedule a new pizza evening event
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={addEvent} className="space-y-4">
            <div>
              <Label htmlFor="event-name">Event Name</Label>
              <Input
                id="event-name"
                placeholder="e.g., Pizza Friday, Holiday Party..."
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="event-date">Event Date</Label>
              <Input
                id="event-date"
                type="date"
                value={newEventDate}
                onChange={(e) => setNewEventDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="event-location">Location</Label>
              <Input
                id="event-location"
                placeholder="e.g., Office, Conference Room, Remote..."
                value={newEventLocation}
                onChange={(e) => setNewEventLocation(e.target.value)}
              />
            </div>
            <Button type="submit">
              <Plus className="mr-2 h-4 w-4" />
              Add Event
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Events List Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <CardTitle>All Events</CardTitle>
          </div>
          <CardDescription>
            {events.length} {events.length === 1 ? 'event' : 'events'} scheduled
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" role="status" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : events.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No events scheduled yet. Add your first event above!
            </p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Name
                      </div>
                    </TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Location
                      </div>
                    </TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="font-medium">{event.name}</TableCell>
                      <TableCell>{event.date}</TableCell>
                      <TableCell>{event.location}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteEvent(event.id, event.name)}
                          aria-label="Delete event"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
