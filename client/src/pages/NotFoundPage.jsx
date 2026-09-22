import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="relative flex min-h-[60vh] flex-col items-center justify-center overflow-hidden px-4 py-20 text-center">
      <div className="absolute inset-0 bg-gradient-to-br from-brand-50 via-sand-100 to-sand-50" />
      <div className="absolute -top-16 -left-16 h-56 w-56 rounded-full bg-brand-100/40 blur-3xl" />
      <div className="absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-sand-200/50 blur-3xl" />
      <div className="relative z-10">
        <p className="font-display text-8xl font-extrabold text-brand-600">404</p>
        <h1 className="mt-4 font-display text-2xl font-bold text-ink-900">Page not found</h1>
        <p className="mt-2 max-w-md text-ink-500">
          The page you are looking for doesn&apos;t exist or may have moved.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-brand-gradient px-5 py-2.5 text-sm font-semibold text-white shadow-brand-glow hover:brightness-110"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
