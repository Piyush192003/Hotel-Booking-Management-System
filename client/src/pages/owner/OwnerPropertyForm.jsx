import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiPost, apiPut, apiGet, getApiErrorMessage, getApiErrorDetails } from '../../services/apiClient';
import { Input, Select, Textarea } from '../../components/ui/Field';
import Button from '../../components/ui/Button';

const AMENITY_OPTIONS = ['wifi', 'pool', 'spa', 'gym', 'restaurant', 'bar', 'air-conditioning', 'parking', 'room-service', 'laundry', 'airport-shuttle', 'breakfast', 'pets-allowed', 'child-friendly', 'beachfront', 'mountain-view', 'kitchen', 'fireplace', 'workspace', 'elevator', '24x7-front-desk', 'luggage-storage'];
const TYPE_OPTIONS = ['hotel', 'resort', 'villa', 'apartment', 'guesthouse', 'homestay', 'hostel', 'cottage'];
const ROOM_TYPE_OPTIONS = ['standard', 'deluxe', 'suite', 'family', 'dormitory', 'studio', 'presidential'];
const BED_TYPE_OPTIONS = ['king', 'queen', 'twin', 'double', 'single', 'bunk', 'sofa'];
const EMPTY_ROOM = { name: 'Deluxe Room', roomType: 'deluxe', pricePerNight: '', totalUnits: 1, adults: 2, children: 0, bedType: 'king' };

