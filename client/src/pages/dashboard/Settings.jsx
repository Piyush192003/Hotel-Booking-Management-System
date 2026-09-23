import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import { Input, Select, Textarea } from '../../components/ui/Field';
import { Spinner } from '../../components/ui/Loading';
import apiClient, {
  apiGet,
  apiPatch,
  apiPost,
  clearAccessToken,
  getApiErrorMessage,
  storeAccessToken,
} from '../../services/apiClient';
import { logoutUser, setUser } from '../../features/auth/authSlice';
import { toast } from '../../store/uiSlice';
import { cn } from '../../utils/cn';
import { formatDate, formatDateTime } from '../../utils/format';

const ALL = ['customer', 'owner', 'admin'];

/** Role-aware tab bar — each tab only appears for the roles that can use it. */
const TABS = [
  { id: 'account', label: 'Account', roles: ALL },
  { id: 'preferences', label: 'Preferences', roles: ALL },
  { id: 'notifications', label: 'Notifications', roles: ALL },
  { id: 'privacy', label: 'Privacy', roles: ALL },
  { id: 'booking', label: 'Booking & travel', roles: ['customer'] },
  { id: 'business', label: 'Business', roles: ['owner'] },
  { id: 'platform', label: 'Platform', roles: ['admin'] },
  { id: 'security', label: 'Security', roles: ALL },
];

const EMAIL_GROUPS = [
  {
    title: 'Bookings & trips',
    items: [
      ['bookingConfirmation', 'Booking confirmations', 'Sent when a reservation is confirmed'],
      ['bookingModification', 'Booking changes', 'Date or guest-count changes'],
      ['bookingCancellation', 'Cancellations & refunds', 'Cancellation receipts and refund status'],
    ],
  },
  {
    title: 'Payments',
    items: [
      ['paymentConfirmation', 'Payment receipts', 'Invoice for every successful payment'],
      ['refundUpdates', 'Refund updates', 'When a refund is initiated and settled'],
    ],
  },
  {
    title: 'Platform',
    items: [
      ['reviews', 'Review reminders', 'Ask to review stays you completed'],
      ['promotional', 'Offers & promotions', 'Seasonal deals — can be turned off anytime'],
      ['securityAlerts', 'Security alerts', 'New sign-ins and password changes', true],
    ],
  },
];

const IN_APP_GROUPS = [
  {
    title: 'Stays & payments',
    items: [
      ['bookingUpdates', 'Booking updates', 'Confirmations, changes and check-in reminders'],
      ['paymentUpdates', 'Payment activity', 'Receipts, refunds and payout notices'],
    ],
  },
  {
    title: 'Platform',
    items: [
      ['hotelUpdates', 'Property updates', 'Wishlist price drops and property news'],
      ['systemAnnouncements', 'Announcements', 'New features and maintenance windows'],
    ],
  },
];

/** Compact settings card used by every panel. */
function Section({ title, description, children, footer }) {
  return (
    <section className="rounded-2xl border border-sand-200 bg-white p-5 shadow-card sm:p-6">
      <h2 className="font-display text-base font-semibold text-ink-900">{title}</h2>
      {description && <p className="mt-1 text-sm text-ink-500">{description}</p>}
      <div className="mt-4 space-y-4">{children}</div>
      {footer && <div className="mt-5 flex justify-end gap-3 border-t border-sand-100 pt-4">{footer}</div>}
    </section>
  );
}

function Toggle({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={Boolean(checked)}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
        'disabled:cursor-not-allowed disabled:opacity-60',
        checked ? 'bg-brand-600' : 'bg-ink-200',
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}

/** Label + description on the left, toggle (+ optional badge) on the right. */
function ToggleRow({ label, hint, checked, onChange, disabled, badge }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-sand-100 py-3 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink-800">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-ink-500">{hint}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {badge && (
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-700">
            {badge}
          </span>
        )}
        <Toggle checked={checked} onChange={onChange} disabled={disabled} />
      </div>
    </div>
  );
}

function Pill({ tone = 'neutral', children }) {
  const tones = {
    neutral: 'bg-ink-100 text-ink-700',
    good: 'bg-emerald-50 text-emerald-700',
    warn: 'bg-amber-50 text-amber-700',
    bad: 'bg-red-50 text-red-700',
  };
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold', tones[tone])}>
      {children}
    </span>
  );
}

/** Small label/value tile used by the login-security panel. */
function Info({ label, value }) {
  return (
    <div className="rounded-xl bg-sand-50 p-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-ink-400">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-ink-800">{value}</p>
    </div>
  );
}

