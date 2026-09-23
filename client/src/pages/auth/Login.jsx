import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser } from '../../features/auth/authSlice';
import { loginSchema } from '../../validators/authSchemas';
import { Input } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import AuthLayout from '../../components/auth/AuthLayout';

export default function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { status } = useSelector((s) => s.auth);
  const [formError, setFormError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: location.state?.email || '', password: '' },
  });

  const onSubmit = async (values) => {
    setFormError('');
    const result = await dispatch(loginUser(values));
    if (result.meta.requestStatus === 'fulfilled') {
      const dest = location.state?.from || '/dashboard';
      navigate(dest, { replace: true });
    } else {
      setFormError(result.payload?.message || 'Login failed. Please check your credentials.');
    }
  };

  const loading = isSubmitting || status === 'loading';
  const justCreated = Boolean(location.state?.created);

  // One-click demo logins (seeded accounts)
  const [quickLoading, setQuickLoading] = useState(null);
  const demoLogin = async (role) => {
    setFormError('');
    setQuickLoading(role);
    const creds =
      role === 'owner'
        ? { email: 'owner@wanderlust.dev', password: 'password123' }
        : { email: 'guest@wanderlust.dev', password: 'password123' };
    const result = await dispatch(loginUser(creds));
    setQuickLoading(null);
    if (result.meta.requestStatus === 'fulfilled') {
      const userRole = result.payload?.user?.role;
      const dest = userRole === 'owner' ? '/owner' : userRole === 'admin' ? '/admin' : '/dashboard';
      navigate(dest, { replace: true });
    } else {
      setFormError(result.payload?.message || 'Demo login failed. Has the database been seeded?');
    }
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-sand-200 bg-white p-5 shadow-float sm:p-6">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-brand-glow">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18zm0 0c2.5-2.5 4-5.5 4-9a4 4 0 10-8 0c0 3.5 1.5 6.5 4 9z" />
              <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <h1 className="font-display text-xl font-bold text-ink-900">Welcome back</h1>
          <p className="mt-0.5 text-sm text-ink-500">Log in to manage your stays and bookings.</p>

          {justCreated && (
            <div className="mt-3 rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-sm text-green-700" role="status">
              ✅ Account created successfully! Log in to continue.
            </div>
          )}
          {formError && (
            <div className="mt-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3" noValidate>
            <Input label="Email" type="email" autoComplete="email" placeholder="you@example.com" className="input-compact" error={errors.email?.message} {...register('email')} />
            <Input label="Password" type="password" autoComplete="current-password" placeholder="••••••••" className="input-compact" error={errors.password?.message} {...register('password')} />
            <Button type="submit" size="sm" className="h-10 w-full" disabled={loading} loading={loading}>Log in</Button>
          </form>

          <div className="mt-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-sand-200" />
            <span className="text-[11px] font-medium uppercase tracking-wider text-ink-400">or try a demo</span>
            <span className="h-px flex-1 bg-sand-200" />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={loading}
              loading={quickLoading === 'guest'}
              onClick={() => demoLogin('guest')}
            >
              👤 Guest User
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={loading}
              loading={quickLoading === 'owner'}
              onClick={() => demoLogin('owner')}
            >
              🏨 Guest Owner
            </Button>
          </div>
          <p className="mt-1.5 text-center text-[11px] text-ink-400">
            One click into the customer dashboard or the owner's property manager.
          </p>

          <p className="mt-4 text-center text-sm text-ink-500">
            New to Wanderlust?{' '}
            <Link to="/auth/register" className="font-semibold text-brand-600 hover:text-brand-700">Create an account</Link>
          </p>
        </div>

        <div className="mt-3 rounded-xl border border-sand-200 bg-sand-100/80 px-3 py-2.5 text-[11px] leading-snug text-ink-600">
          <p>
            <span className="font-semibold text-ink-800">Demo accounts:</span>{' '}
            Admin <code className="rounded border border-sand-200 bg-white px-1 py-0.5">admin123@gmail.com</code> / <code className="rounded border border-sand-200 bg-white px-1 py-0.5">Admin@123</code>
          </p>
          <p className="mt-1">
            Guest <code className="rounded border border-sand-200 bg-white px-1 py-0.5">guest@wanderlust.dev</code> · Owner <code className="rounded border border-sand-200 bg-white px-1 py-0.5">owner@wanderlust.dev</code> · Password <code className="rounded border border-sand-200 bg-white px-1 py-0.5">password123</code>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