export default function OwnerPropertyForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [form, setForm] = useState({
    name: '', tagline: '', description: '',
    propertyType: 'hotel', city: '', state: '', address: '',
    starRating: 3, amenities: [], images: '',
  });
  const [room, setRoom] = useState(EMPTY_ROOM);

  useEffect(() => {
    if (!isEdit) return;
    let alive = true;
    apiGet(`/owner/hotels/${id}`)
      .then(({ data }) => {
        if (!alive || !data?.hotel) return;
        const d = data.hotel;
        setForm({
          name: d.name || '', tagline: d.tagline || '', description: d.description || '',
          propertyType: d.propertyType || 'hotel', city: d.city || '', state: d.state || '',
          address: d.address || '', starRating: d.starRating || 3,
          amenities: d.amenities || [], images: (d.images || []).join('\n'),
        });
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Could not load property')));
    return () => { alive = false; };
  }, [id, isEdit]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setR = (k, v) => setRoom((r) => ({ ...r, [k]: v }));
  const toggleAmenity = (a) => set('amenities', form.amenities.includes(a) ? form.amenities.filter((x) => x !== a) : [...form.amenities, a]);

  /** Mirrors the server's createHotel/createRoom validator rules so errors surface before submit. */
  const validate = () => {
    const errs = {};
    const name = form.name.trim();
    if (name.length < 3 || name.length > 140) errs.name = 'Hotel name must be 3–140 characters';
    if (form.tagline.trim().length > 160) errs.tagline = 'Tagline must be at most 160 characters';
    const desc = form.description.trim();
    if (desc.length < 20) errs.description = 'Description must be at least 20 characters';
    else if (desc.length > 5000) errs.description = 'Description must be at most 5000 characters';
    const city = form.city.trim();
    if (city.length < 2 || city.length > 80) errs.city = 'City is required (2–80 characters)';
    const address = form.address.trim();
    if (address.length < 3 || address.length > 300) errs.address = 'Address is required (3–300 characters)';
    if (form.state.trim().length > 80) errs.state = 'State must be at most 80 characters';
    const badImages = form.images.split('\n').map((s) => s.trim()).filter(Boolean)
      .filter((url) => { try { new URL(url); return false; } catch { return true; } });
    if (badImages.length) errs.images = `Invalid image URL: ${badImages.join(', ')}`;
    if (!isEdit && String(room.pricePerNight).trim() !== '') {
      const roomName = room.name.trim();
      if (roomName.length < 2 || roomName.length > 120) errs['room.name'] = 'Room name must be 2–120 characters';
      const price = Number(room.pricePerNight);
      if (!Number.isFinite(price) || price < 1) errs['room.pricePerNight'] = 'Price must be a positive number';
      const units = Number(room.totalUnits);
      if (!Number.isInteger(units) || units < 1 || units > 1000) errs['room.totalUnits'] = 'Units must be between 1 and 1000';
      const adults = Number(room.adults);
      if (!Number.isInteger(adults) || adults < 1 || adults > 16) errs['room.adults'] = 'Adults must be between 1 and 16';
      const children = Number(room.children);
      if (!Number.isInteger(children) || children < 0 || children > 8) errs['room.children'] = 'Children must be between 0 and 8';
    }
    return errs;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setError('Please fix the highlighted fields.');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      tagline: form.tagline.trim(),
      description: form.description.trim(),
      propertyType: form.propertyType,
      city: form.city.trim(),
      state: form.state.trim(),
      address: form.address.trim(),
      starRating: Number(form.starRating) || 3,
      amenities: form.amenities,
      images: form.images.split('\n').map((s) => s.trim()).filter(Boolean),
    };
    try {
      if (isEdit) {
        await apiPut(`/hotels/${id}`, payload);
        navigate('/owner/properties');
        return;
      }
      const { data } = await apiPost('/hotels', payload);
      const hotelId = data?.hotel?._id;
      if (hotelId && String(room.pricePerNight).trim() !== '') {
        try {
          await apiPost(`/hotels/${hotelId}/rooms`, {
            name: room.name.trim(),
            roomType: room.roomType,
            pricePerNight: Number(room.pricePerNight),
            totalUnits: Number(room.totalUnits),
            capacity: { adults: Number(room.adults), children: Number(room.children) },
            bedType: room.bedType,
          });
        } catch (roomErr) {
          setError(`Property created, but the room could not be added: ${getApiErrorMessage(roomErr, 'room could not be saved')}`);
          setFieldErrors(getApiErrorDetails(roomErr) || {});
          return;
        }
      }
      navigate(hotelId ? `/owner/properties/${hotelId}` : '/owner/properties');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not save property'));
      setFieldErrors(getApiErrorDetails(err) || {});
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-6" noValidate>
      {error && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          <p className="font-semibold">{error}</p>
          {Object.keys(fieldErrors).length > 0 && (
            <ul className="mt-1.5 list-inside list-disc space-y-0.5">
              {Object.entries(fieldErrors).map(([field, msg]) => <li key={field}>{msg}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="card-base space-y-4 p-6">
        <h3 className="font-display text-base font-bold text-ink-900">Property details</h3>
        <Input label="Property name" required error={fieldErrors.name} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Sunset Beach Resort" />
        <Input label="Tagline" error={fieldErrors.tagline} value={form.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="A slice of paradise" />
        <Textarea label="Description" required error={fieldErrors.description} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Tell guests what makes your property special…" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label="Property type" error={fieldErrors.propertyType} value={form.propertyType} onChange={(e) => set('propertyType', e.target.value)}>
            {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}
          </Select>
          <Select label="Star rating" error={fieldErrors.starRating} value={form.starRating} onChange={(e) => set('starRating', Number(e.target.value))}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{'★'.repeat(n)} ({n})</option>)}
          </Select>
        </div>
      </div>

      <div className="card-base space-y-4 p-6">
        <h3 className="font-display text-base font-bold text-ink-900">Location</h3>
        <Input label="Street address" required error={fieldErrors.address} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="123 Beach Road" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="City" required error={fieldErrors.city} value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Goa" />
          <Input label="State" error={fieldErrors.state} value={form.state} onChange={(e) => set('state', e.target.value)} placeholder="Goa" />
        </div>
      </div>

      <div className="card-base space-y-4 p-6">
        <h3 className="font-display text-base font-bold text-ink-900">Amenities</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {AMENITY_OPTIONS.map((a) => (
            <label key={a} className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={form.amenities.includes(a)} onChange={() => toggleAmenity(a)} className="accent-brand-600" />
              {titleCase(a)}
            </label>
          ))}
        </div>
      </div>

      {!isEdit && (
        <div className="card-base space-y-4 p-6">
          <h3 className="font-display text-base font-bold text-ink-900">Rooms &amp; pricing</h3>
          <p className="text-sm text-ink-500">Set your first room type and its price — guests will see &quot;from ₹X&quot; on your listing. More room types can be added later from the property page.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Room name" error={fieldErrors['room.name']} value={room.name} onChange={(e) => setR('name', e.target.value)} placeholder="Deluxe Room" />
            <Input label="Price per night (₹)" required error={fieldErrors['room.pricePerNight']} type="number" min="1" step="1" value={room.pricePerNight} onChange={(e) => setR('pricePerNight', e.target.value)} placeholder="2500" />
            <Select label="Room type" error={fieldErrors['room.roomType']} value={room.roomType} onChange={(e) => setR('roomType', e.target.value)}>
              {ROOM_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}
            </Select>
            <Select label="Bed type" error={fieldErrors['room.bedType']} value={room.bedType} onChange={(e) => setR('bedType', e.target.value)}>
              {BED_TYPE_OPTIONS.map((b) => <option key={b} value={b}>{titleCase(b)}</option>)}
            </Select>
            <Input label="Total units of this type" error={fieldErrors['room.totalUnits']} type="number" min="1" step="1" value={room.totalUnits} onChange={(e) => setR('totalUnits', e.target.value)} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Adults" error={fieldErrors['room.adults']} type="number" min="1" max="16" value={room.adults} onChange={(e) => setR('adults', e.target.value)} />
              <Input label="Children" error={fieldErrors['room.children']} type="number" min="0" max="8" value={room.children} onChange={(e) => setR('children', e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-ink-400">Leave the price empty to add rooms later from the property page.</p>
        </div>
      )}

      <div className="card-base space-y-4 p-6">
        <h3 className="font-display text-base font-bold text-ink-900">Photos</h3>
        <Textarea label="Image URLs (one per line)" rows={4} error={fieldErrors.images} value={form.images} onChange={(e) => set('images', e.target.value)} placeholder="https://…" />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={saving} loading={saving}>{isEdit ? 'Save changes' : 'Create property'}</Button>
        <Button type="button" variant="secondary" onClick={() => navigate('/owner/properties')}>Cancel</Button>
      </div>
    </form>
  );
}

function titleCase(value) {
  return String(value || '').split(/[-_\s]+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
