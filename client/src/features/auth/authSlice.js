import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiPost, apiGet, apiPatch, getApiErrorMessage, getApiErrorCode, storeAccessToken, clearAccessToken } from '../../services/apiClient';

const emptyUser = null;

/** Builds a structured rejection payload so pages can react to specific error codes. */
function apiErrorPayload(err, fallbackMessage) {
  return {
    message: getApiErrorMessage(err, fallbackMessage),
    code: getApiErrorCode(err),
  };
}

export const registerUser = createAsyncThunk(
  'auth/register',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await apiPost('/auth/register', payload);
      return data;
    } catch (err) {
      return rejectWithValue(apiErrorPayload(err, 'Registration failed'));
    }
  },
);

export const loginUser = createAsyncThunk(
  'auth/login',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await apiPost('/auth/login', payload);
      return data;
    } catch (err) {
      return rejectWithValue(apiErrorPayload(err, 'Invalid email or password'));
    }
  },
);

export const fetchMe = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try {
    const { data } = await apiGet('/auth/me');
    return data?.user || null;
  } catch {
    return rejectWithValue('Not authenticated');
  }
});

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  try {
    await apiPost('/auth/logout', {});
  } catch {
    /* clearing local state regardless */
  }
  clearAccessToken();
  return true;
});

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await apiPatch('/auth/profile', payload);
      return data?.user;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Profile update failed'));
    }
  },
);

export const changePassword = createAsyncThunk(
  'auth/changePassword',
  async (payload, { rejectWithValue }) => {
    try {
      await apiPost('/auth/change-password', payload);
      return true;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Password change failed'));
    }
  },
);

/**
 * Settings → "Log out of all other devices". The server rotates the token
 * version (invalidating every other session) and returns a fresh pair for
 * this device, which we swap into localStorage.
 */
export const logoutOtherDevices = createAsyncThunk(
  'auth/logoutOtherDevices',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await apiPost('/settings/logout-all', {});
      return { user: data?.user || null, accessToken: data?.accessToken || null };
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Could not log out other devices'));
    }
  },
);

/**
 * Settings → "Delete account" (GDPR-style, password-confirmed). The response
 * carries the anonymised user; callers dispatch `profileDeleted` + `logoutUser`
 * to finish the sign-out flow.
 */
export const accountDeleted = createAsyncThunk(
  'auth/deleteAccount',
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await apiPost('/settings/account/delete', payload);
      return data || {};
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Account deletion failed'));
    }
  },
);

export const forgotPassword = createAsyncThunk(
  'auth/forgotPassword',
  async (email, { rejectWithValue }) => {
    try {
      await apiPost('/auth/forgot-password', { email });
      return true;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Request failed'));
    }
  },
);

export const resetPassword = createAsyncThunk(
  'auth/resetPassword',
  async ({ token, password }, { rejectWithValue }) => {
    try {
      await apiPost('/auth/reset-password', { token, password });
      return true;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Password reset failed'));
    }
  },
);

export const verifyEmail = createAsyncThunk(
  'auth/verifyEmail',
  async ({ token, email }, { rejectWithValue }) => {
    try {
      const { data } = await apiPost('/auth/verify-email', { token, email });
      return data?.user || true;
    } catch (err) {
      return rejectWithValue(getApiErrorMessage(err, 'Email verification failed'));
    }
  },
);

export const resendVerification = createAsyncThunk(
  'auth/resendVerification',
  async (email, { rejectWithValue }) => {
    try {
      const { data } = await apiPost('/auth/resend-verification', { email });
      return data || {};
    } catch (err) {
      return rejectWithValue(apiErrorPayload(err, 'Could not resend the verification code'));
    }
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: emptyUser,
    status: 'idle', // idle | loading | authenticated | guest
    booted: false,
    error: null,
    devVerificationCode: null,
    devEmailPreviewUrl: null,
    actionStatus: 'idle',
    actionError: null,
  },
  reducers: {
    clearAuthError(state) {
      state.error = null;
      state.actionError = null;
    },
    setUser(state, action) {
      if (action.payload !== undefined) state.user = action.payload;
    },
    clearDevCode(state) {
      state.devVerificationCode = null;
      state.devEmailPreviewUrl = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = action.payload ? 'authenticated' : 'guest';
        state.booted = true;
      })
      .addCase(fetchMe.rejected, (state) => {
        state.user = null;
        state.status = 'guest';
        state.booted = true;
      })
      .addCase(loginUser.pending, (state) => {
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.status = 'authenticated';
        if (action.payload.tokens?.accessToken) {
          storeAccessToken(action.payload.tokens.accessToken);
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(registerUser.pending, (state) => {
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        // Registration does NOT authenticate: the user must verify their
        // email and then log in explicitly.
        state.devVerificationCode = action.payload?.devVerificationCode || null;
        state.devEmailPreviewUrl = action.payload?.devEmailPreviewUrl || null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.status = 'guest';
      })
      .addCase(verifyEmail.fulfilled, (state) => {
        // Verification alone does not log the user in; they proceed to login.
        state.devVerificationCode = null;
        state.devEmailPreviewUrl = null;
      })
      .addCase(resendVerification.pending, (state) => {
        state.actionError = null;
      })
      .addCase(resendVerification.fulfilled, (state, action) => {
        if (action.payload?.alreadyVerified) {
          state.devVerificationCode = null;
          state.devEmailPreviewUrl = null;
          return;
        }
        if (action.payload?.devVerificationCode) {
          state.devVerificationCode = action.payload.devVerificationCode;
          state.devEmailPreviewUrl = action.payload.devEmailPreviewUrl || null;
        }
      })
      .addCase(updateProfile.pending, (state) => {
        state.actionStatus = 'loading';
        state.actionError = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.actionStatus = 'succeeded';
        state.user = action.payload;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.actionStatus = 'failed';
        state.actionError = action.payload;
      })
      .addCase(changePassword.pending, (state) => {
        state.actionStatus = 'loading';
        state.actionError = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.actionStatus = 'succeeded';
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.actionStatus = 'failed';
        state.actionError = action.payload;
      })
      .addCase(logoutOtherDevices.fulfilled, (state, action) => {
        // Server bumped tokenVersion and issued a fresh pair — swap it in.
        state.user = action.payload.user || state.user;
        if (action.payload.accessToken) storeAccessToken(action.payload.accessToken);
        state.actionStatus = 'succeeded';
      })
      .addCase(accountDeleted.pending, (state) => {
        state.actionStatus = 'loading';
        state.actionError = null;
      })
      .addCase(accountDeleted.fulfilled, (state, action) => {
        state.user = action.payload.user || null;
        state.status = 'guest';
        state.actionStatus = 'succeeded';
        clearAccessToken();
      })
      .addCase(accountDeleted.rejected, (state, action) => {
        state.actionStatus = 'failed';
        state.actionError = action.payload;
      });
  },
});

export const { clearAuthError, clearDevCode, setUser } = authSlice.actions;
export default authSlice.reducer;
