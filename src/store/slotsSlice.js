import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { api } from '../services/api';

export const fetchSlots = createAsyncThunk(
  'slots/fetchSlots',
  async ({ businessId, date }, { rejectWithValue }) => {
    try {
      const res = await api.slots.getSlotsByDate(businessId, date);
      return { data: res?.data || res || [], date };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const generateSlots = createAsyncThunk(
  'slots/generateSlots',
  async ({ businessId, startDate, endDate }, { rejectWithValue }) => {
    try {
      await api.slots.generateSlots(businessId, startDate, endDate);
      return { businessId, startDate, endDate };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const blockSlots = createAsyncThunk(
  'slots/blockSlots',
  async ({ businessId, date, startTime, endTime, reason }, { rejectWithValue }) => {
    try {
      await api.slots.blockSlots(businessId, date, startTime, endTime, reason);
      return { businessId, date };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const slotsSlice = createSlice({
  name: 'slots',
  initialState: {
    byBusiness: {},
    loading: false,
    error: null,
  },
  reducers: {
    clearSlots: (state, action) => {
      const bizId = action.payload;
      if (bizId) {
        delete state.byBusiness[bizId];
      } else {
        state.byBusiness = {};
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSlots.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSlots.fulfilled, (state, action) => {
        state.loading = false;
        const { data, date } = action.payload;
        if (!state.byBusiness._all) state.byBusiness._all = {};
        state.byBusiness._all[date] = data;
      })
      .addCase(fetchSlots.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(generateSlots.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(generateSlots.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(generateSlots.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(blockSlots.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(blockSlots.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(blockSlots.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearSlots } = slotsSlice.actions;
export const selectSlotsLoading = (state) => state.slots.loading;
export const selectSlotsError = (state) => state.slots.error;
export const selectSlotsByDate = (state, date) => state.slots.byBusiness._all?.[date] || [];
export default slotsSlice.reducer;
