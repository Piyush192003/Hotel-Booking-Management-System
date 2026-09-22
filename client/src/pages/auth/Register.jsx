import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser } from '../../features/auth/authSlice';
import { registerSchema } from '../../validators/authSchemas';
import { Input } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import AuthLayout from '../../components/auth/AuthLayout';

export default function Register() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { status } = useSelector((s) => s.auth);
  const [formError, setFormError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '', role: 'customer', phone: '' },
  });

  const onSubmit = async (values) => {
    setFormError('');
    const payload = { ...values };
    delete payload.confirmPassword;
    const result = await dispatch(registerUser(payload));
    if (result.meta.requestStatus === 'fulfilled') {
      // Email verification is disabled for now: signup → login directly.
      navigate('/auth/login', {
        replace: true,
        state: { email: values.email, created: true },
      });
    } else {
      setFormError(result.payload?.message || 'Registration failed. Please try again.');
    }
  };

  const loading = isSubmitting || status === 'loading';

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
          <h1 className="font-display text-2xl font-bold text-ink-900">Create your account</h1>
          <p className="mt-1 text-sm text-ink-500">Join Wanderlust to book stays and track trips.</p>

          {formError && (
            <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{formError}</div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
            <Input label="Full name" autoComplete="name" placeholder="Aarav Sharma" error={errors.name?.message} {...register('name')} />
            <Input label="Email" type="email" autoComplete="email" placeholder="you@example.com" error={errors.email?.message} {...register('email')} />
            <Input label="Phone (optional)" autoComplete="tel" placeholder="+91 98765 43210" error={errors.phone?.message} {...register('phone')} />
            <Input label="Password" type="password" autoComplete="new-password" placeholder="Min 8 characters" error={errors.password?.message} {...register('password')} />
            <Input label="Confirm password" type="password" autoComplete="new-password" placeholder="Repeat password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />

            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-ink-700">I want to</legend>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-ink-200 px-3 py-2.5 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
                  <input type="radio" value="customer" {...register('role')} className="accent-brand-600" />
                  Book stays
                </label>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-ink-200 px-3 py-2.5 text-sm has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
                  <input type="radio" value="owner" {...register('role')} className="accent-brand-600" />
                  List my property
                </label>
              </div>
            </fieldset>

            <Button type="submit" className="w-full" disabled={loading} loading={loading}>Create account</Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-500">
            Already have an account?{' '}
            <Link to="/auth/login" className="font-semibold text-brand-600 hover:text-brand-700">Log in</Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
