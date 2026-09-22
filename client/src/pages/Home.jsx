import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCollections } from '../features/hotels/hotelsSlice';
import HotelCard from '../components/hotels/HotelCard';
import SearchBar from '../components/hotels/SearchBar';
import { HotelGridSkeleton } from '../components/ui/LoadingSkeleton';

const FEATURES = [
  { title: 'Verified properties', body: 'Every property is reviewed by our team before it goes live.', icon: '🛡️' },
  { title: 'Best-price promise', body: 'Transparent pricing with taxes and fees shown up front.', icon: '💰' },
  { title: 'Flexible cancellation', body: 'Clear cancellation policies and fast refunds on eligible stays.', icon: '↩️' },
  { title: '24/7 support', body: 'Real humans, around the clock, whenever you need help.', icon: '🎧' },
];

function Section({ title, subtitle, action, alt, children }) {
  return (
    <section className={alt ? 'section-alt py-12' : 'py-12'}>
      <div className="container-page">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-bold text-ink-900">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-ink-500">{subtitle}</p>}
          </div>
          {action}
        </div>
        {children}
      </div>
    </section>
  );
}

const grid = (list) => (
  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
    {list.map((h) => <HotelCard key={h._id || h.id} hotel={h} />)}
  </div>
);

export default function Home() {
  const dispatch = useDispatch();
  const { collections, collectionsStatus, collectionsError } = useSelector((s) => s.hotels);

  useEffect(() => {
    if (collectionsStatus === 'idle' || collectionsStatus === 'failed') dispatch(fetchCollections());
  }, [dispatch, collectionsStatus]);

  const go = (params) => {
    const q = new URLSearchParams();
    if (params.destination) q.set('destination', params.destination);
    if (params.checkIn) q.set('checkIn', params.checkIn);
    if (params.checkOut) q.set('checkOut', params.checkOut);
    if (params.adults) q.set('adults', params.adults);
    if (params.children) q.set('children', params.children);
    if (params.rooms) q.set('rooms', params.rooms);
    return `/hotels?${q.toString()}`;
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-800 via-brand-900 to-brand-950">
        <img
          src="https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=2000&q=60"
          alt="Resort pool at dusk"
          className="absolute inset-0 h-full w-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-hero-gradient" />
        <div className="relative container-page py-24 sm:py-36">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 backdrop-blur">
            <span className="h-2 w-2 animate-pulse rounded-full bg-brand-300" />
            <p className="text-xs font-semibold uppercase tracking-widest text-sand-200">
              Hotels . Resorts . Homestays
            </p>
          </div>
          <h1 className="max-w-2xl font-display text-4xl font-semibold leading-[1.05] text-white sm:text-6xl">
            Find your next stay, effortlessly.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-sand-200">
            Handpicked hotels and stays across India with honest pricing,
            real availability and instant confirmation.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4 text-sm text-sand-300">
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 text-brand-300" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 00-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
              Verified stays
            </span>
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 text-brand-300" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 00-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
              Instant confirmation
            </span>
            <span className="flex items-center gap-2">
              <svg className="h-4 w-4 text-brand-300" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 00-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
              Free cancellation
            </span>
          </div>
        </div>
      </section>

      {/* Search */}
      <div className="container-page relative z-10 -mt-12 pb-2">
        <div className="rounded-2xl border border-brand-200/60 bg-white p-4 shadow-float ring-1 ring-brand-900/5 sm:p-5">
          <SearchBar
            initial={{}}
            onSearch={(p) => { window.location.href = go(p); }}
          />
        </div>
      </div>

      {collectionsStatus === 'loading' && (
        <div className="container-page py-10">
          <HotelGridSkeleton count={6} />
        </div>
      )}
      {collectionsStatus === 'failed' && (
        <div className="container-page py-10">
          <div role="alert" className="rounded-xl border border-red-100 bg-red-50/60 px-6 py-12 text-center">
            <h3 className="font-display text-base font-bold text-ink-900">Could not load stays</h3>
            <p className="mt-1 max-w-md text-sm text-ink-500">{collectionsError}</p>
            <button type="button" onClick={() => dispatch(fetchCollections())} className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Try again</button>
          </div>
        </div>
      )}

      {collectionsStatus === 'succeeded' && collections && (
        <>
          {collections.featured?.length > 0 && (
            <Section
              title="Featured stays"
              subtitle="Handpicked properties with verified quality"
              action={<Link to="/hotels?featured=true" className="shrink-0 text-sm font-semibold text-brand-600 hover:text-brand-700">View all →</Link>}
              alt
            >
              {grid(collections.featured)}
            </Section>
          )}
          {collections.topRated?.length > 0 && (
            <Section
              title="Top rated"
              subtitle="Highest-rated stays by real guest reviews"
              action={<Link to="/hotels?sort=rating_desc" className="shrink-0 text-sm font-semibold text-brand-600 hover:text-brand-700">View all →</Link>}
            >
              {grid(collections.topRated)}
            </Section>
          )}
          {collections.luxury?.length > 0 && (
            <Section
              title="Luxury escapes"
              subtitle="Premium properties for memorable getaways"
              action={<Link to="/hotels?minPrice=10000" className="shrink-0 text-sm font-semibold text-brand-600 hover:text-brand-700">View all →</Link>}
              alt
            >
              {grid(collections.luxury)}
            </Section>
          )}
          {collections.budget?.length > 0 && (
            <Section
              title="Budget-friendly"
              subtitle="Comfortable stays without breaking the bank"
              action={<Link to="/hotels?maxPrice=4000" className="shrink-0 text-sm font-semibold text-brand-600 hover:text-brand-700">View all →</Link>}
            >
              {grid(collections.budget)}
            </Section>
          )}
        </>
      )}

      {/* Features */}
      <section className="section-alt py-16">
        <div className="container-page">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="card-base p-6 text-center">
                <div className="mb-4 text-3xl">{f.icon}</div>
                <h3 className="font-display text-lg font-bold text-ink-900">{f.title}</h3>
                <p className="mt-2 text-sm text-ink-500">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-page py-16 text-center">
        <div className="max-w-2xl">
          <h2 className="font-display text-3xl font-bold text-ink-900">Still planning your next trip?</h2>
          <p className="mt-3 text-sm text-ink-500">
            Sign up to save your favourite properties and get exclusive deals.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/auth/register" className="rounded-lg bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-brand-glow hover:brightness-110">Create account</Link>
            <Link to="/auth/login" className="rounded-lg border border-ink-200 bg-white px-5 py-2.5 text-sm font-semibold text-ink-700 hover:bg-sand-50">Log in</Link>
          </div>
        </div>
      </section>
    </div>
  );
}