import { Link } from 'react-router-dom';

const STATS = [
  { value: '500+', label: 'Verified stays' },
  { value: '15k+', label: 'Happy guests' },
  { value: '4.8★', label: 'Avg rating' },
];

/**
 * Full-height split screen for auth pages.
 * Left: branded decorative panel (image + gradient overlay + tagline + stats + testimonial)
 * Right: centered form card rendered via {children}.
 */
export default function AuthLayout({ children }) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-sand-50">
      {/* Decorative panel */}
      <aside className="relative hidden overflow-hidden lg:block lg:w-[45%] xl:w-1/2">
        <img
          src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=60"
          alt="Tropical beach resort"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900/90 via-brand-800/85 to-brand-950/95" />
        <div className="relative flex h-full flex-col justify-between p-10 xl:p-14">
          <Link to="/" className="flex w-fit items-center gap-2.5 text-white" aria-label="Wanderlust home">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" />
              </svg>
            </span>
            <span className="font-display text-xl font-bold tracking-tight">Wanderlust</span>
          </Link>

          <div className="max-w-md">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-brand-200">
              Hotels · Resorts · Homestays
            </p>
            <h2 className="font-display text-3xl font-semibold leading-tight text-white xl:text-4xl">
              Your next great escape is one booking away.
            </h2>
            <p className="mt-4 text-sm text-sand-200">
              Real guest reviews, transparent pricing and handpicked, verified stays across India.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-4">
              {STATS.map((s) => (
                <div key={s.label} className="rounded-xl border border-white/10 bg-white/10 p-3 backdrop-blur">
                  <p className="font-display text-xl font-bold text-white">{s.value}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-sand-300">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <figure className="max-w-md">
            <blockquote className="text-sm italic leading-relaxed text-sand-200">
              “Wanderlust made planning our Goa trip effortless — the booking took under two minutes.”
            </blockquote>
            <figcaption className="mt-2 text-xs font-medium text-brand-200">
              Priya · Bengaluru · Verified guest
            </figcaption>
          </figure>
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex min-w-0 flex-1 items-center justify-center px-4 py-12 sm:px-8 lg:px-12">
        {children}
      </main>
    </div>
  );
}