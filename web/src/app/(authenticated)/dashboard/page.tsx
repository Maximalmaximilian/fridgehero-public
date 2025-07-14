import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { getDaysUntilExpiry, getExpiryClasses, getHeroWidgetContext, getExpiryText } from '@/lib/design-tokens';

export default async function DashboardPage() {
  const supabase = createServerComponentClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();

  // Get user's households
  const { data: households } = await supabase
    .from('households')
    .select(`
      id,
      name,
      items (
        id,
        name,
        expiry_date
      )
    `)
    .eq('household_members.user_id', session?.user.id)
    .order('created_at', { ascending: false });

  // Get items expiring soon (within 7 days)
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  
  const { data: expiringItems } = await supabase
    .from('items')
    .select(`
      id,
      name,
      expiry_date,
      households (
        name
      )
    `)
    .lte('expiry_date', sevenDaysFromNow.toISOString())
    .gte('expiry_date', new Date().toISOString())
    .order('expiry_date', { ascending: true });

  // Calculate stats
  const urgentItems = expiringItems?.filter(item => getDaysUntilExpiry(item.expiry_date) <= 1).length || 0;
  const totalItems = households?.reduce((sum, h) => sum + (h.items?.length || 0), 0) || 0;
  const expiringThisWeek = expiringItems?.length || 0;

  // Get hero widget context
  const heroContext = getHeroWidgetContext(urgentItems);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-card-fresh border-b border-primary-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-h1 text-gradient">🏠 My Kitchen</h1>
              <p className="text-caption mt-1">
                {totalItems} items • {expiringThisWeek} expiring soon
              </p>
            </div>
            <div className="flex space-x-3">
              <Link href="/recipes" className="btn-secondary">
                🍳 Recipes
              </Link>
              <Link href="/items/add" className="btn-primary">
                + Add Item
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Widget */}
        <div className={`hero-widget ${heroContext.bgClass}`}>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <h2 className="text-h2 text-charcoal">{heroContext.title}</h2>
              <p className="text-body text-gray-600">{heroContext.subtitle}</p>
            </div>
            <button className="btn-primary">
              {heroContext.action} →
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={urgentItems > 0 ? 'card-warning animate-breathing' : 'card-fresh'}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-h3 text-charcoal">{urgentItems}</h3>
                <p className="text-caption">Expiring Today</p>
              </div>
              <div className="text-3xl">⚡</div>
            </div>
          </div>

          <div className="card-fresh">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-h3 text-charcoal">0</h3>
                <p className="text-caption">Items Saved</p>
              </div>
              <div className="text-3xl">🌱</div>
            </div>
          </div>

          <div className="card-premium">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-h3 text-charcoal">{totalItems}</h3>
                <p className="text-caption">Total Items</p>
              </div>
              <div className="text-3xl">🛒</div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Households Section */}
          <div className="card-premium">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-h2">Your Households</h2>
              <Link href="/households" className="btn-secondary text-sm py-2 px-4">
                Manage
              </Link>
            </div>
            
            {households && households.length > 0 ? (
              <div className="space-y-4">
                {households.map((household) => (
                  <div key={household.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors duration-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-body-medium text-charcoal">{household.name}</h3>
                        <p className="text-small text-gray-500">
                          {household.items?.length || 0} items
                        </p>
                      </div>
                      <div className="text-xl">🏠</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 space-y-4">
                <div className="text-4xl">🏠</div>
                <div>
                  <h3 className="text-h3 mb-2">No households yet</h3>
                  <p className="text-body text-gray-600 mb-4">
                    Create your first household to start tracking food
                  </p>
                  <Link href="/households" className="btn-primary">
                    Create Household
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Expiring Items Section */}
          <div className="card-premium">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-h2">Items Expiring Soon</h2>
              <Link href="/items" className="btn-secondary text-sm py-2 px-4">
                View All
              </Link>
            </div>
            
            {expiringItems && expiringItems.length > 0 ? (
              <div className="space-y-3">
                {expiringItems.slice(0, 5).map((item) => {
                  const daysUntilExpiry = getDaysUntilExpiry(item.expiry_date);
                  const expiryClasses = getExpiryClasses(daysUntilExpiry);
                  
                  return (
                    <div 
                      key={item.id} 
                      className={`${expiryClasses.cardClass} flex justify-between items-center`}
                    >
                      <div>
                        <h4 className="text-body-medium text-charcoal">{item.name}</h4>
                        <p className="text-small text-gray-500">
                          {(item.households as any)?.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-small font-medium ${expiryClasses.textColor}`}>
                          {getExpiryText(daysUntilExpiry)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(item.expiry_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
                
                {expiringItems.length > 5 && (
                  <div className="text-center pt-2">
                    <Link href="/items" className="text-primary-600 hover:text-primary-500 text-sm font-medium">
                      View {expiringItems.length - 5} more items →
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 space-y-4">
                <div className="text-4xl">✨</div>
                <div>
                  <h3 className="text-h3 mb-2">Nothing expiring soon!</h3>
                  <p className="text-body text-gray-600 mb-4">
                    Your food is fresh and well-organized
                  </p>
                  <Link href="/items" className="btn-primary">
                    Add Items
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card-premium">
          <h2 className="text-h2 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/items/add" className="btn-secondary flex flex-col items-center space-y-2 py-4">
              <div className="text-2xl">📱</div>
              <span className="text-sm">Scan Items</span>
            </Link>
            <Link href="/recipes" className="btn-secondary flex flex-col items-center space-y-2 py-4">
              <div className="text-2xl">🍳</div>
              <span className="text-sm">Find Recipes</span>
            </Link>
            <Link href="/households" className="btn-secondary flex flex-col items-center space-y-2 py-4">
              <div className="text-2xl">👥</div>
              <span className="text-sm">Invite Family</span>
            </Link>
            <Link href="/settings" className="btn-secondary flex flex-col items-center space-y-2 py-4">
              <div className="text-2xl">⚙️</div>
              <span className="text-sm">Settings</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 