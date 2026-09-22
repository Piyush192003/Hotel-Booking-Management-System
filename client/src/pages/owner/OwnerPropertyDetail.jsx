import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiGet, apiPost, apiPut, apiDelete, getApiErrorMessage, getApiErrorDetails } from '../../services/apiClient';
import { formatCurrency, titleCase } from '../../utils/format';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Field';
import { Spinner } from '../../components/ui/Loading';
import { ErrorState } from '../../components/ui/States';

const ROOM_TYPE_OPTIONS = ['standard', 'deluxe', 'suite', 'family', 'dormitory', 'studio', 'presidential'];
const BED_TYPE_OPTIONS = ['king', 'queen', 'twin', 'double', 'single', 'bunk', 'sofa'];

const EMPTY_ROOM_FORM = {
  name: '', roomType: 'standard', pricePerNight: '', totalUnits: 1,
  adults: 2, children: 0, bedType: 'king', description: '',
};

function statusBanner(hotel) {
  if (hotel.status === 'approved') return { className: 'border-emerald-100 bg-emerald-50 text-emerald-800', text: 'Live — guests can find and book this property.' };
  if (hotel.status === 'pending') return { className: 'border-amber-100 bg-amber-50 text-amber-800', text: 'Pending admin approval — guests will see this property once an admin approves it.' };
  if (hotel.status === 'rejected') return { className: 'border-red-100 bg-red-50 text-red-700', text: `Rejected by admin${hotel.rejectionReason ? `: ${hotel.rejectionReason}` : '.'} Update the property and submit it for approval again.` };
  return { className: 'border-orange-100 bg-orange-50 text-orange-800', text: 'Suspended by admin — this property is hidden from guests.' };
}

