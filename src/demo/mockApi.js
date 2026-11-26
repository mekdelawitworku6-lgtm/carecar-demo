/**
 * Backend-free replacement for services/api.js.
 *
 * It mirrors the real gateway contract (same method names and `{ data }`
 * envelopes) but reads and writes a localStorage-backed fixture database.
 * No fetch, no Firebase, no environment variables, no network access.
 */

import {
  DB_KEY,
  PRIMARY_BUSINESS_ID,
  createSeedDb,
  demoUuid,
} from './mockDb.js'

let db = null
let idCounter = 50000

const wait = (ms = 65) => new Promise((resolve) => setTimeout(resolve, ms))
const ok = (data) => ({ data })
const collection = (items, meta) => ({ data: items, ...(meta ? { meta } : {}) })

export const formatPhoneForApi = (rawPhone) => {
  if (typeof rawPhone !== 'string') return rawPhone
  let digits = rawPhone.trim().replace(/[\s\-().]/g, '')
  if (digits.startsWith('+251')) return `+251${digits.slice(4).replace(/^0+/, '')}`
  if (digits.startsWith('251')) return `+${digits.replace(/^0+/, '')}`
  if (digits.startsWith('0')) return `+251${digits.replace(/^0+/, '')}`
  if (/^\d{9}$/.test(digits)) return `+251${digits}`
  return digits
}

/** Kept so imports from the real API module keep working. */
export function clearApiCache() {}

function loadDb() {
  if (!db) {
    try {
      const raw = localStorage.getItem(DB_KEY)
      db = raw ? JSON.parse(raw) : createSeedDb()
    } catch {
      db = createSeedDb()
    }
    persist()
  }
  return db
}

function persist() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db))
  } catch {
    // Storage can be full or disabled; the demo still works in memory.
  }
}

export function resetMockDb() {
  localStorage.removeItem(DB_KEY)
  db = createSeedDb()
  persist()
  return db
}

const nextId = () => demoUuid(++idCounter)

const localYmd = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const parseYmd = (value) => new Date(`${value}T12:00:00`)

const addDaysToYmd = (value, days) => {
  const date = parseYmd(value)
  date.setDate(date.getDate() + days)
  return localYmd(date)
}

const hhmm = (minutes) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

const timeToMinutes = (value = '00:00') => {
  const [hour, minute] = String(value).split(':').map(Number)
  return (hour || 0) * 60 + (minute || 0)
}

function plain(input) {
  if (!input) return input
  if (typeof FormData !== 'undefined' && input instanceof FormData) {
    const output = {}
    for (const [key, value] of input.entries()) {
      output[key] = typeof value === 'string' ? value : value?.name ? `/uploads/${value.name}` : ''
    }
    return output
  }
  return input
}

function currentUser(store = loadDb()) {
  const id = localStorage.getItem('userId')
  const role = localStorage.getItem('role')
  return store.users.find((user) => user.id === id)
    || store.users.find((user) => user.role === role)
    || store.users[0]
}

function currentBusiness(store = loadDb()) {
  const user = currentUser(store)
  return store.businesses.find((business) => business.ownerId === user?.id) || null
}

function sessionFor(user) {
  const safe = { ...user }
  delete safe.password
  return {
    accessToken: `demo.jwt.${String(user.role || 'user').toLowerCase()}`,
    refreshToken: `demo.refresh.${String(user.role || 'user').toLowerCase()}`,
    user: safe,
  }
}

function paginate(items, params = {}) {
  const page = Math.max(1, Number(params.page) || 1)
  const limit = Math.max(1, Number(params.limit) || 20)
  const total = items.length
  return {
    items: items.slice((page - 1) * limit, page * limit),
    meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
  }
}

function sortNewest(items) {
  return [...items].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
}

function pushHistory(booking, toStatus, reason = '', fromStatus = booking.status) {
  db.history.push({
    id: nextId(),
    bookingId: booking.id,
    fromStatus,
    toStatus,
    reason,
    createdAt: new Date().toISOString(),
  })
}

function notify(title, body, type = 'SYSTEM') {
  db.notifications.unshift({
    id: nextId(),
    isRead: false,
    type,
    title,
    body,
    message: body,
    createdAt: new Date().toISOString(),
  })
}

function ensureAvailability(workerId) {
  const store = loadDb()
  if (!store.availability[workerId]) {
    store.availability[workerId] = Array.from({ length: 7 }, (_, day) => ({
      dayOfWeek: day,
      isAvailable: day !== 0,
      startTime: '09:00',
      endTime: '18:00',
    }))
  }
  return store.availability[workerId]
}

function bookSlots(slotIds = []) {
  const store = loadDb()
  slotIds.forEach((slotId) => {
    const slot = store.slots.find((item) => item.id === slotId)
    if (slot) slot.status = 'BOOKED'
  })
}

function generateMissingSlots(businessId, startDate, endDate) {
  const store = loadDb()
  let cursor = startDate
  let created = 0
  let guard = 0
  while (cursor <= endDate && guard < 90) {
    guard += 1
    for (let minute = 9 * 60; minute < 18 * 60; minute += 30) {
      const exists = store.slots.some(
        (slot) => slot.businessId === businessId && slot.date === cursor && slot.startTime === hhmm(minute)
      )
      if (!exists) {
        store.slots.push({
          id: nextId(),
          businessId,
          date: cursor,
          startTime: hhmm(minute),
          endTime: hhmm(minute + 30),
          status: 'AVAILABLE',
          blockReason: null,
        })
        created += 1
      }
    }
    cursor = addDaysToYmd(cursor, 1)
  }
  return created
}

const REVENUE_STATUSES = ['COMPLETED', 'SUCCESS']

function revenueAmount(transactions) {
  return transactions
    .filter((txn) => REVENUE_STATUSES.includes(String(txn.status).toUpperCase()))
    .reduce((total, txn) => total + (Number(txn.amount) || 0), 0)
}

