import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { todayISO, addDaysISO } from '../../utils/format';

/**
 * Hotel search widget. Pushes query params onto /hotels.
 * Used on the home hero and the hotels listing page (compact variant).
 */
export default function SearchBar({ initial = {}, compact = false }) {
  const navigate = useNavigate();
  const [destination, setDestination] = useState(initial.destination || '');
  const [checkIn, setCheckIn] = useState(initial.checkIn || addDaysISO(todayISO(), 7));
  const [checkOut, setCheckOut] = useState(initial.checkOut || addDaysISO(todayISO(), 9));
  const [guests, setGuests] = useState(initial.adults || 2);

  const submit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (destination.trim()) params.set('destination', destination.trim());
    params.set('checkIn', checkIn);
    params.set('checkOut', checkOut);
    params.set('adults', String(guests));
    navigate(`/hotels?${params.toString()}`);
  };

  return (
    <form
      onSubmit={submit}
      role="search"
      aria-label="Hotel search"
      className={compact ? 'card-base grid grid-cols-2 gap-3 p-4 md:grid-cols-5 md:items-end' : 'card-base grid grid-cols-1 gap-4 p-5 shadow-float sm:grid-cols-2 lg:grid-cols-5 lg:items-end'}
    >
      <div className="col-span-1 sm:col-span-2">
        <label htmlFor="sb-destination" className="label-base">Destination</label>
        <input
          id="sb-destination"
          type="text"
          className="input-base"
          placeholder="City, area or hotel name"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="sb-checkin" className="label-base">Check-in</label>
        <input
          id="sb-checkin"
          type="date"
          className="input-base"
          min={todayISO()}
          value={checkIn}
          onChange={(e) => {
            setCheckIn(e.target.value);
            if (e.target.value >= checkOut) setCheckOut(addDaysISO(e.target.value, 1));
          }}
        />
      </div>
      <div>
        <label htmlFor="sb-checkout" className="label-base">Check-out</label>
        <input
          id="sb-checkout"
          type="date"
          className="input-base"
          min={addDaysISO(checkIn, 1)}
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
        />
      </div>
      <div className="col-span-1 flex items-end gap-2">
        <div className="w-full">
          <label htmlFor="sb-guests" className="label-base">Guests</label>
          <select id="sb-guests" className="input-base" value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n} guest{n > 1 ? 's' : ''}</option>)}
          </select>
        </div>
        <button type="submit" className="h-[42px] shrink-0 rounded-lg bg-brand-gradient px-4 text-sm font-semibold text-white shadow-brand-glow hover:brightness-110">
          Search
        </button>
      </div>
    </form>
  );
}
