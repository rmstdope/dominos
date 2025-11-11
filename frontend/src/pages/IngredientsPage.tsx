import { useEffect, useState } from 'react';
import { Table, Button, TextField, Text, Callout, Flex, Card } from '@radix-ui/themes';
import { ExclamationTriangleIcon, TrashIcon, PlusIcon } from '@radix-ui/react-icons';

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
      
      const response = await fetch('http://localhost:3000/api/admin/ingredients', {
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
      
      const response = await fetch('http://localhost:3000/api/admin/ingredients', {
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
      
      const response = await fetch(`http://localhost:3000/api/admin/ingredients/${id}`, {
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
    return <Text>Loading ingredients...</Text>;
  }

  if (error) {
    return (
      <Callout.Root color="red">
        <Callout.Icon>
          <ExclamationTriangleIcon />
        </Callout.Icon>
        <Callout.Text>{error}</Callout.Text>
      </Callout.Root>
    );
  }

  return (
    <div>
      <Text size="6" weight="bold" mb="4">
        Ingredients Management
      </Text>

      {actionError && (
        <Callout.Root color="red" mb="4">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>{actionError}</Callout.Text>
        </Callout.Root>
      )}

      <Card mb="4">
        <form onSubmit={addIngredient}>
          <Flex gap="3" align="end">
            <div style={{ flex: 1 }}>
              <Text as="label" size="2" weight="bold" mb="1">
                Add New Ingredient
              </Text>
              <TextField.Root
                placeholder="Ingredient name"
                value={newIngredientName}
                onChange={(e) => setNewIngredientName(e.target.value)}
              />
            </div>
            <Button type="submit">
              <PlusIcon />
              Add Ingredient
            </Button>
          </Flex>
        </form>
      </Card>

      <Table.Root variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell width="120px">Actions</Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>

        <Table.Body>
          {ingredients.map((ingredient) => (
            <Table.Row key={ingredient.id}>
              <Table.Cell>
                <Text weight="medium">{ingredient.name}</Text>
              </Table.Cell>
              <Table.Cell>
                <Button
                  color="red"
                  variant="soft"
                  onClick={() => deleteIngredient(ingredient.id)}
                >
                  <TrashIcon />
                  Delete
                </Button>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>

      {ingredients.length === 0 && (
        <Text size="2" color="gray" align="center" mt="4">
          No ingredients yet. Add your first ingredient above.
        </Text>
      )}
    </div>
  );
}