function revenueEnvelope(amount, transactionCount = 0) {
  return {
    data: {
      totalAmount: amount,
      totalRevenue: amount,
      total: amount,
      amount,
      transactionCount,
    },
    total: amount,
    amount,
  }
}

/* ─────────────────────────── auth ─────────────────────────── */

const auth = {
  checkPhone: async (phone) => {
    await wait(40)
    const store = loadDb()
    const normalised = formatPhoneForApi(phone)
    return ok({ exists: store.users.some((user) => formatPhoneForApi(user.phone) === normalised) })
  },

  login: async (phone) => {
    await wait(120)
    const store = loadDb()
    const normalised = formatPhoneForApi(phone)
    const user = store.users.find((item) => formatPhoneForApi(item.phone) === normalised && item.isActive !== false)
    if (!user) throw new Error('Invalid phone number or password')
    return ok(sessionFor(user))
  },

  loginWithEmail: async (email) => {
    await wait(120)
    const store = loadDb()
    const user = store.users.find((item) => String(item.email || '').toLowerCase() === String(email || '').toLowerCase() && item.isActive !== false)
    if (!user) throw new Error('Invalid email or password')
    return ok(sessionFor(user))
  },

  register: async (data) => {
    await wait(130)
    const store = loadDb()
    const payload = plain(data)
    const normalised = formatPhoneForApi(payload.phone)
    const existing = store.users.find((user) => formatPhoneForApi(user.phone) === normalised)
    if (existing) throw new Error('An account with this phone number already exists')
    const names = String(payload.fullName || '').trim().split(/\s+/)
    const user = {
      id: nextId(),
      role: payload.role === 'BUSINESS_OWNER' ? 'BUSINESS_OWNER' : 'CUSTOMER',
      fullName: payload.fullName || 'Demo User',
      firstName: payload.firstName || names[0] || 'Demo',
      lastName: payload.lastName || names.slice(1).join(' ') || 'User',
      phone: normalised,
      email: payload.email || `${normalised.slice(1)}@demo.carecar.et`,
      digitalId: payload.digitalId || payload.faydaId || payload.code || '',
      isActive: true,
      createdAt: new Date().toISOString(),
    }
    store.users.push(user)
    persist()
    return ok(sessionFor(user))
  },

  sendOtp: async () => { await wait(60); return ok({ success: true, demoCode: '1234' }) },
  verifyOtp: async () => { await wait(60); return ok({ success: true }) },
  sendPasswordResetOtp: async () => { await wait(60); return ok({ success: true, demoCode: '1234' }) },
  verifyPasswordResetOtp: async () => { await wait(60); return ok({ success: true }) },
  resetPassword: async () => { await wait(80); return ok({ success: true }) },
  sendDeleteOtp: async () => { await wait(60); return ok({ success: true, demoCode: '1234' }) },
  deleteAccount: async (phone) => {
    await wait(100)
    const store = loadDb()
    const normalised = formatPhoneForApi(phone)
    const user = store.users.find((item) => formatPhoneForApi(item.phone) === normalised)
    if (user) user.isActive = false
    persist()
    return ok({ success: true })
  },

  getMe: async () => {
    await wait(45)
    return ok(currentUser())
  },

  logout: async () => { await wait(30); return ok({ success: true }) },
  refreshToken: async () => {
    await wait(40)
    return ok({ accessToken: 'demo.jwt.refreshed', refreshToken: 'demo.refresh.refreshed' })
  },
  updateProfile: async (data) => {
    await wait(90)
    const store = loadDb()
    const user = currentUser(store)
    const payload = plain(data)
    Object.assign(user, payload)
    if (payload.firstName || payload.lastName) {
      user.fullName = [payload.firstName || user.firstName, payload.lastName || user.lastName].filter(Boolean).join(' ')
    }
    persist()
    return ok({ success: true })
  },
  changePassword: async () => { await wait(80); return ok({ success: true }) },

  admin: {
    listUsers: async (params = {}) => {
      await wait(55)
      const store = loadDb()
      let users = [...store.users]
      if (params.role && params.role !== 'ALL') users = users.filter((user) => user.role === params.role)
      if (params.search) {
        const term = String(params.search).toLowerCase()
        users = users.filter((user) =>
          [user.fullName, user.email, user.phone, user.role].some((value) => String(value || '').toLowerCase().includes(term))
        )
      }
      const { items, meta } = paginate(sortNewest(users), params)
      return collection(items, meta)
    },
    setUserStatus: async (userId, isActive) => {
      await wait(70)
      const store = loadDb()
      const user = store.users.find((item) => item.id === userId)
      if (user) user.isActive = Boolean(isActive)
      persist()
      return ok({ success: true })
    },
    getStats: async () => {
      await wait(55)
      const store = loadDb()
      const usersByRole = store.users.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1
        return acc
      }, {})
      return ok({
        usersByRole,
        activeUsers: store.users.filter((user) => user.isActive !== false).length,
        recentRegistrations: store.users.filter((user) => new Date(user.createdAt).getTime() > Date.now() - 14 * 24 * 60 * 60 * 1000).length,
        totalUsers: store.users.length,
      })
    },
  },
}

/* ─────────────────────────── user ─────────────────────────── */

