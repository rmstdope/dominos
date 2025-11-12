import { useParams } from 'react-router-dom';

export default function PizzaOrderPage() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Order Your Pizza</h1>
      <p className="text-gray-600">Event ID: {id}</p>
    </div>
  );
}
