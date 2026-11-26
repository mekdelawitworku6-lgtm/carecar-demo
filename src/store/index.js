import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import uiReducer from './uiSlice';
import slotsReducer from './slotsSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    slots: slotsReducer,
  },
});

export default store;