const user = {
  getProfile: async () => { await wait(45); return ok(currentUser()) },
  updateProfile: async (data) => {
    await wait(80)
    const store = loadDb()
    const account = currentUser(store)
    Object.assign(account, plain(data))
    persist()
    return ok({ success: true })
  },

  getVehicles: async () => {
    await wait(50)
    const store = loadDb()
    const account = currentUser(store)
    return collection(store.vehicles.filter((item) => item.customerId === account.id))
  },
  getVehicle: async (id) => {
    await wait(40)
    return ok(loadDb().vehicles.find((item) => item.id === id) || null)
  },
  addVehicle: async (data) => {
    await wait(90)
    const store = loadDb()
    const payload = plain(data)
    const account = currentUser(store)
    const isDefault = Boolean(payload.isDefault) || store.vehicles.filter((v) => v.customerId === account.id).length === 0
    if (isDefault) store.vehicles.forEach((item) => { if (item.customerId === account.id) item.isDefault = false })
    store.vehicles.push({
      id: nextId(),
      customerId: account.id,
      make: payload.make || 'Toyota',
      model: payload.model || '',
      year: Number(payload.year) || new Date().getFullYear(),
      plateNumber: String(payload.plateNumber || '').toUpperCase(),
      color: payload.color || '',
      vehicleType: payload.vehicleType || 'SEDAN',
      isDefault,
    })
    persist()
    return ok({ success: true })
  },
  updateVehicle: async (id, data) => {
    await wait(85)
    const store = loadDb()
    const vehicle = store.vehicles.find((item) => item.id === id)
    if (!vehicle) throw new Error('Vehicle not found')
    const payload = plain(data)
    if (payload.plateNumber) payload.plateNumber = String(payload.plateNumber).toUpperCase()
    if (payload.year) payload.year = Number(payload.year)
    Object.assign(vehicle, payload)
    persist()
    return ok({ success: true })
  },
  setDefaultVehicle: async (id) => {
    await wait(70)
    const store = loadDb()
    const account = currentUser(store)
    store.vehicles.forEach((item) => { item.isDefault = item.id === id && item.customerId === account.id })
    persist()
    return ok({ success: true })
  },
  deleteVehicle: async (id) => {
    await wait(70)
    const store = loadDb()
    store.vehicles = store.vehicles.filter((item) => item.id !== id)
    persist()
    return ok({ success: true })
  },

  getMyBusiness: async () => {
    await wait(50)
    return ok(currentBusiness())
  },
  createBusiness: async (data) => {
    await wait(130)
    const store = loadDb()
    const payload = plain(data)
    const account = currentUser(store)
    const business = {
      id: PRIMARY_BUSINESS_ID || nextId(),
      ownerId: account.id,
      businessName: payload.businessName || 'My Car Wash',
      description: payload.description || '',
      address: payload.address || '',
      city: payload.city || 'Addis Ababa',
      phone: payload.phone || account.phone,
      email: payload.email || account.email,
      googleMapsLink: payload.googleMapsLink || '',
      latitude: 9.032,
      longitude: 38.7469,
      workingHours: payload.workingHours || '',
      photos: [`/uploads/${payload.proofOfOwnership || 'demo-business.svg'}`],
      isApproved: false,
      is_approved: false,
      isSuspended: false,
      mobileServiceEnabled: false,
      mobileServiceRadiusKm: 5,
      queueCount: 0,
      createdAt: new Date().toISOString(),
    }
    store.businesses.push(business)
    persist()
    return ok(business)
  },
  updateBusiness: async (data) => {
    await wait(110)
    const store = loadDb()
    const business = currentBusiness(store)
    if (!business) throw new Error('No business found for this account')
    const payload = plain(data)
    ;['id', 'workers', 'photos', 'isApproved', 'is_approved', 'isSuspended', 'ownerId'].forEach((key) => delete payload[key])
    Object.assign(business, payload)
    persist()
    return ok({ success: true })
  },

  submitBusinessApplication: async (data) => {
    await wait(110)
    const store = loadDb()
    const payload = plain(data)
    store.businessApplications.push({
      id: nextId(),
      ...payload,
      status: 'PENDING',
      reviewNote: '',
      createdAt: new Date().toISOString(),
    })
    persist()
    return ok({ status: 'PENDING' })
  },
  getBusinessApplicationStatus: async (phone) => {
    await wait(45)
    const store = loadDb()
    const normalised = formatPhoneForApi(phone)
    const application = store.businessApplications.find((item) =>
      formatPhoneForApi(item.ownerPhone || item.phone) === normalised
    ) || store.businessApplications[0]
    return ok({ status: application?.status || 'PENDING', reviewNote: application?.reviewNote || '' })
  },

  listWorkers: async () => {
    await wait(50)
    const store = loadDb()
    const business = currentBusiness(store)
    return collection(store.workers.filter((item) => !business || item.businessId === business.id))
  },
  getWorker: async (workerId) => {
    await wait(40)
    return ok(loadDb().workers.find((item) => item.id === workerId) || null)
  },
  addWorker: async (data) => {
    await wait(100)
    const store = loadDb()
    const payload = plain(data)
    const business = currentBusiness(store)
    const names = String(payload.name || payload.fullName || 'New Worker').trim().split(/\s+/)
    const worker = {
      id: nextId(),
      businessId: business?.id || PRIMARY_BUSINESS_ID,
      name: payload.name || payload.fullName || 'New Worker',
      fullName: payload.fullName || payload.name || 'New Worker',
      firstName: names[0],
      lastName: names.slice(1).join(' '),
      phone: formatPhoneForApi(payload.phone || '+251900000000'),
      jobRole: payload.jobRole || 'Washer',
      digitalId: payload.digitalId || '',
      isActive: true,
      is_active: true,
      profileImage: payload.profileImage || '',
      washedCount: 0,
      washCount: 0,
    }
    store.workers.push(worker)
    ensureAvailability(worker.id)
    persist()
    return ok(worker)
  },
  updateWorker: async (workerId, data) => {
    await wait(90)
    const store = loadDb()
    const worker = store.workers.find((item) => item.id === workerId)
    if (!worker) throw new Error('Worker not found')
    Object.assign(worker, plain(data))
    persist()
    return ok({ success: true })
  },
  incrementWorkerWash: async (workerId) => {
    await wait(60)
    const store = loadDb()
    const worker = store.workers.find((item) => item.id === workerId)
    if (worker) {
      worker.washedCount = (worker.washedCount || 0) + 1
      worker.washCount = worker.washedCount
    }
    persist()
    return ok({ success: true })
  },
  deleteWorker: async (workerId) => {
    await wait(70)
    const store = loadDb()
    store.workers = store.workers.filter((item) => item.id !== workerId)
    delete store.availability[workerId]
    persist()
    return ok({ success: true })
  },

  admin: {
    listBusinesses: async (params = {}) => {
      await wait(50)
      const store = loadDb()
      let items = [...store.businesses]
      if (params.approved === false || params.approved === 'false') items = items.filter((item) => !item.isApproved)
      if (params.approved === true || params.approved === 'true') items = items.filter((item) => item.isApproved)
      if (params.limit && !params.page) items = items.slice(0, Number(params.limit))
      return collection(items)
    },
    approveBusiness: async (businessId) => {
      await wait(80)
      const store = loadDb()
      const business = store.businesses.find((item) => item.id === businessId)
      if (business) {
        business.isApproved = true
        business.is_approved = true
      }
      persist()
      return ok({ success: true })
    },
    suspendBusiness: async (businessId, reason) => {
      await wait(80)
      const store = loadDb()
      const business = store.businesses.find((item) => item.id === businessId)
      if (business) {
        business.isSuspended = true
        business.suspensionReason = reason
      }
      persist()
      return ok({ success: true })
    },
    listBusinessApplications: async () => {
      await wait(45)
      return collection(loadDb().businessApplications)
    },
    approveBusinessApplication: async (applicationId, note) => {
      await wait(70)
      const store = loadDb()
      const application = store.businessApplications.find((item) => item.id === applicationId)
      if (application) {
        application.status = 'APPROVED'
        application.reviewNote = note || ''
      }
      persist()
      return ok({ success: true })
    },
    rejectBusinessApplication: async (applicationId, note) => {
      await wait(70)
      const store = loadDb()
      const application = store.businessApplications.find((item) => item.id === applicationId)
      if (application) {
        application.status = 'REJECTED'
        application.reviewNote = note || ''
      }
      persist()
      return ok({ success: true })
    },
  },
}