export default function Settings() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);
  const role = user?.role || 'customer';
  const visibleTabs = TABS.filter((t) => t.roles.includes(role));
  const [tab, setTab] = useState('account');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [security, setSecurity] = useState(null);
  const [ownerCtx, setOwnerCtx] = useState(null);
  const [platform, setPlatform] = useState(null);

  const [profile, setProfile] = useState({ name: '', email: '', phone: '', dateOfBirth: '', gender: '', avatar: '', address: { line1: '', city: '', state: '', country: '', postalCode: '' } });
  const [prefs, setPrefs] = useState({ currency: 'INR', language: 'en', theme: 'system' });
  const [emailN, setEmailN] = useState({ securityAlerts: true });
  const [inAppN, setInAppN] = useState({});
  const [privacy, setPrivacy] = useState({});
  const [bookingPref, setBookingPref] = useState({});
  const [travelPref, setTravelPref] = useState({ amenities: [], locationTypes: [] });
  const [business, setBusiness] = useState({});

  const [pwOpen, setPwOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [deactOpen, setDeactOpen] = useState(false);
  const [delForm, setDelForm] = useState({ password: '', confirm: '', reason: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', password: '', confirm: '' });

  const hydrate = (payload) => {
    const u = payload.user || {};
    const p = u.preferences || {};
    setProfile({
      name: u.name || '',
      email: u.email || '',
      phone: u.phone || '',
      dateOfBirth: u.dateOfBirth ? String(u.dateOfBirth).slice(0, 10) : '',
      gender: u.gender || '',
      avatar: u.avatar || '',
      address: { line1: '', city: '', state: '', country: '', postalCode: '', ...(u.address || {}) },
    });
    setPrefs({ currency: p.currency || 'INR', language: p.language || 'en', theme: p.theme || 'system' });
    setEmailN({
      bookingConfirmation: true, bookingCancellation: true, bookingModification: true,
      paymentConfirmation: true, refundUpdates: true, promotional: true, reviews: true,
      ...(p.emailNotifications || {}), securityAlerts: true,
    });
    setInAppN({ bookingUpdates: true, hotelUpdates: true, paymentUpdates: true, systemAnnouncements: true, ...(p.inAppNotifications || {}) });
    setPrivacy({
      profileVisibility: 'private', showPhoto: true, shareWithOwners: true,
      marketing: true, personalization: true, dataSharing: false, ...(p.privacy || {}),
    });
    setBookingPref({
      roomType: '', bedType: '', smoking: 'non_smoking', accessibility: '',
      checkInPreference: '', checkOutPreference: '', guests: 2, specialRequests: '',
      ...(p.bookingPreferences || {}),
    });
    setTravelPref({
      hotelCategory: '', amenities: [], locationTypes: [], budgetMin: 0, budgetMax: 0,
      breakfast: 'no_preference', ...(p.travelPreferences || {}),
    });
    setBusiness({
      businessName: '', businessEmail: '', businessPhone: '', address: '', city: '', state: '',
      country: 'India', description: '', timezone: 'Asia/Kolkata', defaultCurrency: 'INR',
      taxPercent: 0, invoicePrefix: 'INV', notifyEmail: '', autoConfirmBookings: false,
      requireApproval: true, minNights: 1, maxNights: 30, advanceBookingDays: 365,
      sameDayBooking: true, payoutSchedule: 'weekly', payoutThreshold: 1000,
      payoutMethod: 'bank_transfer', ...(p.business || {}),
    });
    setSecurity(payload.security || null);
    setOwnerCtx(payload.owner || null);
    setPlatform(payload.platform || null);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await apiGet('/settings');
        if (alive) hydrate(data);
      } catch (e) {
        toast(getApiErrorMessage(e, 'Could not load settings'), 'error');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const save = async (patch, msg = 'Settings saved') => {
    setSaving(true);
    try {
      const { data } = await apiPatch('/settings', patch);
      if (data?.user) dispatch(setUser(data.user));
      toast(msg, 'success');
    } catch (e) {
      toast(getApiErrorMessage(e, 'Could not save settings'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveBusiness = async () => {
    setSaving(true);
    try {
      const { data } = await apiPatch('/settings/owner/business', { business });
      if (data?.user) dispatch(setUser(data.user));
      toast('Business settings saved', 'success');
    } catch (e) {
      toast(getApiErrorMessage(e, 'Could not save business settings'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const savePlatform = async () => {
    setSaving(true);
    try {
      const { data } = await apiPatch('/settings/platform', platform);
      if (data?.platform) setPlatform(data.platform);
      toast('Platform settings saved', 'success');
    } catch (e) {
      toast(getApiErrorMessage(e, 'Could not save platform settings'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const doLogoutAll = async () => {
    setBusy(true);
    try {
      const { data } = await apiPost('/settings/logout-all', {});
      if (data?.tokens?.accessToken) storeAccessToken(data.tokens.accessToken);
      toast('Signed out of all other devices', 'success');
    } catch (e) {
      toast(getApiErrorMessage(e, 'Could not sign out other devices'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const doExport = async () => {
    try {
      const res = await apiClient.get('/settings/export', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wanderlust-data-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast('Your data export has been downloaded', 'success');
    } catch (e) {
      toast(getApiErrorMessage(e, 'Export failed'), 'error');
    }
  };

  const doDelete = async () => {
    if (delForm.confirm !== 'DELETE') {
      toast('Type DELETE to confirm', 'error');
      return;
    }
    setBusy(true);
    try {
      await apiPost('/settings/delete-account', { password: delForm.password, confirm: 'DELETE', reason: delForm.reason });
      clearAccessToken();
      await dispatch(logoutUser());
      navigate('/auth/login');
    } catch (e) {
      toast(getApiErrorMessage(e, 'Account deletion failed'), 'error');
      setBusy(false);
    }
  };

  const doDeactivate = async () => {
    setBusy(true);
    try {
      await apiPost('/settings/deactivate-owner', {});
      setDeactOpen(false);
      toast('Your properties are now deactivated and hidden from search', 'success');
      const { data } = await apiGet('/settings');
      hydrate(data);
    } catch (e) {
      toast(getApiErrorMessage(e, 'Could not deactivate properties'), 'error');
    } finally {
      setBusy(false);
    }
  };

  const asList = (v) => (Array.isArray(v) ? v : String(v || '').split(',').map((s) => s.trim()).filter(Boolean));

  const doPassword = async () => {
    if (pwForm.password !== pwForm.confirm) {
      toast('New passwords do not match', 'error');
      return;
    }
    setBusy(true);
    try {
      await apiPost('/auth/change-password', { currentPassword: pwForm.currentPassword, password: pwForm.password });
      setPwOpen(false);
      setPwForm({ currentPassword: '', password: '', confirm: '' });
      toast('Password updated — other devices stay signed in', 'success');
    } catch (e) {
      toast(getApiErrorMessage(e, 'Password change failed'), 'error');
    } finally {
      setBusy(false);
    }
  };

  // ---- Aliases + derived values used by the tabs below ----
  const isCustomer = role === 'customer';
  const isOwner = role === 'owner';
  const isAdmin = role === 'admin';
  const sec = security || {};
  const pw = pwForm;
  const setPw = setPwForm;
  const onPassword = (e) => { e.preventDefault(); doPassword(); };
  const onLogoutOthers = doLogoutAll;
  const onExport = doExport;
  const onDownloadExport = doExport;
  const onDelete = doDelete;
  const onDeactivate = doDeactivate;
  const deleteOpen = delOpen;
  const setDeleteOpen = setDelOpen;
  const exportOpen = false;
  const setExportOpen = () => {};
  const exportData = null;
  const delPassword = delForm.password;
  const setDelPassword = (v) => setDelForm({ ...delForm, password: v });
  const delReason = delForm.reason;
  const setDelReason = (v) => setDelForm({ ...delForm, reason: v });
  const general = platform?.general || {};
  const setGeneral = (g) => setPlatform({ ...(platform || {}), general: g });
  const payments = platform?.payments || {};
  const setPayments = (p) => setPlatform({ ...(platform || {}), payments: p });
  const recommendations = platform?.recommendations || {};
  const setRecommendations = (r) => setPlatform({ ...(platform || {}), recommendations: r });
  if (loading) return <Spinner label="Loading settings" className="min-h-[40vh]" />;

  const saveBtn = (onClick, label = 'Save changes') => (
    <Button variant="primary" type="button" disabled={saving || busy} onClick={onClick}>
      {saving ? 'Saving…' : label}
    </Button>
  );

  const saveAccount = () => save({
    name: profile.name,
    phone: profile.phone,
    dateOfBirth: profile.dateOfBirth,
    gender: profile.gender,
    avatar: profile.avatar,
    address: profile.address,
  }, 'Profile saved');

  const savePrefs = () => save(prefs, 'Preferences saved');
  const saveNotifications = () => save({ emailNotifications: emailN, inAppNotifications: inAppN }, 'Notification preferences saved');
  const savePrivacy = () => save({ privacy }, 'Privacy settings saved');
  const saveBooking = () => save({
    bookingPreferences: bookingPref,
    travelPreferences: {
      ...travelPref,
      amenities: asList(travelPref.amenities),
      locationTypes: asList(travelPref.locationTypes),
    },
  }, 'Booking preferences saved');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900">Settings</h1>
          <p className="mt-1 text-sm text-ink-500">
            Manage your profile, notifications, security and role-specific preferences in one place.
          </p>
        </div>
        <Pill tone="neutral">{role}</Pill>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-sand-200 pb-2" role="tablist" aria-label="Settings sections">
        {visibleTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-semibold transition',
              tab === t.id ? 'bg-brand-600 text-white shadow-brand-glow' : 'text-ink-600 hover:bg-sand-100',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'account' && (
        <Section
          title="Account"
          description="Your personal details, used across bookings and receipts."
          footer={saveBtn(saveAccount)}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Full name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required />
            <Input label="Email" value={profile.email} disabled hint="Contact support to change your sign-in email" />
            <Input label="Phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="+91 98765 43210" />
            <Input label="Date of birth" type="date" value={profile.dateOfBirth} onChange={(e) => setProfile({ ...profile, dateOfBirth: e.target.value })} />
            <Select label="Gender" value={profile.gender} onChange={(e) => setProfile({ ...profile, gender: e.target.value })}>
              <option value="">Prefer not to say</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="non_binary">Non-binary</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </Select>
            <Input label="Avatar URL" value={profile.avatar} onChange={(e) => setProfile({ ...profile, avatar: e.target.value })} placeholder="https://…" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Address" value={profile.address.line1} onChange={(e) => setProfile({ ...profile, address: { ...profile.address, line1: e.target.value } })} />
            <Input label="City" value={profile.address.city} onChange={(e) => setProfile({ ...profile, address: { ...profile.address, city: e.target.value } })} />
            <Input label="State" value={profile.address.state} onChange={(e) => setProfile({ ...profile, address: { ...profile.address, state: e.target.value } })} />
            <Input label="Country" value={profile.address.country} onChange={(e) => setProfile({ ...profile, address: { ...profile.address, country: e.target.value } })} />
            <Input label="Postal code" value={profile.address.postalCode} onChange={(e) => setProfile({ ...profile, address: { ...profile.address, postalCode: e.target.value } })} />
          </div>
        </Section>
      )}

      {tab === 'preferences' && (
        <Section
          title="Preferences"
          description="How the app looks and formats amounts for you."
          footer={saveBtn(savePrefs)}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Select label="Currency" value={prefs.currency} onChange={(e) => setPrefs({ ...prefs, currency: e.target.value })}>
              {['INR', 'USD', 'EUR', 'GBP', 'AED'].map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Select label="Language" value={prefs.language} onChange={(e) => setPrefs({ ...prefs, language: e.target.value })}>
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
              <option value="mr">मराठी</option>
            </Select>
            <Select label="Theme" value={prefs.theme} onChange={(e) => setPrefs({ ...prefs, theme: e.target.value })}>
              <option value="system">Match system</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </Select>
          </div>
        </Section>
      )}

      {tab === 'notifications' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Email notifications" description="Choose what lands in your inbox." footer={saveBtn(saveNotifications)}>
            {EMAIL_GROUPS.map((g) => (
              <div key={g.title}>
                <p className="text-xs font-bold uppercase tracking-wide text-ink-400">{g.title}</p>
                <div className="mt-1">
                  {g.items.map(([key, label, hint, locked]) => (
                    <ToggleRow
                      key={key}
                      label={label}
                      hint={hint}
                      checked={Boolean(emailN[key])}
                      disabled={locked || saving}
                      badge={locked ? 'Always on' : undefined}
                      onChange={(v) => setEmailN({ ...emailN, [key]: v })}
                    />
                  ))}
                </div>
              </div>
            ))}
          </Section>
          <Section title="In-app notifications" description="Badges and updates inside the app." footer={saveBtn(saveNotifications)}>
            {IN_APP_GROUPS.map((g) => (
              <div key={g.title}>
                <p className="text-xs font-bold uppercase tracking-wide text-ink-400">{g.title}</p>
                <div className="mt-1">
                  {g.items.map(([key, label, hint]) => (
                    <ToggleRow
                      key={key}
                      label={label}
                      hint={hint}
                      checked={Boolean(inAppN[key])}
                      disabled={saving}
                      onChange={(v) => setInAppN({ ...inAppN, [key]: v })}
                    />
                  ))}
                </div>
              </div>
            ))}
          </Section>
        </div>
      )}

      {tab === 'privacy' && (
        <Section title="Privacy & data" description="Control who sees your profile and how your data is used." footer={saveBtn(savePrivacy)}>
          <Select
            label="Profile visibility"
            hint="Who can see your name and photo on reviews you've written"
            value={privacy.profileVisibility || 'private'}
            onChange={(e) => setPrivacy({ ...privacy, profileVisibility: e.target.value })}
          >
            <option value="private">Only me (reviews show a first name)</option>
            <option value="owners">Property owners of my bookings</option>
            <option value="public">Anyone</option>
          </Select>
          <div>
            <ToggleRow label="Show my photo on reviews" hint="Applies when your profile is visible" checked={Boolean(privacy.showPhoto)} disabled={saving} onChange={(v) => setPrivacy({ ...privacy, showPhoto: v })} />
            <ToggleRow label="Share details with property owners" hint="Owners of hotels you book see your contact info for the stay" checked={Boolean(privacy.shareWithOwners)} disabled={saving} onChange={(v) => setPrivacy({ ...privacy, shareWithOwners: v })} />
            <ToggleRow label="Marketing emails" hint="Deals, newsletters and partner offers" checked={Boolean(privacy.marketing)} disabled={saving} onChange={(v) => setPrivacy({ ...privacy, marketing: v })} />
            <ToggleRow label="Personalised recommendations" hint="Use my searches and bookings to tailor suggestions" checked={Boolean(privacy.personalization)} disabled={saving} onChange={(v) => setPrivacy({ ...privacy, personalization: v })} />
            <ToggleRow label="Share analytics with partners" hint="Off by default — aggregated usage data only" checked={Boolean(privacy.dataSharing)} disabled={saving} onChange={(v) => setPrivacy({ ...privacy, dataSharing: v })} />
          </div>
        </Section>
      )}

      {tab === 'booking' && (
        <div className="space-y-6">
          <Section title="Booking preferences" description="Pre-filled on the checkout page for faster booking." footer={saveBtn(saveBooking)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Preferred room type" value={bookingPref.roomType || ''} onChange={(e) => setBookingPref({ ...bookingPref, roomType: e.target.value })}>
                <option value="">No preference</option>
                {['standard', 'deluxe', 'suite', 'family', 'studio'].map((t) => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
              </Select>
              <Select label="Preferred bed type" value={bookingPref.bedType || ''} onChange={(e) => setBookingPref({ ...bookingPref, bedType: e.target.value })}>
                <option value="">No preference</option>
                {['king', 'queen', 'twin', 'double'].map((t) => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
              </Select>
              <Select label="Smoking" value={bookingPref.smoking || 'non_smoking'} onChange={(e) => setBookingPref({ ...bookingPref, smoking: e.target.value })}>
                <option value="non_smoking">Non-smoking room</option>
                <option value="smoking">Smoking room</option>
                <option value="no_preference">No preference</option>
              </Select>
              <Input label="Accessibility needs" value={bookingPref.accessibility || ''} onChange={(e) => setBookingPref({ ...bookingPref, accessibility: e.target.value })} placeholder="e.g. ground floor, wheelchair access" />
              <Select label="Typical check-in time" value={bookingPref.checkInPreference || ''} onChange={(e) => setBookingPref({ ...bookingPref, checkInPreference: e.target.value })}>
                <option value="">No preference</option>
                <option value="afternoon">Afternoon (14:00–18:00)</option>
                <option value="evening">Evening (18:00–22:00)</option>
                <option value="late">Late night (after 22:00)</option>
              </Select>
              <Select label="Typical check-out time" value={bookingPref.checkOutPreference || ''} onChange={(e) => setBookingPref({ ...bookingPref, checkOutPreference: e.target.value })}>
                <option value="">No preference</option>
                <option value="morning">Morning (before 11:00)</option>
                <option value="midday">Midday (11:00–14:00)</option>
              </Select>
              <Input label="Usual number of guests" type="number" min={1} max={20} value={bookingPref.guests ?? 2} onChange={(e) => setBookingPref({ ...bookingPref, guests: Number(e.target.value) })} />
            </div>
            <Textarea label="Special requests" rows={3} value={bookingPref.specialRequests || ''} onChange={(e) => setBookingPref({ ...bookingPref, specialRequests: e.target.value })} placeholder="Late arrival, extra towels, dietary needs…" hint="Shared with the hotel when you book" />
          </Section>

          <Section title="Travel preferences" description="Helps us recommend the right stays." footer={saveBtn(saveBooking)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label="Hotel category" value={travelPref.hotelCategory || ''} onChange={(e) => setTravelPref({ ...travelPref, hotelCategory: e.target.value })}>
                <option value="">Any</option>
                {['budget', '3', '4', '5'].map((v) => <option key={v} value={v}>{v === 'budget' ? 'Budget' : `${v}★ & above`}</option>)}
              </Select>
              <Select label="Breakfast" value={travelPref.breakfast || 'no_preference'} onChange={(e) => setTravelPref({ ...travelPref, breakfast: e.target.value })}>
                <option value="no_preference">No preference</option>
                <option value="included">Included</option>
                <option value="not_included">Not included</option>
              </Select>
              <Input label="Budget per night (min ₹)" type="number" min={0} value={travelPref.budgetMin ?? 0} onChange={(e) => setTravelPref({ ...travelPref, budgetMin: Number(e.target.value) })} />
              <Input label="Budget per night (max ₹)" type="number" min={0} value={travelPref.budgetMax ?? 0} onChange={(e) => setTravelPref({ ...travelPref, budgetMax: Number(e.target.value) })} />
              <Input label="Must-have amenities" value={asList(travelPref.amenities).join(', ')} onChange={(e) => setTravelPref({ ...travelPref, amenities: e.target.value })} placeholder="wifi, pool, parking" hint="Comma-separated" />
              <Input label="Location types" value={asList(travelPref.locationTypes).join(', ')} onChange={(e) => setTravelPref({ ...travelPref, locationTypes: e.target.value })} placeholder="beach, city-center, hillstation" hint="Comma-separated" />
            </div>
          </Section>
        </div>
      )}

      {tab === 'business' && ownerCtx && (
        <div className="space-y-6">
          <Section title="Business profile" description="Shown on invoices and booking receipts." footer={saveBtn(saveBusiness, 'Save business settings')}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Business name" value={business.businessName || ''} onChange={(e) => setBusiness({ ...business, businessName: e.target.value })} />
              <Input label="Notification email" type="email" value={business.notifyEmail || business.businessEmail || ''} onChange={(e) => setBusiness({ ...business, notifyEmail: e.target.value })} placeholder="ops@yourbusiness.com" />
              <Input label="Business phone" value={business.businessPhone || ''} onChange={(e) => setBusiness({ ...business, businessPhone: e.target.value })} />
              <Input label="Tax percent (%)" type="number" min={0} max={50} value={business.taxPercent ?? 0} onChange={(e) => setBusiness({ ...business, taxPercent: Number(e.target.value) })} />
              <Input label="Address" value={business.address || ''} onChange={(e) => setBusiness({ ...business, address: e.target.value })} />
              <Input label="City" value={business.city || ''} onChange={(e) => setBusiness({ ...business, city: e.target.value })} />
              <Input label="State" value={business.state || ''} onChange={(e) => setBusiness({ ...business, state: e.target.value })} />
              <Input label="Invoice prefix" value={business.invoicePrefix || 'INV'} onChange={(e) => setBusiness({ ...business, invoicePrefix: e.target.value })} hint="e.g. INV → INV-2026-0042" />
              <Input label="Timezone" value={business.timezone || 'Asia/Kolkata'} onChange={(e) => setBusiness({ ...business, timezone: e.target.value })} />
            </div>
            <Textarea label="Business description" rows={3} value={business.description || ''} onChange={(e) => setBusiness({ ...business, description: e.target.value })} />
          </Section>

          <Section title="Booking rules" description="Applied to new reservations across your properties." footer={saveBtn(saveBusiness)}>
            <div>
              <ToggleRow label="Auto-confirm bookings" hint="Skip manual approval — instantly confirm every valid reservation" checked={Boolean(business.autoConfirmBookings)} disabled={saving} onChange={(v) => setBusiness({ ...business, autoConfirmBookings: v })} />
              <ToggleRow label="Same-day bookings" hint="Allow reservations that start tonight" checked={business.sameDayBooking !== false} disabled={saving} onChange={(v) => setBusiness({ ...business, sameDayBooking: v })} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Input label="Min nights" type="number" min={1} max={30} value={business.minNights ?? 1} onChange={(e) => setBusiness({ ...business, minNights: Number(e.target.value) })} />
              <Input label="Max nights" type="number" min={1} max={365} value={business.maxNights ?? 30} onChange={(e) => setBusiness({ ...business, maxNights: Number(e.target.value) })} />
              <Input label="Book up to N days ahead" type="number" min={1} max={1095} value={business.advanceBookingDays ?? 365} onChange={(e) => setBusiness({ ...business, advanceBookingDays: Number(e.target.value) })} />
            </div>
          </Section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Payout preferences" description="Scheduling only — banking credentials live in the payments area." footer={saveBtn(saveBusiness)}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Select label="Payout schedule" value={business.payoutSchedule || 'weekly'} onChange={(e) => setBusiness({ ...business, payoutSchedule: e.target.value })}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Every 2 weeks</option>
                  <option value="monthly">Monthly</option>
                </Select>
                <Select label="Payout method" value={business.payoutMethod || 'bank_transfer'} onChange={(e) => setBusiness({ ...business, payoutMethod: e.target.value })}>
                  <option value="bank_transfer">Bank transfer (IMPS/NEFT)</option>
                  <option value="upi">UPI</option>
                  <option value="paypal">PayPal</option>
                </Select>
                <Input label="Minimum payout (₹)" type="number" min={0} value={business.payoutThreshold ?? 1000} onChange={(e) => setBusiness({ ...business, payoutThreshold: Number(e.target.value) })} hint="Balance below this rolls over" />
              </div>
              <div className="rounded-xl bg-sand-50 p-3 text-xs text-ink-500">
                Platform commission <strong className="text-ink-800">{ownerCtx.payouts?.commissionPercent ?? 0}%</strong>
                {' · '}service fee <strong className="text-ink-800">{ownerCtx.payouts?.serviceFeePercent ?? 0}%</strong>
                {ownerCtx.payouts?.refundsEnabled ? ' · refunds enabled' : ''}
              </div>
            </Section>

            <Section title="Properties" description={`${ownerCtx.summary?.total ?? 0} listings under this account.`}>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[['Approved', ownerCtx.summary?.approved, 'good'], ['Pending', ownerCtx.summary?.pending, 'warn'], ['Rejected', ownerCtx.summary?.rejected, 'bad'], ['Suspended', ownerCtx.summary?.suspended, 'bad']].map(([label, count, tone]) => (
                  <div key={label} className="rounded-xl bg-sand-50 p-3 text-center">
                    <p className="font-display text-xl font-semibold text-ink-900">{count ?? 0}</p>
                    <p className="mt-0.5 text-xs text-ink-500">{label}</p>
                    <div className="mt-1 flex justify-center"><Pill tone={tone}>{label}</Pill></div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end border-t border-sand-100 pt-4">
                <Button variant="outline" type="button" onClick={() => setDeactOpen(true)}>Deactivate all properties</Button>
              </div>
            </Section>
          </div>
        </div>
      )}

      {tab === 'platform' && isAdmin && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="General" description="Platform-wide defaults and maintenance mode." footer={saveBtn(savePlatform)}>
              <div className="grid gap-4">
                <Input label="App name" value={general.appName || ''} onChange={(e) => setGeneral({ ...general, appName: e.target.value })} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Support email" type="email" value={general.supportEmail || ''} onChange={(e) => setGeneral({ ...general, supportEmail: e.target.value })} />
                  <Input label="Support phone" value={general.supportPhone || ''} onChange={(e) => setGeneral({ ...general, supportPhone: e.target.value })} />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Select label="Default language" value={general.defaultLanguage || 'en'} onChange={(e) => setGeneral({ ...general, defaultLanguage: e.target.value })}>
                    <option value="en">English</option>
                    <option value="hi">हिन्दी</option>
                    <option value="mr">मराठी</option>
                  </Select>
                  <Select label="Currency" value={general.defaultCurrency || 'INR'} onChange={(e) => setGeneral({ ...general, defaultCurrency: e.target.value })}>
                    <option value="INR">₹ INR</option>
                    <option value="USD">$ USD</option>
                    <option value="EUR">€ EUR</option>
                  </Select>
                  <Select label="Timezone" value={general.timezone || 'Asia/Kolkata'} onChange={(e) => setGeneral({ ...general, timezone: e.target.value })}>
                    <option value="Asia/Kolkata">Asia/Kolkata</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">America/New_York</option>
                  </Select>
                </div>
                <Toggle
                  checked={Boolean(general.maintenanceMode)}
                  onChange={(v) => setGeneral({ ...general, maintenanceMode: v })}
                  label="Maintenance mode"
                  description="Blocks guest checkout while you work on the platform."
                />
              </div>
            </Section>

            <Section title="Payments" description="Mock mode charges nothing — switch providers via env in production." footer={saveBtn(savePlatform)}>
              <div className="grid gap-4">
                <Select label="Payment provider" value={payments.provider || 'mock'} onChange={(e) => setPayments({ ...payments, provider: e.target.value })}>
                  <option value="mock">Mock (demo)</option>
                  <option value="razorpay">Razorpay</option>
                </Select>
                <Input label="Platform commission (%)" type="number" min={0} max={50} value={payments.platformCommissionPercent ?? 10} onChange={(e) => setPayments({ ...payments, platformCommissionPercent: Number(e.target.value) })} hint="Cut taken from each booking payout" />
                <Toggle checked={Boolean(payments.refundsEnabled)} onChange={(v) => setPayments({ ...payments, refundsEnabled: v })} label="Refunds enabled" description="Allow admins/owners to issue refunds from bookings." />
                <Toggle checked={Boolean(payments.testMode)} onChange={(v) => setPayments({ ...payments, testMode: v })} label="Test mode" description="Keep all charges simulated." />
              </div>
            </Section>
          </div>

          <Section title="Recommendations" description="Controls ranking and exposure of the home/related carousels." footer={saveBtn(savePlatform)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Featured carousel limit" type="number" min={0} max={24} value={recommendations.featuredLimit ?? 8} onChange={(e) => setRecommendations({ ...recommendations, featuredLimit: Number(e.target.value) })} />
              <Input label="Similar-hotel limit" type="number" min={0} max={12} value={recommendations.similarHotelLimit ?? 4} onChange={(e) => setRecommendations({ ...recommendations, similarHotelLimit: Number(e.target.value) })} />
              <Toggle checked={recommendations.enablePersonalised !== false} onChange={(v) => setRecommendations({ ...recommendations, enablePersonalised: v })} label="Personalised recommendations" description="Blend in the signed-in user's saved destinations & travel prefs." />
              <Toggle checked={Boolean(recommendations.homepagePersonalised)} onChange={(v) => setRecommendations({ ...recommendations, homepagePersonalised: v })} label="Personalised home page" description="Order the home feed per visitor history." />
            </div>
          </Section>
        </div>
      )}

      {tab === 'security' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Change password" description="Use a unique password you don't use elsewhere.">
            <form className="grid gap-4" onSubmit={onPassword}>
              <Input label="Current password" type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} required />
              <Input label="New password" type="password" autoComplete="new-password" hint="8–72 characters" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} required />
              <Input label="Confirm new password" type="password" autoComplete="new-password" value={pw.confirmPassword} onChange={(e) => setPw({ ...pw, confirmPassword: e.target.value })} required />
              <div className="flex justify-end"><Button type="submit" loading={loading === 'password'}>Update password</Button></div>
            </form>
          </Section>

          <div className="space-y-6">
            <Section title="Login security">
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <Info label="Account status" value={sec.deletedAt ? 'Deletion pending' : sec.isBlocked ? 'Blocked' : 'Active'} />
                <Info label="Email verified" value={sec.isVerified ? 'Verified ✓' : 'Not verified'} />
                <Info label="Member since" value={sec.createdAt ? formatDate(sec.createdAt) : '—'} />
                <Info label="Last login" value={sec.lastLoginAt ? `${formatDate(sec.lastLoginAt)} ${formatDateTime(sec.lastLoginAt).split(', ')[1] || ''}` : '—'} />
                <div className="sm:col-span-2"><Info label="Last device" value={sec.lastLoginDevice || 'Unknown device'} /></div>
                <div className="flex items-center gap-2 text-xs text-ink-400 sm:col-span-2">
                  <span className="h-2 w-2 rounded-full bg-ink-300" /> Two-factor authentication: coming soon
                </div>
              </dl>
              <div className="flex justify-end border-t border-sand-100 pt-4">
                <Button variant="secondary" type="button" loading={loading === 'sessions'} onClick={onLogoutOthers}>Log out of all other devices</Button>
              </div>
            </Section>

            <Section title="Data & account" description="Export everything we store, or request permanent deletion.">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" type="button" loading={loading === 'export'} onClick={onExport}>Export my data</Button>
                {isCustomer ? (
                  <Button variant="ghost" type="button" className="text-red-600 hover:bg-red-50" onClick={() => setDeleteOpen(true)}>
                    {sec.deletionRequestedAt ? 'Deletion pending…' : 'Delete account'}
                  </Button>
                ) : (
                  <span className="text-xs text-ink-400">{isOwner ? 'Deactivate from the Business tab.' : 'Admin accounts cannot be self-deleted.'}</span>
                )}
              </div>
            </Section>
          </div>
        </div>
      )}

      {/* ---------- Modals ---------- */}
      <Modal open={pwOpen} onClose={() => setPwOpen(false)} title="Change password" footer={(
        <>
          <Button variant="secondary" size="sm" type="button" onClick={() => setPwOpen(false)}>Cancel</Button>
          <Button size="sm" type="submit" form="pw-form" loading={loading === 'password'}>Update password</Button>
        </>
      )}>
        <form id="pw-form" className="grid gap-4" onSubmit={onPassword}>
          <Input label="Current password" type="password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} required />
          <Input label="New password" type="password" hint="8–72 characters" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} required />
          <Input label="Confirm new password" type="password" value={pw.confirmPassword} onChange={(e) => setPw({ ...pw, confirmPassword: e.target.value })} required />
        </form>
      </Modal>

      <Modal open={exportOpen} onClose={() => setExportOpen(false)} title="Export my data" size="lg" footer={(
        <>
          <Button variant="secondary" size="sm" type="button" onClick={() => setExportOpen(false)}>Close</Button>
          <Button size="sm" type="button" onClick={onDownloadExport}>Download JSON</Button>
        </>
      )}>
        <p className="mb-3 text-sm text-ink-500">Machine-readable copy of your profile, bookings, payments, reviews and wishlist. Passwords and tokens are never included.</p>
        <pre className="max-h-[45vh] overflow-auto rounded-xl bg-ink-950 p-4 text-xs leading-relaxed text-emerald-200">{exportData ? JSON.stringify(exportData, null, 2) : 'Click “Download JSON” to generate…'}</pre>
      </Modal>

      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Delete account" footer={(
        <>
          <Button variant="secondary" size="sm" type="button" onClick={() => setDeleteOpen(false)}>Keep my account</Button>
          <Button size="sm" type="button" className="bg-red-600 hover:bg-red-700" loading={loading === 'delete'} onClick={onDelete}>Delete permanently</Button>
        </>
      )}>
        <div className="space-y-3 text-sm">
          <p className="text-ink-600">This <strong>cannot be undone</strong>. Your account will be anonymised and blocked:</p>
          <ul className="list-disc space-y-1 pl-5 text-ink-500">
            <li>Name, email, phone and photo are erased; bookings keep an anonymised record.</li>
            <li>You are signed out of every device immediately.</li>
          </ul>
          <Input label="Reason (optional)" value={delReason} onChange={(e) => setDelReason(e.target.value)} placeholder="What could we do better?" />
          <Input label="Confirm with your password" type="password" value={delPassword} onChange={(e) => setDelPassword(e.target.value)} required />
        </div>
      </Modal>

      <Modal open={deactOpen} onClose={() => setDeactOpen(false)} title="Deactivate all properties" footer={(
        <>
          <Button variant="secondary" size="sm" type="button" onClick={() => setDeactOpen(false)}>Cancel</Button>
          <Button size="sm" type="button" loading={loading === 'deactivate'} onClick={onDeactivate}>Deactivate</Button>
        </>
      )}>
        <p className="text-sm text-ink-600">Every property under your account is suspended and hidden from search until an admin reactivates it. Your bookings and data stay intact.</p>
      </Modal>
    </div>
  );
}