export default function OwnerPropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [hotel, setHotel] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [roomForm, setRoomForm] = useState(EMPTY_ROOM_FORM);
  const [roomErrors, setRoomErrors] = useState({});
  const [roomError, setRoomError] = useState('');
  const [savingRoom, setSavingRoom] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [deletingRoom, setDeletingRoom] = useState(false);

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    apiGet(`/owner/properties/${id}`)
      .then(({ data }) => {
        if (!alive) return;
        setHotel(data?.hotel || null);
        setRooms(Array.isArray(data?.rooms) ? data.rooms : []);
        setStatus('succeeded');
      })
      .catch((err) => {
        if (!alive) return;
        setError(getApiErrorMessage(err, 'Could not load property'));
        setStatus('failed');
      });
    return () => { alive = false; };
  }, [id]);

  const reload = () => {
    apiGet(`/owner/properties/${id}`)
      .then(({ data }) => {
        setHotel(data?.hotel || null);
        setRooms(Array.isArray(data?.rooms) ? data.rooms : []);
      })
      .catch(() => {});
  };

  const openAddRoom = () => {
    setEditingRoom(null);
    setRoomForm(EMPTY_ROOM_FORM);
    setRoomErrors({});
    setRoomError('');
    setShowRoomModal(true);
  };

  const openEditRoom = (room) => {
    setEditingRoom(room);
    setRoomForm({
      name: room.name || '',
      roomType: room.roomType || 'standard',
      pricePerNight: room.pricePerNight ?? '',
      totalUnits: room.totalUnits ?? 1,
      adults: room.capacity?.adults ?? 2,
      children: room.capacity?.children ?? 0,
      bedType: room.bedType || 'king',
      description: room.description || '',
    });
    setRoomErrors({});
    setRoomError('');
    setShowRoomModal(true);
  };

  /** Mirrors the server's createRoom/updateRoom validator rules. */
  const validateRoom = () => {
    const errs = {};
    const name = roomForm.name.trim();
    if (name.length < 2 || name.length > 120) errs.name = 'Room name must be 2–120 characters';
    const price = Number(roomForm.pricePerNight);
    if (String(roomForm.pricePerNight).trim() === '' || !Number.isFinite(price) || price < 1) errs.pricePerNight = 'Price must be a positive number';
    const units = Number(roomForm.totalUnits);
    if (!Number.isInteger(units) || units < 1 || units > 1000) errs.totalUnits = 'Units must be between 1 and 1000';
    const adults = Number(roomForm.adults);
    if (!Number.isInteger(adults) || adults < 1 || adults > 16) errs.adults = 'Adults must be between 1 and 16';
    const children = Number(roomForm.children);
    if (!Number.isInteger(children) || children < 0 || children > 8) errs.children = 'Children must be between 0 and 8';
    return errs;
  };

  const saveRoom = async (e) => {
    e?.preventDefault?.();
    setRoomError('');
    const errs = validateRoom();
    setRoomErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSavingRoom(true);
    const payload = {
      name: roomForm.name.trim(),
      roomType: roomForm.roomType,
      pricePerNight: Number(roomForm.pricePerNight),
      totalUnits: Number(roomForm.totalUnits),
      capacity: { adults: Number(roomForm.adults), children: Number(roomForm.children) },
      bedType: roomForm.bedType,
      description: roomForm.description.trim(),
    };
    try {
      if (editingRoom) await apiPut(`/rooms/${editingRoom._id}`, payload);
      else await apiPost(`/hotels/${id}/rooms`, payload);
      setShowRoomModal(false);
      reload();
    } catch (err) {
      setRoomError(getApiErrorMessage(err, 'Could not save room'));
      setRoomErrors(getApiErrorDetails(err) || {});
    } finally {
      setSavingRoom(false);
    }
  };

  const toggleRoomStatus = async (room) => {
    try {
      await apiPut(`/rooms/${room._id}`, { status: room.status === 'active' ? 'inactive' : 'active' });
      reload();
    } catch (err) {
      setNotice(getApiErrorMessage(err, 'Could not update room'));
    }
  };

  const confirmDeleteRoom = async () => {
    if (!roomToDelete) return;
    setDeletingRoom(true);
    try {
      await apiDelete(`/rooms/${roomToDelete._id}`);
      setRoomToDelete(null);
      reload();
    } catch (err) {
      setNotice(getApiErrorMessage(err, 'Could not remove room'));
    } finally {
      setDeletingRoom(false);
    }
  };

  const submitForApproval = async () => {
    setSubmitting(true);
    setNotice('');
    try {
      await apiPost(`/hotels/${id}/submit`, {});
      setNotice('Property submitted for admin approval.');
      reload();
    } catch (err) {
      setNotice(getApiErrorMessage(err, 'Could not submit property'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiDelete(`/hotels/${id}`);
      navigate('/owner/properties');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Delete failed'));
      setDeleting(false);
      setShowDelete(false);
    }
  };

  if (status === 'loading') return <Spinner label="Loading property" />;
  if (status === 'failed') return <ErrorState title="Could not load property" message={error} />;
  if (!hotel) return null;

  const banner = statusBanner(hotel);
  const activeRooms = rooms.filter((r) => r.status === 'active');
  const minPrice = activeRooms.length ? Math.min(...activeRooms.map((r) => Number(r.pricePerNight) || Infinity)) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge status={hotel.status} />
            {hotel.featured && <Badge status="info">Featured</Badge>}
          </div>
          <h2 className="mt-2 font-display text-xl font-bold text-ink-900">{hotel.name}</h2>
          <p className="text-sm text-ink-500">{titleCase(hotel.city)}{hotel.state ? `, ${titleCase(hotel.state)}` : ''}</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/owner/properties/${id}/edit`} className="rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50">Edit</Link>
          <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>Delete</Button>
        </div>
      </div>

      <div className={`rounded-lg border px-4 py-3 text-sm ${banner.className}`} role="status">
        <p>{banner.text}</p>
        {hotel.status !== 'approved' && (
          <div className="mt-2">
            <Button size="sm" variant="secondary" onClick={submitForApproval} loading={submitting}>Submit for approval</Button>
          </div>
        )}
      </div>

      {notice && <div className="rounded-lg border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-800">{notice}</div>}

      {hotel.images?.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {hotel.images.slice(0, 4).map((src, i) => (
            <img key={i} src={src} alt={`${hotel.name} photo ${i + 1}`} className="h-40 w-full rounded-xl object-cover" loading="lazy" />
          ))}
        </div>
      )}

      <div className="card-base p-6">
        <h3 className="font-display text-base font-bold text-ink-900">Details</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><p className="text-xs font-semibold uppercase text-ink-400">Type</p><p className="mt-1 text-sm text-ink-900">{titleCase(hotel.propertyType)}</p></div>
          <div><p className="text-xs font-semibold uppercase text-ink-400">Starting price</p><p className="mt-1 text-sm text-ink-900">{minPrice != null && Number.isFinite(minPrice) ? formatCurrency(minPrice) : 'Add a room to set pricing'}</p></div>
          <div><p className="text-xs font-semibold uppercase text-ink-400">Rating</p><p className="mt-1 text-sm text-ink-900">{hotel.rating ? `${Number(hotel.rating).toFixed(1)} ★ (${hotel.reviewCount || 0} reviews)` : 'No reviews yet'}</p></div>
          <div><p className="text-xs font-semibold uppercase text-ink-400">Amenities</p><p className="mt-1 text-sm text-ink-900">{hotel.amenities?.length ? hotel.amenities.map(titleCase).join(', ') : '—'}</p></div>
        </div>
        {hotel.description && <p className="mt-4 text-sm leading-relaxed text-ink-600">{hotel.description}</p>}
      </div>

      <div className="card-base p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-base font-bold text-ink-900">Rooms ({rooms.length})</h3>
          <Button size="sm" onClick={openAddRoom}>+ Add room</Button>
        </div>
        {rooms.length === 0 ? (
          <p className="mt-4 text-sm text-ink-500">No rooms yet. Add at least one room with a price per night — guests can only book properties that have rooms.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-100 text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th className="py-2 pr-4">Room</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2 text-right">Price/night</th>
                  <th className="px-4 py-2">Capacity</th>
                  <th className="px-4 py-2 text-right">Units</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rooms.map((room) => (
                  <tr key={room._id}>
                    <td className="py-2 pr-4 font-medium text-ink-900">{room.name}</td>
                    <td className="px-4 py-2 text-ink-600">{titleCase(room.roomType)}</td>
                    <td className="px-4 py-2 text-right font-medium text-ink-900">{formatCurrency(room.pricePerNight)}</td>
                    <td className="px-4 py-2 text-ink-600">{room.capacity?.adults ?? 2} adults{room.capacity?.children ? ` + ${room.capacity.children} kids` : ''}</td>
                    <td className="px-4 py-2 text-right text-ink-600">{room.totalUnits}</td>
                    <td className="px-4 py-2"><Badge status={room.status === 'active' ? 'active' : 'neutral'}>{titleCase(room.status)}</Badge></td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => openEditRoom(room)} className="rounded-lg border border-ink-200 px-2.5 py-1 text-xs font-semibold text-ink-700 hover:bg-ink-50">Edit</button>
                        <button type="button" onClick={() => toggleRoomStatus(room)} className="rounded-lg border border-ink-200 px-2.5 py-1 text-xs font-semibold text-ink-700 hover:bg-ink-50">{room.status === 'active' ? 'Deactivate' : 'Activate'}</button>
                        <button type="button" onClick={() => setRoomToDelete(room)} className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {hotel.status === 'approved' && (
        <Link to={`/hotels/${hotel.slug || hotel._id}`} className="inline-block text-sm font-medium text-brand-600 hover:text-brand-700">View public page →</Link>
      )}

      <Modal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        title="Delete property"
        footer={(
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowDelete(false)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={handleDelete} loading={deleting}>Delete permanently</Button>
          </>
        )}
      >
        <p className="text-sm text-ink-600">This will permanently remove <strong>{hotel.name}</strong> and all its rooms. This action cannot be undone.</p>
      </Modal>

      <Modal
        open={showRoomModal}
        onClose={() => setShowRoomModal(false)}
        title={editingRoom ? 'Edit room' : 'Add room'}
        size="lg"
        footer={(
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowRoomModal(false)}>Cancel</Button>
            <Button size="sm" onClick={saveRoom} loading={savingRoom}>{editingRoom ? 'Save changes' : 'Add room'}</Button>
          </>
        )}
      >
        <form onSubmit={saveRoom} className="space-y-4" noValidate>
          {roomError && (
            <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              <p className="font-semibold">{roomError}</p>
              {Object.keys(roomErrors).length > 0 && (
                <ul className="mt-1.5 list-inside list-disc space-y-0.5">
                  {Object.entries(roomErrors).map(([field, msg]) => <li key={field}>{msg}</li>)}
                </ul>
              )}
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Room name" required error={roomErrors.name} value={roomForm.name} onChange={(e) => setRoomForm((f) => ({ ...f, name: e.target.value }))} placeholder="Deluxe Room" />
            <Input label="Price per night (₹)" required error={roomErrors.pricePerNight} type="number" min="1" step="1" value={roomForm.pricePerNight} onChange={(e) => setRoomForm((f) => ({ ...f, pricePerNight: e.target.value }))} placeholder="2500" />
            <Select label="Room type" error={roomErrors.roomType} value={roomForm.roomType} onChange={(e) => setRoomForm((f) => ({ ...f, roomType: e.target.value }))}>
              {ROOM_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{titleCase(t)}</option>)}
            </Select>
            <Select label="Bed type" error={roomErrors.bedType} value={roomForm.bedType} onChange={(e) => setRoomForm((f) => ({ ...f, bedType: e.target.value }))}>
              {BED_TYPE_OPTIONS.map((b) => <option key={b} value={b}>{titleCase(b)}</option>)}
            </Select>
            <Input label="Total units" error={roomErrors.totalUnits} type="number" min="1" step="1" value={roomForm.totalUnits} onChange={(e) => setRoomForm((f) => ({ ...f, totalUnits: e.target.value }))} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Adults" error={roomErrors.adults} type="number" min="1" max="16" value={roomForm.adults} onChange={(e) => setRoomForm((f) => ({ ...f, adults: e.target.value }))} />
              <Input label="Children" error={roomErrors.children} type="number" min="0" max="8" value={roomForm.children} onChange={(e) => setRoomForm((f) => ({ ...f, children: e.target.value }))} />
            </div>
          </div>
          <Textarea label="Description" rows={3} value={roomForm.description} onChange={(e) => setRoomForm((f) => ({ ...f, description: e.target.value }))} placeholder="What makes this room special…" />
          <button type="submit" className="hidden" aria-hidden="true" />
        </form>
      </Modal>

      <Modal
        open={Boolean(roomToDelete)}
        onClose={() => setRoomToDelete(null)}
        title="Remove room"
        size="sm"
        footer={(
          <>
            <Button variant="secondary" size="sm" onClick={() => setRoomToDelete(null)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={confirmDeleteRoom} loading={deletingRoom}>Remove room</Button>
          </>
        )}
      >
        <p className="text-sm text-ink-600">Remove <strong>{roomToDelete?.name}</strong> from this property? It will be deactivated so any existing bookings stay intact.</p>
      </Modal>
    </div>
  );
}