/* ───────────────────────── business ───────────────────────── */

const business = {
  getPublic: async (businessId) => {
    await wait(45)
    return ok(loadDb().businesses.find((item) => item.id === businessId) || null)
  },
  listPublic: async (params = {}) => {
    await wait(55)
    const store = loadDb()
    let items = [...store.businesses]
    if (params.approved === true || params.approved === 'true') items = items.filter((item) => item.isApproved && !item.isSuspended)
    if (params.city) items = items.filter((item) => String(item.city).toLowerCase() === String(params.city).toLowerCase())
    if (params.limit) items = items.slice(0, Number(params.limit))
    return collection(items)
  },

  listServices: async (businessId) => {
    await wait(45)
    return collection(loadDb().services.filter((item) => item.businessId === businessId))
  },
  createService: async (businessId, data) => {
    await wait(85)
    const store = loadDb()
    const payload = plain(data)
    const service = {
      id: nextId(),
      businessId,
      name: payload.name || 'New Service',
      description: payload.description || '',
      price: Number(payload.price) || 0,
      duration: Number(payload.duration) || 30,
      isActive: payload.isActive !== false,
    }
    store.services.push(service)
    persist()
    return ok(service)
  },
  updateService: async (businessId, serviceId, data) => {
    await wait(80)
    const store = loadDb()
    const service = store.services.find((item) => item.id === serviceId && item.businessId === businessId)
    if (!service) throw new Error('Service not found')
    Object.assign(service, plain(data))
    persist()
    return ok({ success: true })
  },
  deleteService: async (businessId, serviceId) => {
    await wait(75)
    const store = loadDb()
    store.services = store.services.filter((item) => !(item.id === serviceId && item.businessId === businessId))
    persist()
    return ok({ success: true })
  },

  getConfig: async (businessId) => {
    await wait(45)
    const store = loadDb()
    const fallback = {
      slotDuration: 30,
      bufferBetweenSlots: 5,
      maxAdvanceBooking: 30,
      maxSlotsPerBooking: 5,
      operatingHours: {},
      slotDurationRules: [],
    }
    return ok(store.config[businessId] || fallback)
  },
  updateConfig: async (businessId, data) => {
    await wait(85)
    const store = loadDb()
    store.config[businessId] = { ...(store.config[businessId] || {}), ...plain(data) }
    persist()
    return ok({ success: true })
  },

  listHolidays: async (businessId) => {
    await wait(40)
    return collection(loadDb().holidays.filter((item) => !item.businessId || item.businessId === businessId))
  },
  addHoliday: async (businessId, date, reason) => {
    await wait(70)
    const store = loadDb()
    store.holidays.push({ id: nextId(), businessId, date, reason: reason || 'Holiday' })
    persist()
    return ok({ success: true })
  },
  deleteHoliday: async (_businessId, holidayId) => {
    await wait(65)
    const store = loadDb()
    store.holidays = store.holidays.filter((item) => item.id !== holidayId)
    persist()
    return ok({ success: true })
  },

  listBranches: async (businessId) => {
    await wait(45)
    return collection(loadDb().branches.filter((item) => item.businessId === businessId))
  },
  createBranch: async (businessId, data) => {
    await wait(85)
    const store = loadDb()
    const payload = plain(data)
    store.branches.push({ id: nextId(), businessId, ...payload, isActive: payload.isActive !== false })
    persist()
    return ok({ success: true })
  },
  updateBranch: async (businessId, branchId, data) => {
    await wait(80)
    const store = loadDb()
    const branch = store.branches.find((item) => item.id === branchId && item.businessId === businessId)
    if (!branch) throw new Error('Branch not found')
    Object.assign(branch, plain(data))
    persist()
    return ok({ success: true })
  },
  deleteBranch: async (businessId, branchId) => {
    await wait(70)
    const store = loadDb()
    store.branches = store.branches.filter((item) => !(item.id === branchId && item.businessId === businessId))
    persist()
    return ok({ success: true })
  },
}

/* ─────────────────────────── slots ────────────────────────── */

