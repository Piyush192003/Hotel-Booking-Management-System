import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Bell, Building2, CalendarRange, Heart, House, LayoutDashboard, LogOut, Settings, Star } from 'lucide-react';
import { logoutUser } from '../../features/auth/authSlice';
import { toggleMobileMenu } from '../../store/uiSlice';
import MobileMenu from './MobileMenu';
import { cn } from '../../utils/cn';

const LINKS = [
  { to: '/', label: 'Home', Icon: House },
  { to: '/hotels', label: 'Hotels', Icon: Building2 },
  { to: '/hotels?sort=rating_desc', label: 'Top rated', Icon: Star },
];

const navHome = (u) => (u ? (u.role === 'admin' ? '/admin' : u.role === 'owner' ? '/owner' : '/dashboard') : null);

const linkClass = ({ isActive }) => cn(
  'flex items-center gap-2 rounded-full px-5 py-2.5 text-[15px] font-semibold transition-all',
  isActive
    ? 'bg-brand-gradient text-white shadow-brand-glow'
    : 'text-ink-700 hover:bg-white hover:text-brand-700 hover:shadow-sm',
);

export default function Navbar() {
  const { user, status } = useSelector((s) => s.auth);
  const unread = useSelector((s) => s.notifications.unreadCount);
  const mobileOpen = useSelector((s) => s.ui.mobileMenuOpen);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    dispatch(toggleMobileMenu(false));
    await dispatch(logoutUser());
    navigate('/');
  };

  const menuItems = [
    { to: navHome(user), label: 'Dashboard', Icon: LayoutDashboard },
    { to: '/dashboard/bookings', label: 'My bookings', Icon: CalendarRange },
    { to: '/dashboard/wishlist', label: 'Wishlist', Icon: Heart },
    { to: '/dashboard/notifications', label: 'Notifications', Icon: Bell },
    { to: '/dashboard/settings', label: 'Settings', Icon: Settings },
  ].filter((i) => i.to);

  return (
    <header className="sticky top-0 z-40 border-b border-brand-900/10 bg-sand-100/85 shadow-[0_2px_16px_-8px_rgba(6,58,48,0.18)] backdrop-blur supports-[backdrop-filter]:bg-sand-100/75">
      <div className="container-page flex h-20 items-center justify-between gap-4">
        <Link to="/" className="group flex items-center gap-3" aria-label="Wanderlust home">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-brand-glow transition-transform duration-300 group-hover:rotate-3 group-hover:scale-105">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18zm0 0c2.5-2.5 4-5.5 4-9a4 4 0 10-8 0c0 3.5 1.5 6.5 4 9z" />
              <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
            </svg>
          </span>
          <span className="font-display text-2xl font-bold tracking-tight text-ink-900 transition-colors group-hover:text-brand-800">
            Wander<span className="text-brand-700">lust</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1.5 md:flex" aria-label="Primary">
          {LINKS.map(({ to, label, Icon }) => (
            <NavLink key={label} to={to} className={linkClass} end={to === '/'}>
              <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {status === 'authenticated' && user && (
            <Link
              to="/dashboard/notifications"
              title="Notifications"
              aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
              className="relative flex h-11 w-11 items-center justify-center rounded-full border border-ink-200 bg-white/70 text-ink-700 transition-all hover:border-brand-300 hover:text-brand-700 hover:shadow-sm"
            >
              <Bell className="h-5 w-5" aria-hidden="true" />
              {unread > 0 && (
                <>
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-5 text-white ring-2 ring-sand-100">
                    {unread > 99 ? '99+' : unread}
                  </span>
                  <span className="absolute -right-0.5 -top-0.5 h-5 w-5 animate-ping rounded-full bg-red-400/60" aria-hidden="true" />
                </>
              )}
            </Link>
          )}
          {status === 'authenticated' && user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                className="relative flex items-center gap-2.5 rounded-full border border-ink-200 bg-white/70 py-1.5 pl-1.5 pr-4 transition-all hover:border-brand-300 hover:shadow-sm"
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-gradient text-base font-bold text-white shadow-sm">
                  {(user.name || '?').charAt(0).toUpperCase()}
                </span>
                <span className="hidden max-w-[140px] truncate text-[15px] font-semibold text-ink-800 sm:block">{user.name}</span>
              </button>
              {userMenuOpen && (
                <>
                  <button type="button" aria-label="Close menu" className="fixed inset-0 z-30 cursor-default" onClick={() => setUserMenuOpen(false)} />
                  <div role="menu" className="absolute right-0 z-40 mt-3 w-60 overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-float">
                    <div className="border-b border-sand-100 bg-sand-50/70 px-4 py-3">
                      <p className="truncate text-[15px] font-bold text-ink-900">{user.name}</p>
                      <p className="truncate text-xs text-ink-500">{user.email}</p>
                    </div>
                    {menuItems.map(({ to, label, Icon }) => (
                      <Link key={label} to={to} role="menuitem" className="flex items-center gap-3 px-4 py-2.5 text-[15px] font-medium text-ink-700 transition-colors hover:bg-sand-100 hover:text-brand-700" onClick={() => setUserMenuOpen(false)}>
                        <Icon className="h-[18px] w-[18px] text-ink-400" aria-hidden="true" />
                        {label}
                      </Link>
                    ))}
                    <div className="border-t border-sand-100">
                      <button type="button" role="menuitem" onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[15px] font-semibold text-red-600 transition-colors hover:bg-red-50">
                        <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
                        Log out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-2.5 md:flex">
              <Link to="/auth/login" className="rounded-full border border-ink-200 bg-white px-5 py-2.5 text-[15px] font-semibold text-ink-800 transition-all hover:border-brand-300 hover:text-brand-700 hover:shadow-sm">Log in</Link>
              <Link to="/auth/register" className="rounded-full bg-brand-gradient px-5 py-2.5 text-[15px] font-semibold text-white shadow-brand-glow transition-all hover:-translate-y-0.5 hover:brightness-110">Sign up</Link>
            </div>
          )}
          <button
            type="button"
            className="rounded-xl p-2.5 text-ink-700 transition-colors hover:bg-white hover:text-brand-700 md:hidden"
            onClick={() => dispatch(toggleMobileMenu())}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      <MobileMenu user={user} onLogout={handleLogout} />
    </header>
  );
}
