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

  return (
    <AuthLayout>
      <div className="w-full max-w-lg">
        <div className="rounded-2xl border border-sand-200 bg-white p-8 shadow-float">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-brand-glow">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18zm0 0c2.5-2.5 4-5.5 4-9a4 4 0 10-8 0c0 3.5 1.5 6.5 4 9z" />
              <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Welcome back</h1>
          <p className="mt-1 text-sm text-ink-500">Log in to manage your stays and bookings.</p>

          {justCreated && (
            <div className="mt-4 rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700" role="status">
              ✅ Account created successfully! Log in to continue.
            </div>
          )}
          {formError && (
            <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
            <Input label="Email" type="email" autoComplete="email" placeholder="you@example.com" error={errors.email?.message} {...register('email')} />
            <Input label="Password" type="password" autoComplete="current-password" placeholder="••••••••" error={errors.password?.message} {...register('password')} />
            <Button type="submit" className="w-full" disabled={loading} loading={loading}>Log in</Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-500">
            New to Wanderlust?{' '}
            <Link to="/auth/register" className="font-semibold text-brand-600 hover:text-brand-700">Create an account</Link>
          </p>
        </div>

        <div className="mt-4 rounded-xl border border-sand-200 bg-sand-100/80 p-4 text-xs text-ink-600">
          <p className="font-semibold text-ink-800">Demo accounts (dev seed)</p>
          <p className="mt-1">Admin: <code className="rounded border border-sand-200 bg-white px-1 py-0.5">admin123@gmail.com</code> · <code className="rounded border border-sand-200 bg-white px-1 py-0.5">Admin@123</code></p>
          <p className="mt-1">guest@wanderlust.dev · owner@wanderlust.dev</p>
          <p>Password: <code className="rounded border border-sand-200 bg-white px-1 py-0.5">password123</code></p>
        </div>
      </div>
    </AuthLayout>
  );
}