const slots = {
  getAvailableSlots: async (businessId, startDate, endDate) => {
    await wait(50)
    const store = loadDb()
    return collection(store.slots.filter((slot) =>
      slot.businessId === businessId && slot.date >= startDate && slot.date <= endDate && slot.status === 'AVAILABLE'
    ))
  },
  getSlotsByDate: async (businessId, date, endDate) => {
    await wait(50)
    const store = loadDb()
    return collection(store.slots.filter((slot) =>
      slot.businessId === businessId && (endDate ? slot.date >= date && slot.date <= endDate : slot.date === date)
    ))
  },
  generateSlots: async (businessId, startDate, endDate) => {
    await wait(110)
    generateMissingSlots(businessId, startDate, endDate)
    persist()
    return ok({ success: true })
  },
  blockSlots: async (businessId, date, startTime, endTime, reason) => {
    await wait(90)
    const store = loadDb()
    const start = timeToMinutes(startTime)
    const end = timeToMinutes(endTime)
    store.slots.forEach((slot) => {
      if (slot.businessId !== businessId || slot.date !== date) return
      const slotStart = timeToMinutes(slot.startTime)
      if (slotStart >= start && slotStart < end) {
        slot.status = 'BLOCKED'
        slot.blockReason = reason || 'Blocked by owner'
      }
    })
    persist()
    return ok({ success: true })
  },
  updateSlot: async (businessId, slotId, startTime, endTime) => {
    await wait(80)
    const store = loadDb()
    const slot = store.slots.find((item) => item.id === slotId && item.businessId === businessId)
    if (!slot) throw new Error('Slot not found')
    slot.startTime = startTime
    slot.endTime = endTime
    persist()
    return ok({ success: true })
  },
  bookSlots: async (_businessId, slotIds, workerId) => {
    await wait(80)
    bookSlots(slotIds)
    if (workerId) {
      const store = loadDb()
      slotIds.forEach((slotId) => {
        const slot = store.slots.find((item) => item.id === slotId)
        if (slot) slot.workerId = workerId
      })
    }
    persist()
    return ok({ success: true })
  },
  releaseSlots: async (_businessId, slotIds) => {
    await wait(75)
    const store = loadDb()
    slotIds.forEach((slotId) => {
      const slot = store.slots.find((item) => item.id === slotId)
      if (slot && slot.status === 'BOOKED') slot.status = 'AVAILABLE'
    })
    persist()
    return ok({ success: true })
  },
}

/* ─────────────────────────── workers ──────────────────────── */

const workers = {
  list: async (businessId) => {
    await wait(45)
    return collection(loadDb().workers.filter((item) => item.businessId === businessId))
  },
  get: async (businessId, workerId) => {
    await wait(40)
    return ok(loadDb().workers.find((item) => item.id === workerId && item.businessId === businessId) || null)
  },
  getAvailability: async (_businessId, workerId) => {
    await wait(45)
    return collection(ensureAvailability(workerId))
  },
  setAvailability: async (_businessId, workerId, data) => {
    await wait(80)
    const store = loadDb()
    const payload = plain(data)
    const list = Array.isArray(payload) ? payload : payload?.availabilities || []
    store.availability[workerId] = list
    persist()
    return ok({ success: true })
  },
  assign: async () => { await wait(80); return ok({ success: true }) },
  listAssignments: async () => { await wait(45); return collection([]) },
  updateAssignment: async () => { await wait(70); return ok({ success: true }) },
  incrementWash: async (_businessId, workerId) => {
    await wait(65)
    const store = loadDb()
    const worker = store.workers.find((item) => item.id === workerId)
    if (worker) {
      worker.washedCount = (worker.washedCount || 0) + 1
      worker.washCount = worker.washedCount
    }
    persist()
    return ok({ success: true })
  },
  delete: async (_businessId, workerId) => {
    await wait(65)
    const store = loadDb()
    store.workers = store.workers.filter((item) => item.id !== workerId)
    delete store.availability[workerId]
    persist()
    return ok({ success: true })
  },
}

/* ─────────────────────────── bookings ─────────────────────── */

function filteredBookings(params = {}) {
  const store = loadDb()
  const account = currentUser(store)
  let items = [...store.bookings]
  if (params.customerId) items = items.filter((item) => item.customerId === params.customerId)
  else if (params.businessId) items = items.filter((item) => item.businessId === params.businessId)
  else if (account.role === 'CUSTOMER') items = items.filter((item) => item.customerId === account.id)
  else if (account.role === 'BUSINESS_OWNER') {
    const owned = currentBusiness(store)
    items = items.filter((item) => item.businessId === owned?.id)
  }
  if (params.status) items = items.filter((item) => item.status === params.status)
  if (params.limit) items = items.slice(0, Number(params.limit))
  return sortNewest(items)
}

