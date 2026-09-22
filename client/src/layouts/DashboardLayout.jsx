import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser } from '../features/auth/authSlice';
import Navbar from '../components/layout/Navbar';
import Toaster from '../components/ui/Toaster';
import { cn } from '../utils/cn';

const NAV_BY_ROLE = {
  customer: [
    { to: '/dashboard', label: 'Overview', end: true },
    { to: '/dashboard/bookings', label: 'My bookings' },
    { to: '/dashboard/wishlist', label: 'Wishlist' },
    { to: '/dashboard/reviews', label: 'My reviews' },
    { to: '/dashboard/notifications', label: 'Notifications' },
    { to: '/dashboard/profile', label: 'Profile' },
  ],
  owner: [
    { to: '/owner', label: 'Overview', end: true },
    { to: '/owner/properties', label: 'Properties' },
    { to: '/owner/properties/new', label: 'Add property', hidden: true },
    { to: '/owner/bookings', label: 'Bookings' },
    { to: '/owner/revenue', label: 'Revenue' },
    { to: '/owner/reviews', label: 'Reviews' },
    { to: '/dashboard/profile', label: 'Profile' },
  ],
  admin: [
    { to: '/admin', label: 'Overview', end: true },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/hotels', label: 'Hotels' },
    { to: '/admin/bookings', label: 'Bookings' },
    { to: '/admin/payments', label: 'Payments & refunds' },
    { to: '/admin/reviews', label: 'Reviews' },
    { to: '/admin/coupons', label: 'Coupons' },
    { to: '/admin/reports', label: 'Reports' },
    { to: '/admin/audit-logs', label: 'Audit logs' },
    { to: '/dashboard/profile', label: 'Profile' },
  ],
};

const TITLES = [
  { match: /^\/dashboard\/bookings/, title: 'My bookings' },
  { match: /^\/dashboard\/wishlist/, title: 'Wishlist' },
  { match: /^\/dashboard\/reviews/, title: 'My reviews' },
  { match: /^\/dashboard\/notifications/, title: 'Notifications' },
  { match: /^\/dashboard\/profile/, title: 'Profile & settings' },
  { match: /^\/dashboard/, title: 'Dashboard' },
  { match: /^\/owner\/properties\/new/, title: 'Add property' },
  { match: /^\/owner\/properties/, title: 'My properties' },
  { match: /^\/owner\/bookings/, title: 'Bookings' },
  { match: /^\/owner\/revenue/, title: 'Revenue & occupancy' },
  { match: /^\/owner\/reviews/, title: 'Guest reviews' },
  { match: /^\/owner/, title: 'Owner dashboard' },
  { match: /^\/admin\/users/, title: 'User management' },
  { match: /^\/admin\/hotels/, title: 'Hotel management' },
  { match: /^\/admin\/bookings/, title: 'Booking management' },
  { match: /^\/admin\/payments/, title: 'Payments & refunds' },
  { match: /^\/admin\/reviews/, title: 'Review moderation' },
  { match: /^\/admin\/coupons/, title: 'Coupon management' },
  { match: /^\/admin\/reports/, title: 'Reports & analytics' },
  { match: /^\/admin\/audit-logs/, title: 'Audit logs' },
  { match: /^\/admin/, title: 'Admin dashboard' },
];

const roleOf = (user) => user?.role || 'customer';

export default function DashboardLayout() {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const role = roleOf(user);
  const nav = (NAV_BY_ROLE[role] || NAV_BY_ROLE.customer).filter((i) => !i.hidden);
  const title = TITLES.find((t) => t.match.test(location.pathname))?.title || 'Dashboard';

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/');
  };

  return (
    <div className="flex min-h-screen flex-col bg-sand-100">
      <Navbar />
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="sticky top-20 hidden h-[calc(100vh-5rem)] w-60 shrink-0 flex-col border-r border-sand-200 bg-sand-50 lg:flex">
          <nav className="flex-1 space-y-1 overflow-y-auto p-3 pt-4" aria-label="Dashboard">
            {nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => cn(
                  'block rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-brand-gradient text-white shadow-brand-glow' : 'text-ink-600 hover:bg-sand-200/60 hover:text-ink-900',
                )}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-sand-200 p-3">
            <button type="button" onClick={handleLogout} className="w-full rounded-lg px-3.5 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50">
              Log out
            </button>
          </div>
        </aside>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <header className="border-b border-sand-200 bg-white/60">
            <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
              <h1 className="font-display text-xl font-bold text-ink-900">{title}</h1>
            </div>
            {/* Mobile nav — wraps so every section stays visible on phones
                (a single scrolling row used to hide the last items) */}
            <nav className="flex flex-wrap gap-1.5 border-t border-sand-200 px-3 py-2.5 lg:hidden" aria-label="Dashboard sections">
              {nav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => cn(
                    'whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                    isActive ? 'bg-brand-gradient text-white shadow-brand-glow' : 'bg-white text-ink-600 ring-1 ring-inset ring-sand-200 hover:bg-sand-200/60 hover:text-ink-900',
                  )}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </header>
          <main className="px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </main>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
