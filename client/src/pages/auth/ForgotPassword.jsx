import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch } from 'react-redux';
import { forgotPassword } from '../../features/auth/authSlice';
import { forgotPasswordSchema } from '../../validators/authSchemas';
import { Input } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import AuthLayout from '../../components/auth/AuthLayout';

export default function ForgotPassword() {
  const dispatch = useDispatch();
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: '' } });

  const onSubmit = async (values) => {
    setFormError('');
    const result = await dispatch(forgotPassword(values.email));
    if (result.meta.requestStatus === 'fulfilled') {
      setDone(true);
    } else {
      setFormError(result.payload?.message || 'Request failed. Please try again.');
    }
  };

  return (
    <AuthLayout>
      <div className="w-full max-w-lg">
        <div className="rounded-2xl border border-sand-200 bg-white p-8 shadow-float">
          <h1 className="font-display text-2xl font-bold text-ink-900">Forgot password?</h1>
          <p className="mt-1 text-sm text-ink-500">Enter your email and we'll send a reset link.</p>

          {formError && (
            <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {formError}
            </div>
          )}

          {done ? (
            <div className="mt-6 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">
              If an account exists for that email, a reset link has been sent. Check your inbox.
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
              <Input label="Email" type="email" autoComplete="email" placeholder="you@example.com" error={errors.email?.message} {...register('email')} />
              <Button type="submit" className="w-full" disabled={isSubmitting} loading={isSubmitting}>
                Send reset link
              </Button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-ink-500">
            Remember your password?{' '}
            <Link to="/auth/login" className="font-semibold text-brand-600 hover:text-brand-700">Log in</Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
