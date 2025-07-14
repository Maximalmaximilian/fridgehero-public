'use client';

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface Household {
  id: string;
  name: string;
}

interface AddItemFormProps {
  households: Household[];
}

export default function AddItemForm({ households }: AddItemFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    quantity: '1',
    unit: '',
    expiry_date: '',
    storage_location: '',
    household_id: households[0]?.id || ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClientComponentClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error: itemError } = await supabase
        .from('items')
        .insert({
          ...formData,
          quantity: parseInt(formData.quantity)
        });

      if (itemError) throw itemError;

      router.refresh();
      setFormData({
        name: '',
        quantity: '1',
        unit: '',
        expiry_date: '',
        storage_location: '',
        household_id: households[0]?.id || ''
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (households.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Please create a household before adding items.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Item Name
          </label>
          <input
            type="text"
            name="name"
            id="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="household_id" className="block text-sm font-medium text-gray-700">
            Household
          </label>
          <select
            id="household_id"
            name="household_id"
            value={formData.household_id}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          >
            {households.map((household) => (
              <option key={household.id} value={household.id}>
                {household.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
            Quantity
          </label>
          <input
            type="number"
            name="quantity"
            id="quantity"
            min="1"
            value={formData.quantity}
            onChange={handleChange}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="unit" className="block text-sm font-medium text-gray-700">
            Unit
          </label>
          <input
            type="text"
            name="unit"
            id="unit"
            value={formData.unit}
            onChange={handleChange}
            placeholder="e.g., kg, pieces"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="expiry_date" className="block text-sm font-medium text-gray-700">
            Expiry Date
          </label>
          <input
            type="date"
            name="expiry_date"
            id="expiry_date"
            value={formData.expiry_date}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="storage_location" className="block text-sm font-medium text-gray-700">
            Storage Location
          </label>
          <input
            type="text"
            name="storage_location"
            id="storage_location"
            value={formData.storage_location}
            onChange={handleChange}
            placeholder="e.g., Fridge, Freezer"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          />
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex justify-center rounded-md border border-transparent bg-primary-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Adding...' : 'Add Item'}
        </button>
      </div>
    </form>
  );
} 