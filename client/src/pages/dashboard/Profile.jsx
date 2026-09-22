import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useDispatch, useSelector } from 'react-redux';
import { updateProfile, changePassword } from '../../features/auth/authSlice';
import { updateProfileSchema, changePasswordSchema } from '../../validators/authSchemas';
import { Input } from '../../components/ui/Field';
import Button from '../../components/ui/Button';
import { titleCase } from '../../utils/format';

export default function Profile() {
  const dispatch = useDispatch();
  const { user, actionStatus, actionError } = useSelector((s) => s.auth);
  const [profileMsg, setProfileMsg] = useState('');
  const [pwMsg, setPwMsg] = useState('');

  const profileForm = useForm({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name: user?.name || '', phone: user?.phone || '' },
  });

  const pwForm = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', password: '', confirmPassword: '' },
  });

  const onProfile = async (values) => {
    setProfileMsg('');
    const result = await dispatch(updateProfile(values));
    if (result.meta.requestStatus === 'fulfilled') setProfileMsg('Profile updated successfully.');
  };

  const onPassword = async (values) => {
    setPwMsg('');
    const result = await dispatch(changePassword({ currentPassword: values.currentPassword, password: values.password }));
    if (result.meta.requestStatus === 'fulfilled') {
      setPwMsg('Password changed successfully.');
      pwForm.reset({ currentPassword: '', password: '', confirmPassword: '' });
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card-base p-6">
        <h3 className="font-display text-base font-bold text-ink-900">Profile details</h3>
        <p className="mt-1 text-sm text-ink-500">Signed in as <strong>{user?.email}</strong> · {titleCase(user?.role)}</p>
        {profileMsg && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">{profileMsg}</p>}
        {actionError && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{actionError}</p>}
        <form onSubmit={profileForm.handleSubmit(onProfile)} className="mt-4 space-y-4" noValidate>
          <Input label="Full name" error={profileForm.formState.errors.name?.message} {...profileForm.register('name')} />
          <Input label="Phone" error={profileForm.formState.errors.phone?.message} {...profileForm.register('phone')} />
          <Button type="submit" disabled={actionStatus === 'loading'} loading={actionStatus === 'loading'}>Save changes</Button>
        </form>
      </div>

      <div className="card-base p-6">
        <h3 className="font-display text-base font-bold text-ink-900">Change password</h3>
        <p className="mt-1 text-sm text-ink-500">Use at least 8 characters.</p>
        {pwMsg && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">{pwMsg}</p>}
        <form onSubmit={pwForm.handleSubmit(onPassword)} className="mt-4 space-y-4" noValidate>
          <Input label="Current password" type="password" autoComplete="current-password" error={pwForm.formState.errors.currentPassword?.message} {...pwForm.register('currentPassword')} />
          <Input label="New password" type="password" autoComplete="new-password" error={pwForm.formState.errors.password?.message} {...pwForm.register('password')} />
          <Input label="Confirm new password" type="password" autoComplete="new-password" error={pwForm.formState.errors.confirmPassword?.message} {...pwForm.register('confirmPassword')} />
          <Button type="submit" disabled={actionStatus === 'loading'} loading={actionStatus === 'loading'}>Update password</Button>
        </form>
      </div>
    </div>
  );
}
