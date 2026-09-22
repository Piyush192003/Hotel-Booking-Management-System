import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiGet, apiPatch, getApiErrorMessage } from '../../services/apiClient';

export const fetchNotifications = createAsyncThunk(
  'notifications/fetch',
  async ({ page = 1, limit = 15 } = {}, { rejectWithValue }) => {
    try {
      const { data, meta } = await apiGet('/notifications', { page, limit });
      return { notifications: data || [], meta };
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Could not load notifications'));
    }
  },
);

export const fetchUnreadCount = createAsyncThunk(
  'notifications/unreadCount',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await apiGet('/notifications/unread-count');
      // Server returns { unread } (older shape used { count }).
      return data?.unread ?? data?.count ?? 0;
    } catch {
      return rejectWithValue('unread count failed');
    }
  },
);

export const markNotificationRead = createAsyncThunk(
  'notifications/markRead',
  async (id, { rejectWithValue }) => {
    try {
      await apiPatch(`/notifications/${id}/read`, {});
      return id;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Could not update notification'));
    }
  },
);

export const markAllNotificationsRead = createAsyncThunk(
  'notifications/markAllRead',
  async (_, { rejectWithValue }) => {
    try {
      await apiPatch('/notifications/read-all', {});
      return true;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Could not update notifications'));
    }
  },
);

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: {
    items: [],
    total: 0,
    unreadCount: 0,
    status: 'idle',
    error: null,
  },
  reducers: {
    clearNotifications(state) {
      state.items = [];
      state.unreadCount = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (s) => { s.status = 'loading'; })
      .addCase(fetchNotifications.fulfilled, (s, a) => {
        s.status = 'succeeded';
        s.items = a.payload.notifications;
        s.total = a.payload.meta.total || a.payload.notifications.length;
        s.unreadCount = a.payload.notifications.filter((n) => !n.isRead).length;
      })
      .addCase(fetchNotifications.rejected, (s, a) => { s.status = 'failed'; s.error = a.payload; })
      .addCase(fetchUnreadCount.fulfilled, (s, a) => { s.unreadCount = a.payload; })
      .addCase(markNotificationRead.fulfilled, (s, a) => {
        const item = s.items.find((n) => n._id === a.payload);
        if (item && !item.isRead) {
          item.isRead = true;
          s.unreadCount = Math.max(0, s.unreadCount - 1);
        }
      })
      .addCase(markAllNotificationsRead.fulfilled, (s) => {
        s.items.forEach((n) => { n.isRead = true; });
        s.unreadCount = 0;
      });
  },
});

export const { clearNotifications } = notificationsSlice.actions;
export default notificationsSlice.reducer;
