import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import AddItemForm from './AddItemForm';

export default async function ItemsPage() {
  const supabase = createServerComponentClient({ cookies });
  
  // Get user's households for the form
  const { data: households } = await supabase
    .from('households')
    .select('id, name')
    .eq('household_members.user_id', (await supabase.auth.getUser()).data.user?.id);

  // Get all items from user's households
  const { data: items } = await supabase
    .from('items')
    .select(`
      id,
      name,
      quantity,
      unit,
      expiry_date,
      storage_location,
      household:households (
        name
      )
    `)
    .order('expiry_date', { ascending: true });

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold text-gray-900">Food Items</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all food items in your households
          </p>
        </div>
      </div>

      <div className="bg-white shadow-sm ring-1 ring-gray-900/5 sm:rounded-xl md:col-span-2">
        <div className="px-4 py-6 sm:p-8">
          <AddItemForm households={households || []} />
        </div>
      </div>

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                    Name
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Quantity
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Location
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Expiry Date
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Household
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items?.map((item) => (
                  <tr key={item.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                      {item.name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {item.storage_location}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : '-'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {item.household?.name}
                    </td>
                  </tr>
                ))}
                {(!items || items.length === 0) && (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-sm text-gray-500">
                      No items found. Add some items to get started!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 