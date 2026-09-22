import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import HotelCard from '../../components/hotels/HotelCard';
import SearchBar from '../../components/hotels/SearchBar';
import Pagination from '../../components/ui/Pagination';
import { EmptyState, ErrorState } from '../../components/ui/States';
import { Select } from '../../components/ui/Field';
import { titleCase } from '../../utils/format';

const AMENITIES = ['wifi', 'pool', 'spa', 'restaurant', 'parking', 'air-conditioning', 'breakfast', 'pet-friendly', 'beachfront', 'gym'];
const TYPES = ['hotel', 'resort', 'villa', 'homestay', 'guesthouse', 'cottage'];
const SORTS = [
  { value: 'recommended', label: 'Recommended' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating_desc', label: 'Top rated' },
  { value: 'newest', label: 'Newest' },
];

export default function HotelList() {
  const [params, setParams] = useSearchParams();
  const [hotels, setHotels] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const filters = useMemo(() => ({
    destination: params.get('destination') || '',
    checkIn: params.get('checkIn') || '',
    checkOut: params.get('checkOut') || '',
    adults: params.get('adults') || '2',
    children: params.get('children') || '0',
    rooms: params.get('rooms') || '1',
    minPrice: params.get('minPrice') || '',
    maxPrice: params.get('maxPrice') || '',
    rating: params.get('rating') || '',
    amenities: (params.get('amenities') || '').split(',').filter(Boolean),
    propertyType: params.get('propertyType') || '',
    sort: params.get('sort') || 'recommended',
    page: Number(params.get('page')) || 1,
  }), [params]);

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === '' || v == null) next.delete(k);
      else next.set(k, v);
    });
    if (!('page' in patch)) next.delete('page');
    setParams(next);
  };

  
  const go = (p) => {
    const q = new URLSearchParams();
    if (p.destination) q.set('destination', p.destination);
    if (p.checkIn) q.set('checkIn', p.checkIn);
    if (p.checkOut) q.set('checkOut', p.checkOut);
    if (p.adults) q.set('adults', p.adults);
    if (p.children) q.set('children', p.children);
    if (p.rooms) q.set('rooms', p.rooms);
    setParams(q);
  };

  const toggleAmenity = (a) => {
    const next = new Set(filters.amenities);
    if (next.has(a)) next.delete(a);
    else next.add(a);
    update({ amenities: Array.from(next).join(',') });
  };

  const toggleType = (t) => {
    const current = filters.propertyType || '';
    update({ propertyType: current === t ? '' : t });
  };

  const toggleRating = (r) => {
    update({ rating: filters.rating === String(r) ? '' : String(r) });
  };

  const applyPrice = () => {
    update({ minPrice: filters.minPrice, maxPrice: filters.maxPrice });
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    const q = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v === '' || v == null || v === undefined) return;
      if (Array.isArray(v)) {
        if (v.length) q.set(k, v.join(','));
      } else {
        q.set(k, String(v));
      }
    });

    apiClient.get(`/search/hotels?${q.toString()}`)
      .then((res) => {
        if (!alive) return;
        setHotels(res.data?.data || []);
        setMeta({
          total: res.data?.meta?.total || 0,
          page: res.data?.meta?.page || 1,
          pages: res.data?.meta?.pages || 1,
        });
      })
      .catch((err) => {
        if (!alive) return;
        setError(err?.response?.data?.message || 'Could not load hotels.');
        setHotels([]);
      })
      .finally(() => alive && setLoading(false));

    return () => { alive = false; };
    }, [params, filters]);

    const loadingSkeleton = () => (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-ink-100 bg-white">
          <div className="h-48 w-full animate-pulse bg-ink-100" />
          <div className="space-y-3 p-4">
            <div className="h-5 w-3/4 animate-pulse rounded bg-ink-100" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-ink-100" />
            <div className="flex justify-between pt-2">
              <div className="h-6 w-24 animate-pulse rounded bg-ink-100" />
              <div className="h-9 w-24 animate-pulse rounded bg-ink-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="section-alt py-8">
      <div className="container-page">
      <div className="mb-6">
        <SearchBar initial={filters} onSearch={(p) => go(p)} compact />
      </div>

      <div className="flex gap-8">
        <aside className="hidden w-64 shrink-0 space-y-6 lg:block">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-ink-900">Property type</h3>
            <div className="space-y-1.5">
              {TYPES.map((t) => (
                <label key={t} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.propertyType === t}
                    onChange={() => toggleType(t)}
                    className="accent-brand-600"
                  />
                  {titleCase(t)}
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-ink-900">Price range (per night)</h3>
            <div className="flex gap-2">
              <input
                type="number" min="0" placeholder="Min"
                value={filters.minPrice || ''}
                onChange={(e) => update({ minPrice: e.target.value || '' })}
                className="input-base w-1/2 text-sm"
              />
              <input
                type="number" min="0" placeholder="Max"
                value={filters.maxPrice || ''}
                onChange={(e) => update({ maxPrice: e.target.value || '' })}
                className="input-base w-1/2 text-sm"
              />
            </div>
            <button type="button" onClick={applyPrice} className="mt-2 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">
              Apply
            </button>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-ink-900">Amenities</h3>
            <div className="grid grid-cols-1 gap-1.5">
              {AMENITIES.map((a) => (
                <label key={a} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.amenities.includes(a)}
                    onChange={() => toggleAmenity(a)}
                    className="accent-brand-600"
                  />
                  {titleCase(a)}
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-ink-900">Minimum rating</h3>
            <div className="space-y-1.5">
              {[4, 3, 2, 1].map((r) => (
                <label key={r} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio" name="rating"
                    checked={filters.rating === String(r)}
                    onChange={() => toggleRating(r)}
                    className="accent-brand-600"
                  />
                  <span>{r}+ stars</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        <main className="flex-1">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-ink-500">
              {meta.total} result{meta.total === 1 ? '' : 's'}
            </p>
            <Select value={filters.sort} onChange={(e) => update({ sort: e.target.value, page: 1 })}>
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </Select>
          </div>

          {loading ? (
            loadingSkeleton()
          ) : error ? (
            <ErrorState title="Could not load hotels" message={error} onRetry={() => update({ page: 1 })} />
          ) : hotels.length === 0 ? (
            <EmptyState
              title="No hotels found"
              description="Try adjusting your search filters."
              action={<button type="button" onClick={() => setParams(new URLSearchParams())} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Reset filters</button>}
            />
          ) : (
            <>
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {hotels.map((h) => <HotelCard key={h._id || h.id} hotel={h} />)}
              </div>
              <div className="mt-8">
                <Pagination page={meta.page} pages={meta.pages} total={meta.total} onChange={(p) => update({ page: p })} />
              </div>
            </>
          )}
                </main>
      </div>
      </div>
    </div>
  );
}



