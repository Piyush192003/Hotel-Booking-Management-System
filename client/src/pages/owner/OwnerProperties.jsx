import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, getApiErrorMessage } from '../../services/apiClient';
import { formatCurrency, titleCase } from '../../utils/format';
import Badge from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/States';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';

export default function OwnerProperties() {
  const [hotels, setHotels] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    apiGet('/owner/hotels')
      .then(({ data }) => {
        if (!alive) return;
        setHotels(Array.isArray(data) ? data : data?.hotels || []);
        setStatus('succeeded');
      })
      .catch((err) => {
        if (!alive) return;
        setError(getApiErrorMessage(err, 'Could not load properties'));
        setStatus('failed');
      });
    return () => { alive = false; };
  }, []);

  if (status === 'loading') return <TableSkeleton rows={4} />;
  if (status === 'failed') return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500">{hotels.length} propert{hotels.length === 1 ? 'y' : 'ies'}</p>
        <Link to="/owner/properties/new" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">+ Add property</Link>
      </div>

      {hotels.length === 0 ? (
        <EmptyState
          title="No properties listed"
          description="Add your first property to start receiving bookings."
          action={<Link to="/owner/properties/new" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Add property</Link>}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-ink-100 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-100 bg-ink-50/60 text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3">Property</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Rating</th>
                <th className="px-4 py-3 text-right">From</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {hotels.map((h) => (
                <tr key={h._id} className="hover:bg-ink-50/60">
                  <td className="px-4 py-3">
                    <Link to={`/owner/properties/${h._id}`} className="font-semibold text-ink-900 hover:text-brand-700">{h.name}</Link>
                    <span className="block text-xs text-ink-400">{h.roomCount ? `${h.roomCount} room${h.roomCount === 1 ? '' : 's'}` : 'No rooms yet'}</span>
                  </td>
                  <td className="px-4 py-3 text-ink-600">{titleCase(h.city)}</td>
                  <td className="px-4 py-3 text-ink-600">{titleCase(h.propertyType)}</td>
                  <td className="px-4 py-3"><Badge status={h.status} /></td>
                  <td className="px-4 py-3 text-ink-600">{h.rating ? `${Number(h.rating).toFixed(1)} ★` : '—'}</td>
                  <td className="px-4 py-3 text-right font-medium text-ink-900">{formatCurrency(h.startingPrice || h.minPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
