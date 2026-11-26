import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    activeTab: 'dashboard',
    adminSubTab: 'analytics',
    toasts: [],
    unreadCount: 0,
    selectedBusiness: null,
  },
  reducers: {
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
    },
    setAdminSubTab: (state, action) => {
      state.adminSubTab = action.payload;
    },
    addToast: (state, action) => {
      state.toasts.push(action.payload);
    },
    removeToast: (state, action) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    setUnreadCount: (state, action) => {
      state.unreadCount = action.payload;
    },
    incrementUnread: (state) => {
      state.unreadCount += 1;
    },
    setSelectedBusiness: (state, action) => {
      state.selectedBusiness = action.payload;
    },
  },
});

export const { setActiveTab, setAdminSubTab, addToast, removeToast, setUnreadCount, incrementUnread, setSelectedBusiness } = uiSlice.actions;
export const selectActiveTab = (state) => state.ui.activeTab;
export const selectAdminSubTab = (state) => state.ui.adminSubTab;
export const selectToasts = (state) => state.ui.toasts;
export const selectUnreadCount = (state) => state.ui.unreadCount;
export const selectSelectedBusiness = (state) => state.ui.selectedBusiness;
export default uiSlice.reducer;
