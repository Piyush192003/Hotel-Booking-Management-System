import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchWishlist, removeFromWishlist } from '../../features/wishlist/wishlistSlice';
import HotelCard from '../../components/hotels/HotelCard';
import { EmptyState } from '../../components/ui/States';
import { Spinner } from '../../components/ui/Loading';

export default function Wishlist() {
  const dispatch = useDispatch();
  const { items, status, error } = useSelector((s) => s.wishlist);

  useEffect(() => {
    dispatch(fetchWishlist());
  }, [dispatch]);

  if (status === 'loading') return <Spinner label="Loading wishlist" />;
  if (status === 'failed') return <p className="text-sm text-red-600">{error}</p>;

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-500">{items.length} saved propert{items.length === 1 ? 'y' : 'ies'}</p>
      {items.length === 0 ? (
        <EmptyState title="Your wishlist is empty" description="Save properties you love to compare them later." icon="♡" />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((entry) => {
            const hotel = entry.hotelId && typeof entry.hotelId === 'object' ? entry.hotelId : entry.hotel;
            if (!hotel) return null;
            return (
              <div key={hotel._id} className="relative">
                <HotelCard hotel={hotel} />
                <button
                  type="button"
                  onClick={() => dispatch(removeFromWishlist(hotel._id))}
                  className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-xs font-semibold text-red-600 shadow-sm hover:bg-red-50"
                  aria-label={`Remove ${hotel.name} from wishlist`}
                >
                  ♥ Remove
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
