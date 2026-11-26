import store from '../store'
import { setUser, logout } from '../store/authSlice'
import { setActiveTab, setUnreadCount, setSelectedBusiness } from '../store/uiSlice'
import { applyDemoRole, clearDemoSession, getDemoRole } from './session'
import { resetMockDb } from './mockApi'

/** Switch the whole app to another role in one click. */
export function switchDemoRole(role) {
  const user = applyDemoRole(role)
  store.dispatch(setUser(user))
  store.dispatch(setActiveTab('dashboard'))
  store.dispatch(setSelectedBusiness(null))
  store.dispatch(setUnreadCount(0))
  return user
}

/** Demo-aware logout: clears the fake session and shows the role picker. */
export function demoLogout() {
  clearDemoSession()
  store.dispatch(logout())
  store.dispatch(setActiveTab('dashboard'))
}

/** Reset every in-browser mutation back to the original sample data. */
export function resetDemoData() {
  Object.keys(localStorage)
    .filter((key) => key.startsWith('demo:') || key.startsWith('carecar_demo_'))
    .forEach((key) => localStorage.removeItem(key))
  localStorage.removeItem('carecar_fcm_token')
  resetMockDb()
  switchDemoRole(getDemoRole() || 'CUSTOMER')
}
