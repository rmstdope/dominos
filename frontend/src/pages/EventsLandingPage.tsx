import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Loader2, AlertCircle } from 'lucide-react';

interface Event {
  id: number;
  name: string;
  date: string;
  location: string;
}

export default function EventsLandingPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('http://localhost:3000/api/events');

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

  function getTodayAtMidnight(): Date {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  function getUpcomingEvents(): Event[] {
    const today = getTodayAtMidnight();
    return events.filter(event => new Date(event.date) >= today);
  }

  function getPastEvents(): Event[] {
    const today = getTodayAtMidnight();
    return events.filter(event => new Date(event.date) < today);
  }

  function formatEventDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pizza Events</h2>
          <p className="text-muted-foreground mt-2">
            Finding your next pizza dinner...
          </p>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading events...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pizza Events</h2>
          <p className="text-muted-foreground mt-2">
            Find upcoming pizza dinners
          </p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pizza Events</h2>
          <p className="text-muted-foreground mt-2">
            Find upcoming pizza dinners
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-2">No events scheduled</h3>
            <p className="text-sm text-muted-foreground text-center">
              There are no pizza events scheduled at the moment. Check back later!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const upcomingEvents = getUpcomingEvents();
  const pastEvents = getPastEvents();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Pizza Events</h2>
        <p className="text-muted-foreground mt-2">
          Find upcoming pizza dinners and register your preferences
        </p>
      </div>

      {/* Upcoming Events Section */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Upcoming Events</h3>
        {upcomingEvents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No upcoming events</h3>
              <p className="text-sm text-muted-foreground text-center">
                There are no upcoming pizza events at the moment. Check back soon!
              </p>
            </CardContent>
          </Card>
        ) : (
          upcomingEvents.map((event) => (
            <Card key={event.id} className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-green-500">
              <CardHeader>
                <CardTitle>{event.name}</CardTitle>
                <CardDescription>
                  {formatEventDate(event.date)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{event.location}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Past Events Section - Placeholder for sub-issue #35 */}
      {pastEvents.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Past Events</h3>
          {pastEvents.map((event) => (
            <Card key={event.id}>
              <CardHeader>
                <CardTitle>{event.name}</CardTitle>
                <CardDescription>
                  {formatEventDate(event.date)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{event.location}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
