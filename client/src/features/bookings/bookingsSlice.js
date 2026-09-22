import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiGet, apiPost, apiPatch, getApiErrorMessage } from '../../services/apiClient';

export const priceQuote = createAsyncThunk(
  'bookings/priceQuote',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await apiPost('/bookings/price-quote', payload);
      return data?.pricing;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Could not calculate price'));
    }
  },
);

export const createBooking = createAsyncThunk(
  'bookings/create',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await apiPost('/bookings', payload);
      return data?.booking;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Booking failed'));
    }
  },
);

export const createPaymentOrder = createAsyncThunk(
  'bookings/createPaymentOrder',
  async (bookingId, { rejectWithValue }) => {
    try {
      const { data } = await apiPost('/payments/create-order', { bookingId });
      return data;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Could not start payment'));
    }
  },
);

/**
 * Verifies a payment. In mock mode the client simulates the gateway callback;
 * with Razorpay configured the checkout handler supplies real identifiers.
 */
export const verifyPayment = createAsyncThunk(
  'bookings/verifyPayment',
  async ({ bookingId, ...fields }, { rejectWithValue }) => {
    try {
      const { data } = await apiPost('/payments/verify', { bookingId, ...fields });
      return data?.booking;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Payment verification failed'));
    }
  },
);

export const fetchMyBookings = createAsyncThunk(
  'bookings/fetchMy',
  async ({ status, page = 1, limit = 10 } = {}, { rejectWithValue }) => {
    try {
      const { data, meta } = await apiGet('/bookings/my', { status, page, limit });
      return { bookings: data || [], meta };
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Could not load bookings'));
    }
  },
);

export const fetchBooking = createAsyncThunk(
  'bookings/fetchOne',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await apiGet(`/bookings/${id}`);
      return data?.booking;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Booking not found'));
    }
  },
);

export const cancelBooking = createAsyncThunk(
  'bookings/cancel',
  async ({ id, reason }, { rejectWithValue }) => {
    try {
      const { data } = await apiPatch(`/bookings/${id}/cancel`, { reason });
      return data?.booking;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Cancellation failed'));
    }
  },
);

export const payAtHotel = createAsyncThunk(
  'bookings/payAtHotel',
  async (bookingId, { rejectWithValue }) => {
    try {
      const { data } = await apiPost(`/bookings/${bookingId}/pay-at-hotel`);
      return data?.booking;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Could not confirm your booking'));
    }
  },
);

const initialState = {
  current: null,
  createStatus: 'idle',
  createError: null,
  quote: null,
  quoteStatus: 'idle',
  quoteError: null,
  order: null,
  payStatus: 'idle',
  payError: null,
  list: [],
  listMeta: { total: 0, page: 1, limit: 10 },
  listStatus: 'idle',
  detail: null,
  detailStatus: 'idle',
  cancelStatus: 'idle',
};

export const bookingsSlice = createSlice({
  name: 'bookings',
  initialState,
  reducers: {
    resetBookingFlow(state) {
      state.current = null;
      state.quote = null;
      state.order = null;
      state.createStatus = 'idle';
      state.createError = null;
      state.payStatus = 'idle';
      state.payError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(priceQuote.pending, (s) => { s.quoteStatus = 'loading'; })
      .addCase(priceQuote.fulfilled, (s, a) => { s.quoteStatus = 'succeeded'; s.quote = a.payload; })
      .addCase(priceQuote.rejected, (s, a) => { s.quoteStatus = 'failed'; s.quoteError = a.payload; })
      .addCase(createBooking.pending, (s) => { s.createStatus = 'loading'; s.createError = null; })
      .addCase(createBooking.fulfilled, (s, a) => { s.createStatus = 'succeeded'; s.current = a.payload; })
      .addCase(createBooking.rejected, (s, a) => { s.createStatus = 'failed'; s.createError = a.payload; })
      .addCase(createPaymentOrder.pending, (s) => { s.payStatus = 'creating_order'; })
      .addCase(createPaymentOrder.fulfilled, (s, a) => { s.order = a.payload; })
      .addCase(createPaymentOrder.rejected, (s, a) => { s.payStatus = 'failed'; s.payError = a.payload; })
      .addCase(verifyPayment.pending, (s) => { s.payStatus = 'verifying'; })
      .addCase(verifyPayment.fulfilled, (s, a) => { s.payStatus = 'paid'; s.current = a.payload; })
      .addCase(verifyPayment.rejected, (s, a) => { s.payStatus = 'failed'; s.payError = a.payload; })
      .addCase(fetchMyBookings.pending, (s) => { s.listStatus = 'loading'; })
      .addCase(fetchMyBookings.fulfilled, (s, a) => {
        s.listStatus = 'succeeded';
        s.list = a.payload.bookings;
        s.listMeta = a.payload.meta;
      })
      .addCase(fetchMyBookings.rejected, (s) => { s.listStatus = 'failed'; })
      .addCase(fetchBooking.pending, (s) => { s.detailStatus = 'loading'; })
      .addCase(fetchBooking.fulfilled, (s, a) => { s.detailStatus = 'succeeded'; s.detail = a.payload; })
      .addCase(fetchBooking.rejected, (s) => { s.detailStatus = 'failed'; })
      .addCase(cancelBooking.pending, (s) => { s.cancelStatus = 'loading'; })
      .addCase(cancelBooking.fulfilled, (s, a) => {
        s.cancelStatus = 'succeeded';
        s.detail = a.payload;
        s.list = s.list.map((b) => (b._id === a.payload._id ? a.payload : b));
      })
      .addCase(cancelBooking.rejected, (s) => { s.cancelStatus = 'failed'; })
      .addCase(payAtHotel.pending, (s) => { s.payStatus = 'paying'; s.payError = null; })
      .addCase(payAtHotel.fulfilled, (s, a) => {
        s.payStatus = 'paid';
        s.current = a.payload;
        if (s.detail) s.detail = a.payload;
        s.list = s.list.map((b) => (b._id === a.payload._id ? a.payload : b));
      })
      .addCase(payAtHotel.rejected, (s, a) => { s.payStatus = 'failed'; s.payError = a.payload; });
  },
});

export const { resetBookingFlow } = bookingsSlice.actions;
export default bookingsSlice.reducer;
