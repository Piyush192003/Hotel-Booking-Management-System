import { Link, NavLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Building2, House, Star } from 'lucide-react';
import { toggleMobileMenu } from '../../store/uiSlice';
import { cn } from '../../utils/cn';

const LINKS = [
  { to: '/', label: 'Home', Icon: House },
  { to: '/hotels', label: 'Hotels', Icon: Building2 },
  { to: '/hotels?sort=rating_desc', label: 'Top rated', Icon: Star },
];

const navHome = (u) => (u ? (u.role === 'admin' ? '/admin' : u.role === 'owner' ? '/owner' : '/dashboard') : null);

const linkClass = ({ isActive }) => cn(
  'flex items-center gap-2.5 rounded-xl px-4 py-3 text-[15px] font-semibold transition-colors',
  isActive ? 'bg-brand-gradient text-white shadow-brand-glow' : 'text-ink-700 hover:bg-white hover:text-brand-700',
);

export default function MobileMenu({ user, onLogout }) {
  const dispatch = useDispatch();
  const open = useSelector((s) => s.ui.mobileMenuOpen);
  const close = () => dispatch(toggleMobileMenu(false));
  if (!open) return null;

  const dashLink = navHome(user);
  const menuItems = [
    dashLink && { to: dashLink, label: 'Dashboard' },
    user && { to: '/dashboard/bookings', label: 'My bookings' },
    user && { to: '/dashboard/wishlist', label: 'Wishlist' },
  ].filter(Boolean);

  return (
    <div className="border-t border-brand-900/10 bg-sand-100/95 md:hidden">
      <nav className="container-page flex flex-col gap-1.5 py-4" aria-label="Mobile">
        {LINKS.map(({ to, label, Icon }) => (
          <NavLink key={label} to={to} className={linkClass} end={to === '/'} onClick={close}>
            <Icon className="h-5 w-5" aria-hidden="true" />
            {label}
          </NavLink>
        ))}
        {user ? (
          <>
            {menuItems.map((i) => (
              <NavLink key={i.label} to={i.to} className={linkClass} onClick={close}>{i.label}</NavLink>
            ))}
            <button type="button" onClick={onLogout} className="rounded-xl px-4 py-3 text-left text-[15px] font-semibold text-red-600 hover:bg-red-50">
              Log out
            </button>
          </>
        ) : (
          <div className="mt-2 flex gap-2">
            <Link to="/auth/login" className="flex-1 rounded-xl border border-ink-200 bg-white px-4 py-3 text-center text-[15px] font-semibold text-ink-800 hover:bg-sand-50" onClick={close}>Log in</Link>
            <Link to="/auth/register" className="flex-1 rounded-xl bg-brand-gradient px-4 py-3 text-center text-[15px] font-semibold text-white shadow-brand-glow" onClick={close}>Sign up</Link>
          </div>
        )}
      </nav>
    </div>
  );
}
