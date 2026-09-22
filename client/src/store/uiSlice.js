import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    mobileMenuOpen: false,
    toasts: [],
    _nextId: 1,
  },
  reducers: {
    toggleMobileMenu(state, action) {
      state.mobileMenuOpen = typeof action.payload === 'boolean' ? action.payload : !state.mobileMenuOpen;
    },
    pushToast(state, action) {
      const { type = 'info', message, timeout = 4000 } = action.payload || {};
      state.toasts.push({ id: state._nextId++, type, message, timeout });
    },
    dismissToast(state, action) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
  },
});

export const { toggleMobileMenu, pushToast, dismissToast } = uiSlice.actions;

/** Convenience thunk so components can toast without touching store internals. */
export const toast = (message, type = 'info') => (dispatch) => dispatch(pushToast({ message, type }));

export default uiSlice.reducer;
