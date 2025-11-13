import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertCircle, Loader2, Pizza, Trash2 } from 'lucide-react';

interface Order {
  id: number;
  userId: number;
  userName: string;
  eventId: number;
  eventName: string;
  size: string;
  ingredients: string[];
  createdAt: string;
}

interface GroupedOrders {
  eventId: number;
  eventName: string;
  orders: Order[];
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteOrderId, setDeleteOrderId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('http://localhost:3000/api/admin/orders', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load orders');
      }

      const data = await response.json();
      setOrders(data.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  }

  function groupOrdersByEvent(orders: Order[]): GroupedOrders[] {
    const grouped = orders.reduce((acc, order) => {
      const existing = acc.find((g) => g.eventId === order.eventId);
      if (existing) {
        existing.orders.push(order);
      } else {
        acc.push({
          eventId: order.eventId,
          eventName: order.eventName,
          orders: [order],
        });
      }
      return acc;
    }, [] as GroupedOrders[]);

    // Keep orders sorted by creation date within each event (newest first)
    grouped.forEach((group) => {
      group.orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    });

    return grouped;
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  }

  async function handleDeleteOrder() {
    if (!deleteOrderId) return;

    try {
      setIsDeleting(true);
      setDeleteError(null);

      const response = await fetch(`http://localhost:3000/api/admin/orders/${deleteOrderId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete order');
      }

      // Close dialog
      setDeleteOrderId(null);

      // Refresh orders list
      await fetchOrders();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete order');
    } finally {
      setIsDeleting(false);
    }
  }

  function openDeleteDialog(orderId: number) {
    setDeleteOrderId(orderId);
    setDeleteError(null);
  }

  function closeDeleteDialog() {
    if (!isDeleting) {
      setDeleteOrderId(null);
      setDeleteError(null);
    }
  }

  const groupedOrders = groupOrdersByEvent(orders);

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
        <Pizza className="h-8 w-8 text-green-600" />
        Pizza Orders
      </h1>

      {isLoading && (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" role="status" />
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && orders.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8 text-muted-foreground">
              <Pizza className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No orders yet</p>
              <p className="text-sm mt-2">Orders will appear here once users submit their pizza preferences.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isLoading && !error && orders.length > 0 && (
        <div className="space-y-6">
          {groupedOrders.map((group) => (
            <Card key={group.eventId} className="border-green-200">
              <CardHeader className="bg-green-50 border-b border-green-200">
                <CardTitle className="text-xl text-green-900">{group.eventName}</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {group.orders.map((order) => (
                    <Card key={order.id} className="border-gray-200 hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">{order.userName}</span>
                              <Badge variant="secondary" className="text-xs">
                                {order.size}
                              </Badge>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {order.ingredients.length > 0 ? (
                                order.ingredients.map((ingredient, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs bg-green-50 border-green-300 text-green-800">
                                    {ingredient}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-sm text-muted-foreground italic">No toppings</span>
                              )}
                            </div>

                            <div className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</div>
                          </div>

                          <div className="flex items-start">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => openDeleteDialog(order.id)}
                              aria-label="Delete order"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteOrderId !== null} onOpenChange={(open) => !open && closeDeleteDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this pizza order.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDeleteDialog} disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOrder} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
