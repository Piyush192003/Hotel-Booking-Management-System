import { Link } from 'react-router-dom';

const COLUMNS = [
  {
    title: 'Explore',
    links: [
      { label: 'Hotels', to: '/hotels' },
      { label: 'Top rated', to: '/hotels?sort=rating_desc' },
      { label: 'Budget stays', to: '/hotels?maxPrice=4000' },
      { label: 'Luxury stays', to: '/hotels?minPrice=10000' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Log in', to: '/auth/login' },
      { label: 'Create account', to: '/auth/register' },
      { label: 'My bookings', to: '/dashboard/bookings' },
      { label: 'Wishlist', to: '/dashboard/wishlist' },
    ],
  },
  {
    title: 'For property owners',
    links: [
      { label: 'Become a partner', to: '/auth/register?role=owner' },
      { label: 'Owner dashboard', to: '/owner' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-brand-950 text-sand-100">
      <div className="bg-gradient-to-b from-brand-900 to-brand-950 pt-2" />
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sand-100 text-brand-800 shadow-lg">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18zm0 0c2.5-2.5 4-5.5 4-9a4 4 0 10-8 0c0 3.5 1.5 6.5 4 9z" />
                <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
              </svg>
            </span>
            <span className="font-display text-lg font-bold text-white">
              Wander<span className="text-brand-300">lust</span>
            </span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-sand-300">
            Find and book stays you will love — from budget rooms to luxury resorts across India.
            Honest pricing, secure payments and free cancellation on eligible bookings.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-sand-400">{col.title}</h4>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="text-sm text-sand-200 hover:text-white transition-colors">{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/10 py-5">
        <p className="container-page text-center text-xs text-sand-400 sm:text-left">
          © {new Date().getFullYear()} Wanderlust. Crafted for unforgettable stays.
        </p>
      </div>
    </footer>
  );
}
