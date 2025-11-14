import { useEffect, useState } from 'react';
import { apiUrl } from '@/config/api';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, Trash2, Plus, Pizza, Loader2 } from 'lucide-react';

interface Ingredient {
  id: number;
  name: string;
}

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [newIngredientName, setNewIngredientName] = useState('');

  useEffect(() => {
    fetchIngredients();
  }, []);

  async function fetchIngredients() {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(apiUrl('/api/admin/ingredients'), {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load ingredients');
      }

      const data = await response.json();
      setIngredients(data.ingredients);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ingredients');
    } finally {
      setIsLoading(false);
    }
  }

  async function addIngredient(e: React.FormEvent) {
    e.preventDefault();
    
    if (!newIngredientName.trim()) {
      return;
    }

    try {
      setActionError(null);
      
      const response = await fetch(apiUrl('/api/admin/ingredients'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ name: newIngredientName.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to add ingredient');
      }

      const data = await response.json();
      setIngredients([...ingredients, data.ingredient]);
      setNewIngredientName('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to add ingredient');
    }
  }

  async function deleteIngredient(id: number) {
    try {
      setActionError(null);
      
      const response = await fetch(apiUrl(`/api/admin/ingredients/${id}`), {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete ingredient');
      }

      setIngredients(ingredients.filter(ingredient => ingredient.id !== id));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete ingredient');
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Ingredients Management</h2>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading ingredients...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Ingredients Management</h2>
        <p className="text-muted-foreground mt-2">
          Manage available pizza toppings and ingredients
        </p>
      </div>

      {actionError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{actionError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Add New Ingredient</CardTitle>
          <CardDescription>
            Add a new pizza topping to the available ingredients list
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={addIngredient} className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="ingredient-name" className="sr-only">
                Ingredient Name
              </Label>
              <Input
                id="ingredient-name"
                placeholder="e.g., Pepperoni, Mushrooms, Olives..."
                value={newIngredientName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewIngredientName(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={!newIngredientName.trim()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Ingredient
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Ingredients</CardTitle>
          <CardDescription>
            {ingredients.length} {ingredients.length === 1 ? 'ingredient' : 'ingredients'} available
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <Pizza className="h-4 w-4" />
                      Ingredient Name
                    </div>
                  </TableHead>
                  <TableHead className="w-[150px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {ingredients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Pizza className="h-8 w-8" />
                        <p className="font-medium">No ingredients yet</p>
                        <p className="text-sm">Add your first ingredient above to get started</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  ingredients.map((ingredient) => (
                    <TableRow key={ingredient.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">{ingredient.name}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteIngredient(ingredient.id)}
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
