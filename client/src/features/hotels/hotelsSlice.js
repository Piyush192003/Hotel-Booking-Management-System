import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiGet, getApiErrorMessage } from '../../services/apiClient';

export const searchHotels = createAsyncThunk(
  'hotels/search',
  async (params, { rejectWithValue }) => {
    try {
      const clean = {};
      Object.entries(params || {}).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') clean[k] = v;
      });
      const { data, meta } = await apiGet('/search/hotels', clean);
      return { hotels: data || [], meta };
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Hotel search failed'));
    }
  },
);

export const fetchCollections = createAsyncThunk(
  'hotels/collections',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await apiGet('/search/hotels/collections');
      return data;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Could not load collections'));
    }
  },
);

export const fetchHotelDetail = createAsyncThunk(
  'hotels/detail',
  async (identifier, { rejectWithValue }) => {
    try {
      const { data } = await apiGet(`/search/hotels/${identifier}`);
      return data;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Hotel not found'));
    }
  },
);

export const fetchRoomAvailability = createAsyncThunk(
  'hotels/roomAvailability',
  async ({ hotelId, checkIn, checkOut, adults = 1, children = 0, rooms = 1 }, { rejectWithValue }) => {
    try {
      const { data } = await apiGet(`/search/hotels/${hotelId}/rooms-availability`, {
        checkIn, checkOut, adults, children, rooms,
      });
      return data;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Availability check failed'));
    }
  },
);

const initialState = {
  results: [],
  total: 0,
  page: 1,
  pages: 1,
  destination: '',
  searchStatus: 'idle',
  searchError: null,
  collections: { featured: [], topRated: [], budget: [], luxury: [], destinations: [] },
  collectionsStatus: 'idle',
  detail: null, // { hotel, rooms, reviews, reviewCount }
  detailStatus: 'idle',
  detailError: null,
  availability: {}, // roomId -> { available, availableUnits, ... }
  availabilityStatus: 'idle',
};

const hotelsSlice = createSlice({
  name: 'hotels',
  initialState,
  reducers: {
    clearDetail(state) {
      state.detail = null;
      state.detailStatus = 'idle';
      state.detailError = null;
      state.availability = {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(searchHotels.pending, (state) => {
        state.searchStatus = 'loading';
        state.searchError = null;
      })
      .addCase(searchHotels.fulfilled, (state, action) => {
        state.searchStatus = 'succeeded';
        state.results = action.payload.hotels;
        state.total = action.payload.meta.total || action.payload.hotels.length;
        state.page = action.payload.meta.page || 1;
        state.pages = action.payload.meta.pages || 1;
        state.destination = action.payload.meta.destination || '';
      })
      .addCase(searchHotels.rejected, (state, action) => {
        state.searchStatus = 'failed';
        state.searchError = action.payload;
      })
      .addCase(fetchCollections.pending, (state) => {
        state.collectionsStatus = 'loading';
      })
      .addCase(fetchCollections.fulfilled, (state, action) => {
        state.collectionsStatus = 'succeeded';
        state.collections = { featured: [], topRated: [], budget: [], luxury: [], destinations: [], ...action.payload };
      })
            .addCase(fetchCollections.rejected, (state, action) => {
        state.collectionsStatus = 'failed';
        state.collectionsError = action.payload;
      })
      .addCase(fetchHotelDetail.pending, (state) => {
        state.detailStatus = 'loading';
        state.detailError = null;
      })
      .addCase(fetchHotelDetail.fulfilled, (state, action) => {
        state.detailStatus = 'succeeded';
        state.detail = action.payload;
      })
      .addCase(fetchHotelDetail.rejected, (state, action) => {
        state.detailStatus = 'failed';
        state.detailError = action.payload;
      })
      .addCase(fetchRoomAvailability.pending, (state) => {
        state.availabilityStatus = 'loading';
      })
      .addCase(fetchRoomAvailability.fulfilled, (state, action) => {
        state.availabilityStatus = 'succeeded';
        const map = {};
        (Array.isArray(action.payload) ? action.payload : action.payload?.rooms || []).forEach((r) => {
          map[r.room?._id || r._id || r.roomId] = r;
        });
        state.availability = map;
      })
      .addCase(fetchRoomAvailability.rejected, (state) => {
        state.availabilityStatus = 'failed';
      });
  },
});

export const { clearDetail } = hotelsSlice.actions;
export default hotelsSlice.reducer;