const bookings = {
  list: async (params = {}) => {
    await wait(55)
    return collection(filteredBookings(params))
  },
  get: async (id) => {
    await wait(40)
    return ok(loadDb().bookings.find((item) => item.id === id) || null)
  },
  create: async (data) => {
    await wait(140)
    const store = loadDb()
    const payload = plain(data)
    const account = currentUser(store)
    const business = store.businesses.find((item) => item.id === payload.businessId)
    const service = store.services.find((item) => item.id === payload.serviceId)
    const vehicle = store.vehicles.find((item) => item.id === payload.vehicleId)
    const id = nextId()
    const date = payload.date || localYmd()
    const startTime = payload.startTime || '12:00'
    const endTime = payload.endTime || startTime
    const booking = {
      id,
      customerId: payload.customerId || (account.role === 'CUSTOMER' ? account.id : payload.customerId || account.id),
      businessId: payload.businessId || PRIMARY_BUSINESS_ID,
      businessName: business?.businessName || 'CareCar Partner',
      serviceId: payload.serviceId || null,
      serviceName: service?.name || payload.serviceName || 'Car Wash Service',
      vehicleId: payload.vehicleId || null,
      vehicle: vehicle ? `${vehicle.make} ${vehicle.model} · ${vehicle.plateNumber}` : payload.vehicle || '',
      washType: payload.washType || 'ON_GARAGE',
      bookingType: payload.bookingType || 'SCHEDULED',
      date,
      startTime,
      endTime,
      slotIds: payload.slotIds || [],
      status: 'PENDING',
      totalAmount: Number(payload.totalAmount) || Number(service?.price) || 200,
      customerName: payload.customerName || account.fullName || 'Walk-in Customer',
      customerPhone: payload.customerPhone || account.phone || '',
      workerId: payload.workerId || null,
      workerName: store.workers.find((item) => item.id === payload.workerId)?.name || null,
      notes: payload.notes || '',
      review: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    store.bookings.push(booking)
    pushHistory(booking, 'PENDING', '', null)
    bookSlots(booking.slotIds)
    notify('New booking received', `${booking.customerName} booked ${booking.serviceName} for ${booking.date} at ${booking.startTime}.`, 'BOOKING')
    persist()
    return ok({ id: booking.id, status: booking.status })
  },
  update: async (id, data) => {
    await wait(85)
    const store = loadDb()
    const booking = store.bookings.find((item) => item.id === id)
    if (!booking) throw new Error('Booking not found')
    Object.assign(booking, plain(data), { updatedAt: new Date().toISOString() })
    persist()
    return ok({ success: true })
  },
  changeStatus: async (id, status, reason, workerId) => {
    await wait(90)
    const store = loadDb()
    const booking = store.bookings.find((item) => item.id === id)
    if (!booking) throw new Error('Booking not found')
    const previous = booking.status
    booking.status = status
    if (workerId) {
      booking.workerId = workerId
      booking.workerName = store.workers.find((item) => item.id === workerId)?.name || booking.workerName
    }
    booking.updatedAt = new Date().toISOString()
    pushHistory(booking, status, reason || '', previous)
    if (status === 'COMPLETED') notify('Wash completed', `${booking.serviceName} for ${booking.customerName} is completed.`, 'BOOKING')
    persist()
    return ok({ success: true })
  },
  cancel: async (id, reason) => {
    await wait(85)
    const store = loadDb()
    const booking = store.bookings.find((item) => item.id === id)
    if (!booking) throw new Error('Booking not found')
    const previous = booking.status
    booking.status = 'CANCELLED'
    booking.cancellationReason = reason || ''
    booking.updatedAt = new Date().toISOString()
    pushHistory(booking, 'CANCELLED', reason || '', previous)
    const storeSlots = store.slots
    booking.slotIds.forEach((slotId) => {
      const slot = storeSlots.find((item) => item.id === slotId)
      if (slot) slot.status = 'AVAILABLE'
    })
    persist()
    return ok(booking)
  },
  reschedule: async (id, data) => {
    await wait(90)
    const store = loadDb()
    const booking = store.bookings.find((item) => item.id === id)
    if (!booking) throw new Error('Booking not found')
    const payload = plain(data)
    const previousStatus = booking.status
    Object.assign(booking, payload, { updatedAt: new Date().toISOString() })
    pushHistory(booking, 'RESCHEDULED', `Moved to ${payload.date} ${payload.startTime}`, previousStatus)
    bookSlots(booking.slotIds)
    persist()
    return ok({ success: true })
  },
  getHistory: async (id) => {
    await wait(45)
    return collection(sortNewest(loadDb().history.filter((item) => item.bookingId === id)))
  },
  createReview: async (bookingId, review) => {
    await wait(90)
    const store = loadDb()
    const booking = store.bookings.find((item) => item.id === bookingId)
    const payload = plain(review)
    store.reviews.push({
      id: nextId(),
      bookingId,
      businessId: booking?.businessId,
      customerName: booking?.customerName || currentUser(store).fullName,
      rating: Number(payload.rating) || 5,
      comment: payload.comment || '',
      createdAt: new Date().toISOString(),
    })
    if (booking) booking.review = true
    persist()
    return ok({ success: true })
  },
  listBusinessReviews: async (businessId) => {
    await wait(50)
    return collection(sortNewest(loadDb().reviews.filter((item) => item.businessId === businessId)))
  },
  getBusinessStats: async () => {
    await wait(60)
    const store = loadDb()
    const owned = currentBusiness(store)
    const items = owned ? store.bookings.filter((item) => item.businessId === owned.id) : store.bookings
    const today = localYmd()
    const counts = items.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1
      return acc
    }, {})
    const dailyTrend = Array.from({ length: 7 }, (_, index) => {
      const date = addDaysToYmd(today, index - 6)
      const dayItems = items.filter((item) => item.date === date)
      return { date, bookings: dayItems.length, completed: dayItems.filter((item) => item.status === 'COMPLETED').length }
    })
    return ok({
      totalBookings: items.length,
      completedWashes: counts.COMPLETED || 0,
      pendingBookings: counts.PENDING || 0,
      confirmedBookings: counts.CONFIRMED || 0,
      inProgressBookings: counts.IN_PROGRESS || 0,
      todayBookings: items.filter((item) => item.date === today).length,
      dailyTrend,
      washesByStatus: counts,
      washesByWashType: items.reduce((acc, item) => {
        const key = item.washType || 'ON_GARAGE'
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {}),
      washesByBookingType: items.reduce((acc, item) => {
        const key = item.bookingType || 'SCHEDULED'
        acc[key] = (acc[key] || 0) + 1
        return acc
      }, {}),
      topServices: Object.entries(items.reduce((acc, item) => {
        acc[item.serviceName] = (acc[item.serviceName] || 0) + 1
        return acc
      }, {})).map(([serviceName, count]) => ({ serviceName, count })).sort((a, b) => b.count - a.count),
    })
  },
  admin: {
    getStats: async () => {
      await wait(55)
      const store = loadDb()
      const bookingsByStatus = store.bookings.reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1
        return acc
      }, {})
      const dailyBookings = Array.from({ length: 7 }, (_, index) => {
        const date = addDaysToYmd(localYmd(), index - 6)
        return { date, count: store.bookings.filter((item) => item.date === date).length }
      })
      return ok({ bookingsByStatus, dailyBookings, totalBookings: store.bookings.length })
    },
  },
}

