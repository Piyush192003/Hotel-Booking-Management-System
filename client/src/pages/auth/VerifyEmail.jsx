import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch, useSelector } from 'react-redux';
import { verifyEmail, resendVerification } from '../../features/auth/authSlice';
import { verifyEmailSchema } from '../../validators/authSchemas';
import { Input } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Loading';
import AuthLayout from '../../components/auth/AuthLayout';

const RESEND_COOLDOWN_SECONDS = 30;

/**
 * Email verification gate. Two entry paths:
 *  1. Link from the verification email: /auth/verify-email?token=...&email=... (auto-verifies)
 *  2. Redirect after signup: state { email, devCode } — user types the 6-digit code
 * The dev banner shows the code and (when SMTP is not configured) a link to the
 * Ethereal preview inbox where the actual email can be opened. "Resend code"
 * re-issues a fresh code even after a page refresh (state is recovered from Redux).
 * On success the user is sent to the login page (verification does not log them in).
 */
export default function VerifyEmail() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { devVerificationCode: storeCode, devEmailPreviewUrl: storePreviewUrl } = useSelector((s) => s.auth);

  const queryToken = params.get('token') || '';
  const queryEmail = params.get('email') || location.state?.email || '';
  const devCode = location.state?.devCode || storeCode || '';
  const previewUrl = location.state?.previewUrl || storePreviewUrl || '';

  const [formError, setFormError] = useState('');
  const [resentMessage, setResentMessage] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const [autoStatus, setAutoStatus] = useState(queryToken && queryEmail ? 'verifying' : 'idle');

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: { email: queryEmail, token: queryToken || devCode },
  });

  const onSubmit = async (values) => {
    setFormError('');
    const result = await dispatch(verifyEmail(values));
    if (result.meta.requestStatus === 'fulfilled') {
      navigate('/auth/login', { replace: true, state: { verified: true, email: values.email } });
    } else {
      setFormError(result.payload?.message || 'Email verification failed. Please try again.');
    }
  };

  const onResend = async () => {
    const email = getValues('email');
    setFormError('');
    setResentMessage('');
    if (!email) {
      setFormError('Enter your email address first, then resend the code.');
      return;
    }
    const result = await dispatch(resendVerification(email));
    if (result.meta.requestStatus === 'fulfilled') {
      if (result.payload?.alreadyVerified) {
        navigate('/auth/login', { replace: true, state: { verified: true, email } });
        return;
      }
      if (result.payload?.devVerificationCode) {
        setValue('token', result.payload.devVerificationCode, { shouldValidate: true });
        setResentMessage('A new code has been generated and sent.');
      } else {
        setResentMessage('If that email needs verification, a new code has been sent.');
      }
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } else {
      setFormError(result.payload?.message || 'Could not resend the code. Please try again.');
    }
  };

  // Cooldown ticker for the resend button.
  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // Auto-verify when arriving from the emailed link (token + email in the URL).
  const autoRan = useRef(false);
  useEffect(() => {
    if (autoRan.current || !queryToken || !queryEmail) return undefined;
    autoRan.current = true;
    dispatch(verifyEmail({ token: queryToken, email: queryEmail }))
      .then((result) => {
        if (result.meta.requestStatus === 'fulfilled') {
          setAutoStatus('success');
          setTimeout(() => {
            navigate('/auth/login', { replace: true, state: { verified: true, email: queryEmail } });
          }, 1200);
        } else {
          setAutoStatus('failed');
          setFormError(result.payload?.message || 'This verification link is invalid or has expired. Enter your code below.');
        }
      });
    return undefined;
  }, [dispatch, navigate, queryEmail, queryToken]);

  if (autoStatus === 'verifying' || autoStatus === 'success') {
    return (
      <AuthLayout>
        <div className="w-full max-w-lg rounded-2xl border border-sand-200 bg-white p-8 text-center shadow-float">
          {autoStatus === 'success' ? (
            <>
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600">
                <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>
              </div>
              <h1 className="font-display text-2xl font-bold text-ink-900">Email verified!</h1>
              <p className="mt-1 text-sm text-ink-500">Redirecting you to log in…</p>
            </>
          ) : (
            <Spinner label="Verifying your email" />
          )}
        </div>
      </AuthLayout>
    );
  }

  const loading = isSubmitting;

  return (
    <AuthLayout>
      <div className="w-full max-w-lg">
        <div className="rounded-2xl border border-sand-200 bg-white p-8 shadow-float">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-gradient text-white shadow-brand-glow">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-ink-900">Verify your email</h1>
          <p className="mt-1 text-sm text-ink-500">
            Enter the 6-digit code we emailed you to activate your account.
          </p>

          {devCode && (
            <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
              <p className="font-medium">Dev mode (no real SMTP configured) — your code:</p>
              <p className="mt-1 text-xl font-bold tracking-[0.3em] text-amber-900">{devCode}</p>
              {previewUrl && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 font-semibold text-amber-900 underline hover:text-amber-700"
                >
                  Open the emailed message (test inbox)
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H8m9 0v9" />
                  </svg>
                </a>
              )}
            </div>
          )}
          {resentMessage && (
            <div className="mt-4 rounded-lg border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700" role="status">{resentMessage}</div>
          )}
          {formError && (
            <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{formError}</div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
            <Input label="Email" type="email" autoComplete="email" placeholder="you@example.com" error={errors.email?.message} {...register('email')} />
            <Input label="Verification code" inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code" error={errors.token?.message} {...register('token')} />
            <Button type="submit" className="w-full" disabled={loading} loading={loading}>Verify email</Button>
          </form>

          <p className="mt-4 text-center text-sm text-ink-500">
            Didn&apos;t get the code?{' '}
            <button
              type="button"
              onClick={onResend}
              disabled={cooldown > 0 || loading}
              className="font-semibold text-brand-600 hover:text-brand-700 disabled:cursor-not-allowed disabled:text-ink-300"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
          </p>

          <p className="mt-4 text-center text-sm text-ink-500">
            Already verified?{' '}
            <Link to="/auth/login" className="font-semibold text-brand-600 hover:text-brand-700">Log in</Link>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
