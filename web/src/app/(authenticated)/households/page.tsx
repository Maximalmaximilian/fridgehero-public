import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import CreateHouseholdForm from './CreateHouseholdForm';

export default async function HouseholdsPage() {
  const supabase = createServerComponentClient({ cookies });
  
  const { data: households } = await supabase
    .from('households')
    .select(`
      id,
      name,
      household_members!inner (
        role,
        user_id
      )
    `)
    .eq('household_members.user_id', (await supabase.auth.getUser()).data.user?.id);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">My Households</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {households?.map((household) => (
          <div
            key={household.id}
            className="bg-white overflow-hidden shadow rounded-lg divide-y divide-gray-200"
          >
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900">
                {household.name}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Role: {household.household_members[0].role}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white overflow-hidden shadow rounded-lg divide-y divide-gray-200">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Create New Household
          </h3>
          <CreateHouseholdForm />
        </div>
      </div>
    </div>
  );
} 