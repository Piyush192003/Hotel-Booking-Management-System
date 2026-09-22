import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import hotelsReducer from '../features/hotels/hotelsSlice';
import bookingsReducer from '../features/bookings/bookingsSlice';
import wishlistReducer from '../features/wishlist/wishlistSlice';
import notificationsReducer from '../features/notifications/notificationsSlice';
import uiReducer from './uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    hotels: hotelsReducer,
    bookings: bookingsReducer,
    wishlist: wishlistReducer,
    notifications: notificationsReducer,
    ui: uiReducer,
  },
});

export default store;