/* ─────────────────────────── payments ─────────────────────── */

const payments = {
  initiate: async (amount, phone, businessId, bookingId, description) => {
    await wait(140)
    const store = loadDb()
    const transactionId = nextId()
    const invoiceId = nextId()
    const outTradeNo = `DEMO-${Date.now().toString().slice(-8)}`
    store.transactions.push({
      id: transactionId,
      invoiceId,
      bookingId,
      businessId,
      customerId: currentUser(store).id,
      amount: Number(amount) || 0,
      paymentMethod: 'TELEBIRR',
      method: 'TELEBIRR',
      status: 'PENDING',
      description: description || 'CareCar Wash',
      phone,
      createdAt: new Date().toISOString(),
      date: new Date().toISOString(),
    })
    persist()
    return ok({
      transactionId,
      invoiceId,
      outTradeNo,
      toPayUrl: `https://demo.telebirr.local/pay/${outTradeNo}`,
    })
  },
  getStatus: async (transactionId) => {
    await wait(45)
    const txn = loadDb().transactions.find((item) => item.id === transactionId)
    return ok({ status: txn?.status || 'PENDING' })
  },
  recordCash: async (amount, customerId, bookingId, description) => {
    await wait(110)
    const store = loadDb()
    const transactionId = nextId()
    const invoiceId = nextId()
    store.transactions.push({
      id: transactionId,
      invoiceId,
      bookingId,
      customerId,
      businessId: currentBusiness(store)?.id || PRIMARY_BUSINESS_ID,
      amount: Number(amount) || 0,
      paymentMethod: 'CASH',
      method: 'CASH',
      status: 'COMPLETED',
      description: description || 'CareCar Wash',
      createdAt: new Date().toISOString(),
      date: new Date().toISOString(),
    })
    persist()
    return ok({ transactionId, invoiceId, status: 'COMPLETED' })
  },
  listTransactions: async (params = {}) => {
    await wait(55)
    const store = loadDb()
    const account = currentUser(store)
    let items = [...store.transactions]
    if (params.businessId) items = items.filter((item) => item.businessId === params.businessId)
    else if (account.role === 'BUSINESS_OWNER') {
      const owned = currentBusiness(store)
      items = items.filter((item) => item.businessId === owned?.id)
    } else if (account.role === 'CUSTOMER') items = items.filter((item) => item.customerId === account.id)
    return collection(sortNewest(items))
  },
  getTransaction: async (transactionId) => {
    await wait(40)
    return ok(loadDb().transactions.find((item) => item.id === transactionId) || null)
  },
  getInvoice: async (invoiceId) => {
    await wait(40)
    const txn = loadDb().transactions.find((item) => item.invoiceId === invoiceId)
    return ok(txn || { invoiceId, amount: 0, status: 'COMPLETED' })
  },
  revenue: {
    daily: async () => {
      await wait(45)
      const items = loadDb().transactions.filter((item) => item.createdAt?.slice(0, 10) === localYmd())
      return revenueEnvelope(revenueAmount(items), items.filter((item) => REVENUE_STATUSES.includes(String(item.status).toUpperCase())).length)
    },
    weekly: async () => {
      await wait(45)
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
      const items = loadDb().transactions.filter((item) => new Date(item.createdAt).getTime() >= cutoff)
      return revenueEnvelope(revenueAmount(items), items.filter((item) => REVENUE_STATUSES.includes(String(item.status).toUpperCase())).length)
    },
    monthly: async () => {
      await wait(45)
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
      const items = loadDb().transactions.filter((item) => new Date(item.createdAt).getTime() >= cutoff)
      return revenueEnvelope(revenueAmount(items), items.filter((item) => REVENUE_STATUSES.includes(String(item.status).toUpperCase())).length)
    },
  },
  admin: {
    listTransactions: async () => {
      await wait(55)
      return collection(sortNewest(loadDb().transactions))
    },
    revenue: async () => {
      await wait(60)
      const store = loadDb()
      const revenueByMethod = store.transactions.reduce((acc, txn) => {
        if (!REVENUE_STATUSES.includes(String(txn.status).toUpperCase())) return acc
        const key = txn.paymentMethod || txn.method || 'CASH'
        acc[key] = (acc[key] || 0) + Number(txn.amount || 0)
        return acc
      }, {})
      const dailyRevenue = Array.from({ length: 7 }, (_, index) => {
        const date = addDaysToYmd(localYmd(), index - 6)
        const amount = revenueAmount(store.transactions.filter((item) => item.createdAt?.slice(0, 10) === date))
        return { date, amount }
      })
      const total = Object.values(revenueByMethod).reduce((sum, value) => sum + value, 0)
      const transactionCount = store.transactions.filter((item) => REVENUE_STATUSES.includes(String(item.status).toUpperCase())).length
      return {
        data: { revenueByMethod, dailyRevenue, totalRevenue: total, total, transactionCount },
        total,
        amount: total,
      }
    },
  },
}

/* ───────────────────────── notifications ─────────────────── */

const notifications = {
  list: async () => {
    await wait(45)
    return collection(sortNewest(loadDb().notifications))
  },
  get: async (id) => {
    await wait(40)
    return ok(loadDb().notifications.find((item) => item.id === id) || null)
  },
  getLogs: async () => {
    await wait(50)
    return collection(sortNewest(loadDb().notifications))
  },
  markRead: async (id) => {
    await wait(50)
    const store = loadDb()
    const note = store.notifications.find((item) => item.id === id)
    if (note) note.isRead = true
    persist()
    return ok({ success: true })
  },
  markAllRead: async () => {
    await wait(60)
    loadDb().notifications.forEach((item) => { item.isRead = true })
    persist()
    return ok({ success: true })
  },
  registerFcmToken: async () => { await wait(30); return ok({ success: true }) },
  unregisterFcmToken: async () => { await wait(30); return ok({ success: true }) },
  registerSlotInterest: async () => { await wait(30); return ok({ success: true }) },
  unregisterSlotInterest: async () => { await wait(30); return ok({ success: true }) },
}

