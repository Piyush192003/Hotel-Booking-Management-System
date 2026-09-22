import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiGet, apiPost, apiDelete, getApiErrorMessage } from '../../services/apiClient';

export const fetchWishlist = createAsyncThunk(
  'wishlist/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await apiGet('/wishlist');
      return data;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Could not load wishlist'));
    }
  },
);

export const addToWishlist = createAsyncThunk(
  'wishlist/add',
  async (hotelId, { rejectWithValue }) => {
    try {
      const { data } = await apiPost(`/wishlist/${hotelId}`, {});
      // Backend returns { wishlisted: true } — attach hotelId so reducers can update state.
      return { hotelId, ...data };
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Could not add to wishlist'));
    }
  },
);

export const removeFromWishlist = createAsyncThunk(
  'wishlist/remove',
  async (hotelId, { rejectWithValue }) => {
    try {
      await apiDelete(`/wishlist/${hotelId}`);
      return hotelId;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Could not remove from wishlist'));
    }
  },
);

export const fetchWishlistStatus = createAsyncThunk(
  'wishlist/status',
  async (hotelId, { rejectWithValue }) => {
    try {
      const { data } = await apiGet(`/wishlist/status/${hotelId}`);
      return { hotelId, wishlisted: Boolean(data?.wishlisted) };
    } catch {
      return rejectWithValue('status check failed');
    }
  },
);

const wishlistSlice = createSlice({
  name: 'wishlist',
  initialState: {
    items: [], // [{ hotelId, hotel }]
    ids: [], // hotel ids for fast lookup
    status: 'idle',
    error: null,
  },
  reducers: {
    clearWishlist(state) {
      state.items = [];
      state.ids = [];
      state.status = 'idle';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWishlist.pending, (s) => { s.status = 'loading'; })
      .addCase(fetchWishlist.fulfilled, (s, a) => {
        s.status = 'succeeded';
        const items = Array.isArray(a.payload) ? a.payload : a.payload?.items || [];
        s.items = items;
        s.ids = items.map((i) => i.hotelId?._id || i.hotelId || i._id).filter(Boolean);
      })
      .addCase(fetchWishlist.rejected, (s, a) => { s.status = 'failed'; s.error = a.payload; })
      .addCase(addToWishlist.pending, (s) => { s.error = null; })
      .addCase(addToWishlist.fulfilled, (s, a) => {
        const id = a.payload?.hotelId || a.meta.arg;
        if (id && !s.ids.includes(id)) s.ids.push(id);
      })
      .addCase(addToWishlist.rejected, (s, a) => { s.error = a.payload; })
      .addCase(removeFromWishlist.pending, (s) => { s.error = null; })
      .addCase(removeFromWishlist.fulfilled, (s, a) => {
        s.items = s.items.filter((i) => (i.hotelId?._id || i.hotelId || i._id) !== a.payload);
        s.ids = s.ids.filter((id) => id !== a.payload);
      })
      .addCase(removeFromWishlist.rejected, (s, a) => { s.error = a.payload; })
      .addCase(fetchWishlistStatus.fulfilled, (s, a) => {
        const { hotelId, wishlisted } = a.payload || {};
        if (!hotelId) return;
        if (wishlisted) {
          if (!s.ids.includes(hotelId)) s.ids.push(hotelId);
        } else {
          s.ids = s.ids.filter((id) => id !== hotelId);
        }
      });
  },
});

export const { clearWishlist } = wishlistSlice.actions;
export default wishlistSlice.reducer;
