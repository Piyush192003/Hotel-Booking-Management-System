import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch } from 'react-redux';
import { resetPassword } from '../../features/auth/authSlice';
import { resetPasswordSchema } from '../../validators/authSchemas';
import { Input } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import AuthLayout from '../../components/auth/AuthLayout';

export default function ResetPassword() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState('');
  const token = params.get('token') || '';
  const email = params.get('email') || '';
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(resetPasswordSchema), defaultValues: { password: '', confirmPassword: '' } });

  const onSubmit = async (values) => {
    setFormError('');
    const result = await dispatch(resetPassword({ token, password: values.password }));
    if (result.meta.requestStatus === 'fulfilled') {
      setDone(true);
    } else {
      setFormError(result.payload?.message || 'Password reset failed. Please try again.');
    }
  };

  if (!token) {
    return (
      <AuthLayout>
        <div className="w-full max-w-lg rounded-2xl border border-sand-200 bg-white p-8 text-center shadow-float">
          <h1 className="font-display text-2xl font-bold text-ink-900">Invalid reset link</h1>
          <p className="mt-2 text-sm text-ink-500">This password reset link is missing or has expired.</p>
          <Link to="/auth/forgot-password" className="mt-4 inline-block text-sm font-semibold text-brand-600 hover:text-brand-700">
            Request a new link
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-lg">
        <div className="rounded-2xl border border-sand-200 bg-white p-8 shadow-float">
          <h1 className="font-display text-2xl font-bold text-ink-900">Set a new password</h1>
          <p className="mt-1 text-sm text-ink-500">Choose a strong password for your account.</p>

          {formError && (
            <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {formError}
            </div>
          )}

          {done ? (
            <div className="mt-6 space-y-4">
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">
                Password updated successfully.
              </div>
              <Button type="button" className="w-full" onClick={() => navigate('/auth/login', { replace: true })}>
                Log in with new password
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
              {email && <p className="text-xs text-ink-500">Resetting password for <strong>{email}</strong></p>}
              <Input label="New password" type="password" autoComplete="new-password" placeholder="Min 8 characters" error={errors.password?.message} {...register('password')} />
              <Input label="Confirm new password" type="password" autoComplete="new-password" placeholder="Repeat password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
              <Button type="submit" className="w-full" disabled={isSubmitting} loading={isSubmitting}>
                Update password
              </Button>
            </form>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}
