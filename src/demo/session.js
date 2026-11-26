/**
 * Demo session helpers.
 *
 * The real app stores its JWT session in localStorage. The demo stores a
 * fake one in exactly the same keys so the existing App session-restore
 * logic keeps working without modification.
 */

export const DEMO_ROLES = {
  CUSTOMER: {
    id: '3f1a9c2e-7b4d-4c8a-9f11-6a2d5e8b0c01',
    token: 'demo.jwt.customer',
    refreshToken: 'demo.refresh.customer',
    role: 'CUSTOMER',
    fullName: 'Alemayehu Tesfaye',
    phone: '+251911234567',
    email: 'alemayehu@example.com',
  },
  BUSINESS_OWNER: {
    id: '8c2f4a6b-1d9e-4f73-b5a2-7e1c0d9f4b12',
    token: 'demo.jwt.owner',
    refreshToken: 'demo.refresh.owner',
    role: 'BUSINESS_OWNER',
    fullName: 'Mekdes Bekele',
    phone: '+251912345678',
    email: 'mekdes@carecar.demo',
  },
  ADMIN: {
    id: 'b6d3e1a7-5c2f-49ab-8d40-1f9e2a7c3d45',
    token: 'demo.jwt.admin',
    refreshToken: 'demo.refresh.admin',
    role: 'ADMIN',
    fullName: 'Dawit Haile',
    phone: '+251913456789',
    email: 'dawit@carecar.demo',
  },
}

const SESSION_KEYS = ['userId', 'token', 'refreshToken', 'role', 'fullName', 'phone']

export const DEMO_BUSINESS_ID = 'biz-carecar-addis-01'

export function getDemoRole() {
  const role = localStorage.getItem('role')
  return DEMO_ROLES[role] ? role : 'CUSTOMER'
}

export function getDemoUser(role = getDemoRole()) {
  return { ...DEMO_ROLES[role] }
}

export function applyDemoRole(role) {
  const user = getDemoUser(role)
  SESSION_KEYS.forEach((key) => {
    if (user[key] !== undefined) localStorage.setItem(key, String(user[key]))
  })
  localStorage.setItem('demoRole', role)
  localStorage.setItem('demoBusinessId', DEMO_BUSINESS_ID)
  return user
}

export function clearDemoSession() {
  [...SESSION_KEYS, 'demoRole'].forEach((key) => localStorage.removeItem(key))
}

export function seedDemoSession() {
  const role = getDemoRole()
  applyDemoRole(role)
  return getDemoUser(role)
}

export const ROLE_LABELS = {
  CUSTOMER: 'Customer',
  BUSINESS_OWNER: 'Business Owner',
  ADMIN: 'Admin',
}