/* ─────────────────────────── geo/analytics ────────────────── */

function distanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (value) => (value * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const geo = {
  nearby: async (latitude, longitude, radius = 5) => {
    await wait(60)
    const items = loadDb().businesses
      .filter((item) => item.isApproved && item.latitude && item.longitude)
      .map((item) => ({ ...item, distanceKm: Number(distanceKm(latitude, longitude, item.latitude, item.longitude).toFixed(2)) }))
      .filter((item) => item.distanceKm <= Number(radius))
      .sort((a, b) => a.distanceKm - b.distanceKm)
    return collection(items)
  },
  getBusiness: async (id) => {
    await wait(40)
    return ok(loadDb().businesses.find((item) => item.id === id) || null)
  },
}

const analytics = {
  dailyRevenue: async (startDate, endDate) => {
    await wait(55)
    const store = loadDb()
    const end = endDate || localYmd()
    const start = startDate || addDaysToYmd(end, -6)
    const points = []
    let cursor = start
    let guard = 0
    while (cursor <= end && guard < 90) {
      guard += 1
      points.push({
        date: cursor,
        amount: revenueAmount(store.transactions.filter((item) => item.createdAt?.slice(0, 10) === cursor)),
      })
      cursor = addDaysToYmd(cursor, 1)
    }
    return collection(points)
  },
  topServices: async (businessId, limit = 10) => {
    await wait(50)
    const store = loadDb()
    const bookings = store.bookings.filter((item) => !businessId || item.businessId === businessId)
    const counts = bookings.reduce((acc, item) => {
      acc[item.serviceName] = (acc[item.serviceName] || 0) + 1
      return acc
    }, {})
    return collection(Object.entries(counts).map(([name, count]) => ({ serviceName: name, count })).sort((a, b) => b.count - a.count).slice(0, Number(limit)))
  },
  peakHours: async (businessId) => {
    await wait(50)
    const bookings = loadDb().bookings.filter((item) => !businessId || item.businessId === businessId)
    const hours = bookings.reduce((acc, item) => {
      const hour = String(item.startTime || '00:00').slice(0, 2)
      acc[hour] = (acc[hour] || 0) + 1
      return acc
    }, {})
    return collection(Object.entries(hours).map(([hour, count]) => ({ hour, count })).sort((a, b) => b.count - a.count))
  },
  bookingTrends: async (businessId) => {
    await wait(50)
    const bookings = loadDb().bookings.filter((item) => !businessId || item.businessId === businessId)
    return collection(Array.from({ length: 7 }, (_, index) => {
      const date = addDaysToYmd(localYmd(), index - 6)
      return { date, bookings: bookings.filter((item) => item.date === date).length }
    }))
  },
  returningCustomers: async () => {
    await wait(50)
    const store = loadDb()
    const counts = store.bookings.reduce((acc, item) => {
      acc[item.customerId] = (acc[item.customerId] || 0) + 1
      return acc
    }, {})
    return ok({ returningCustomers: Object.values(counts).filter((count) => count > 1).length, totalCustomers: Object.keys(counts).length })
  },
  ownerRegistrations: async () => {
    await wait(50)
    return collection(sortNewest(loadDb().users.filter((item) => item.role === 'BUSINESS_OWNER')))
  },
  topBusinesses: async (limit = 10) => {
    await wait(50)
    const store = loadDb()
    const items = store.businesses.map((item) => ({
      ...item,
      bookingCount: store.bookings.filter((booking) => booking.businessId === item.id).length,
    })).sort((a, b) => b.bookingCount - a.bookingCount).slice(0, Number(limit))
    return collection(items)
  },
}

/* ──────────────────────────── admin ───────────────────────── */

const admin = {
  getPendingOwners: async () => {
    await wait(55)
    return collection(sortNewest(loadDb().users.filter((item) => item.role === 'BUSINESS_OWNER')))
  },
  approveOwner: async (userId) => {
    await wait(80)
    const store = loadDb()
    const owner = store.users.find((item) => item.id === userId)
    if (owner) owner.isActive = true
    persist()
    return ok({ success: true })
  },
  suspendOwner: async (userId) => {
    await wait(80)
    const store = loadDb()
    const owner = store.users.find((item) => item.id === userId)
    if (owner) owner.isActive = false
    persist()
    return ok({ success: true })
  },
  getPendingBusinesses: async () => {
    await wait(50)
    return collection(loadDb().businesses.filter((item) => !item.isApproved))
  },
  approveBusiness: async (businessId) => user.admin.approveBusiness(businessId),
  listAdmins: async () => {
    await wait(50)
    return collection(loadDb().admins)
  },
  createAdmin: async (data) => {
    await wait(90)
    const store = loadDb()
    const payload = plain(data)
    store.admins.push({
      id: nextId(),
      role: 'ADMIN',
      fullName: payload.fullName || 'New Admin',
      phone: formatPhoneForApi(payload.phone || ''),
      email: payload.email || '',
      isActive: true,
      createdAt: new Date().toISOString(),
    })
    persist()
    return ok({ success: true })
  },
  deleteAdmin: async (adminId) => {
    await wait(75)
    const store = loadDb()
    store.admins = store.admins.filter((item) => item.id !== adminId)
    persist()
    return ok({ success: true })
  },
}

export const api = {
  auth,
  user,
  business,
  slots,
  workers,
  bookings,
  payments,
  notifications,
  geo,
  analytics,
  admin,
}
