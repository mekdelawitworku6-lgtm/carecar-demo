/**
 * Seed data for the backend-free portfolio demo.
 *
 * Everything here is fictional. The database is serialised to localStorage so
 * mutations made while exploring the demo persist until the user clicks
 * "Reset sample data" in the demo toolbar.
 */

import { DEMO_BUSINESS_ID, DEMO_ROLES } from './session.js'

export const DB_KEY = 'carecar_demo_db_v1'

export const CUSTOMER_ID = DEMO_ROLES.CUSTOMER.id
export const OWNER_ID = DEMO_ROLES.BUSINESS_OWNER.id
export const ADMIN_ID = DEMO_ROLES.ADMIN.id
export const PRIMARY_BUSINESS_ID = DEMO_BUSINESS_ID

const hex = (value, length) => (value >>> 0).toString(16).padStart(length, '0').slice(-length)

/** Deterministic UUID-like ids so payment forms that validate UUIDs just work. */
export const demoUuid = (seed) => {
  const a = (seed * 2654435761) >>> 0
  const b = (seed * 40503 + 17) & 0xffff
  const c = (seed * 2246822519 + 11) >>> 0
  const d = (seed * 747796405 + 29) >>> 0
  return `${hex(a, 8)}-${hex(b, 4)}-4${hex(c % 4096, 3)}-a${hex(d % 4096, 3)}-${hex((a ^ b ^ c ^ d) >>> 0, 8)}${hex(seed, 4)}`
}

const addDays = (days) => {
  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(12, 0, 0, 0)
  return date
}

const ymd = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const stamp = (days, hour = 9, minute = 0) => {
  const date = addDays(days)
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
}

const hhmm = (minutes) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

const svgPhoto = (label, from, to) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">` +
      `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>` +
      `</linearGradient></defs>` +
      `<rect width="640" height="360" fill="url(#g)"/>` +
      `<circle cx="530" cy="70" r="48" fill="#ffffff" opacity=".12"/>` +
      `<path d="M120 250h400l-28-70H150z" fill="#ffffff" opacity=".82"/>` +
      `<rect x="172" y="218" width="296" height="32" rx="8" fill="#0f172a" opacity=".28"/>` +
      `<circle cx="220" cy="252" r="26" fill="#111827"/><circle cx="420" cy="252" r="26" fill="#111827"/>` +
      `<text x="40" y="316" fill="#ffffff" font-family="Arial,sans-serif" font-size="22" font-weight="700">${label}</text>` +
      `</svg>`
  )}`

const proofSvg = (label) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320" viewBox="0 0 480 320">` +
      `<rect width="480" height="320" rx="16" fill="#f8fafc"/>` +
      `<rect x="32" y="32" width="416" height="256" rx="12" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>` +
      `<rect x="64" y="64" width="132" height="18" rx="4" fill="#1e3a8a"/>` +
      `<rect x="64" y="104" width="352" height="10" rx="4" fill="#cbd5e1"/>` +
      `<rect x="64" y="128" width="300" height="10" rx="4" fill="#e2e8f0"/>` +
      `<rect x="64" y="152" width="336" height="10" rx="4" fill="#e2e8f0"/>` +
      `<rect x="64" y="176" width="240" height="10" rx="4" fill="#e2e8f0"/>` +
      `<rect x="64" y="220" width="160" height="10" rx="4" fill="#cbd5e1"/>` +
      `<circle cx="370" cy="238" r="42" fill="none" stroke="#2563eb" stroke-width="5"/>` +
      `<path d="M348 238l15 15 30-32" fill="none" stroke="#2563eb" stroke-width="6" stroke-linecap="round"/>` +
      `<text x="64" y="272" fill="#64748b" font-family="Arial,sans-serif" font-size="14">${label} · Demo document</text>` +
      `</svg>`
  )}`

const operatingHours = {
  monday: { isOpen: true, open: '08:00', close: '19:00' },
  tuesday: { isOpen: true, open: '08:00', close: '19:00' },
  wednesday: { isOpen: true, open: '08:00', close: '19:00' },
  thursday: { isOpen: true, open: '08:00', close: '19:00' },
  friday: { isOpen: true, open: '08:00', close: '20:00' },
  saturday: { isOpen: true, open: '09:00', close: '18:00' },
  sunday: { isOpen: false, open: '10:00', close: '16:00' },
}

const makeSlots = (businessId, days, seedStart) => {
  const slots = []
  let seed = seedStart
  for (let day = 0; day < days; day += 1) {
    const date = ymd(addDays(day))
    for (let minute = 9 * 60; minute < 18 * 60; minute += 30) {
      seed += 1
      let status = 'AVAILABLE'
      if (seed % 11 === 0) status = 'BLOCKED'
      else if (seed % 7 === 0) status = 'BOOKED'
      slots.push({
        id: demoUuid(2000 + seed),
        businessId,
        date,
        startTime: hhmm(minute),
        endTime: hhmm(minute + 30),
        status,
        blockReason: status === 'BLOCKED' ? 'Reserved for maintenance' : null,
      })
    }
  }
  return slots
}

export function createSeedDb() {
  const users = [
    {
      ...DEMO_ROLES.CUSTOMER,
      firstName: 'Alemayehu',
      lastName: 'Tesfaye',
      isActive: true,
      digitalId: 'FD-CUST-001',
      createdAt: stamp(-120, 10),
    },
    {
      ...DEMO_ROLES.BUSINESS_OWNER,
      firstName: 'Mekdes',
      lastName: 'Bekele',
      isActive: true,
      digitalId: 'FD-OWN-001',
      proofOfOwnership: proofSvg('Ownership Proof'),
      createdAt: stamp(-90, 11),
    },
    {
      ...DEMO_ROLES.ADMIN,
      firstName: 'Dawit',
      lastName: 'Haile',
      isActive: true,
      digitalId: 'FD-ADMIN-001',
      createdAt: stamp(-200, 9),
    },
    {
      id: demoUuid(101),
      role: 'BUSINESS_OWNER',
      fullName: 'Yonas Getachew',
      firstName: 'Yonas',
      lastName: 'Getachew',
      phone: '+251914567890',
      email: 'yonas@demo.carecar.et',
      isActive: false,
      digitalId: 'FD-OWN-002',
      proofOfOwnership: proofSvg('Ownership Proof'),
      createdAt: stamp(-3, 14),
    },
    {
      id: demoUuid(102),
      role: 'BUSINESS_OWNER',
      fullName: 'Sara Mengistu',
      firstName: 'Sara',
      lastName: 'Mengistu',
      phone: '+251915678901',
      email: 'sara@demo.carecar.et',
      isActive: true,
      digitalId: 'FD-OWN-003',
      createdAt: stamp(-60, 12),
    },
    {
      id: demoUuid(103),
      role: 'BUSINESS_OWNER',
      fullName: 'Kaleb Akalu',
      firstName: 'Kaleb',
      lastName: 'Akalu',
      phone: '+251916789012',
      email: 'kaleb@demo.carecar.et',
      isActive: false,
      digitalId: 'FD-OWN-004',
      proofOfOwnership: proofSvg('Ownership Proof'),
      createdAt: stamp(-1, 16),
    },
    {
      id: demoUuid(104),
      role: 'CUSTOMER',
      fullName: 'Bethel Arega',
      firstName: 'Bethel',
      lastName: 'Arega',
      phone: '+251917890123',
      email: 'bethel@example.com',
      isActive: true,
      digitalId: 'FD-CUST-002',
      createdAt: stamp(-40, 15),
    },
    {
      id: demoUuid(105),
      role: 'CUSTOMER',
      fullName: 'Nahom Tefera',
      firstName: 'Nahom',
      lastName: 'Tefera',
      phone: '+251918901234',
      email: 'nahom@example.com',
      isActive: true,
      digitalId: 'FD-CUST-003',
      createdAt: stamp(-25, 10),
    },
  ]

  const businesses = [
    {
      id: PRIMARY_BUSINESS_ID,
      ownerId: OWNER_ID,
      businessName: 'CareCar Premium Wash',
      description: 'Full-service car wash and detailing with live bay tracking, trained staff and a 45-minute express lane.',
      address: 'Bole Road, near Friendship Square',
      city: 'Addis Ababa',
      phone: '+251912345678',
      email: 'hello@carecar.demo',
      googleMapsLink: 'https://maps.google.com/?q=9.0320,38.7469',
      latitude: 9.032,
      longitude: 38.7469,
      workingHours: 'Mon–Fri 08:00–19:00 · Sat 09:00–18:00',
      photos: [svgPhoto('CareCar Premium', '#2563eb', '#06b6d4')],
      isApproved: true,
      is_approved: true,
      isSuspended: false,
      mobileServiceEnabled: true,
      mobileServiceRadiusKm: 8,
      queueCount: 2,
      createdAt: stamp(-88, 9),
    },
    {
      id: demoUuid(201),
      ownerId: demoUuid(102),
      businessName: 'Bole Sparkle Wash',
      description: 'Quick exterior washes and wax while you wait.',
      address: 'Bole Michael, Story Line',
      city: 'Addis Ababa',
      phone: '+251915678901',
      email: 'bookings@bolesparkle.demo',
      googleMapsLink: 'https://maps.google.com/?q=9.0050,38.7600',
      latitude: 9.005,
      longitude: 38.76,
      workingHours: 'Daily 08:00–20:00',
      photos: [svgPhoto('Bole Sparkle', '#7c3aed', '#ec4899')],
      isApproved: true,
      is_approved: true,
      isSuspended: false,
      mobileServiceEnabled: false,
      mobileServiceRadiusKm: 5,
      queueCount: 4,
      createdAt: stamp(-70, 10),
    },
    {
      id: demoUuid(202),
      ownerId: demoUuid(103),
      businessName: 'Kaleb Auto Spa',
      description: 'Interior deep-cleaning and ceramic coating specialists.',
      address: 'Saris, Blue Star Area',
      city: 'Addis Ababa',
      phone: '+251916789012',
      email: 'info@kaleblauto.demo',
      googleMapsLink: 'https://maps.google.com/?q=9.0150,38.7900',
      latitude: 9.015,
      longitude: 38.79,
      workingHours: 'Daily 09:00–19:00',
      photos: [svgPhoto('Kaleb Auto Spa', '#059669', '#84cc16')],
      isApproved: true,
      is_approved: true,
      isSuspended: false,
      mobileServiceEnabled: true,
      mobileServiceRadiusKm: 6,
      queueCount: 1,
      createdAt: stamp(-45, 13),
    },
    {
      id: demoUuid(203),
      ownerId: demoUuid(103),
      businessName: 'Sunshine Mobile Wash',
      description: 'We come to your office or home with our own water and power.',
      address: 'CMC Area',
      city: 'Addis Ababa',
      phone: '+251916789013',
      email: 'wash@sunshine.demo',
      googleMapsLink: 'https://maps.google.com/?q=8.9900,38.7700',
      latitude: 8.99,
      longitude: 38.77,
      workingHours: 'Daily 08:00–18:00',
      photos: [svgPhoto('Sunshine Mobile', '#f59e0b', '#ef4444')],
      isApproved: false,
      is_approved: false,
      isSuspended: false,
      mobileServiceEnabled: true,
      mobileServiceRadiusKm: 12,
      queueCount: 0,
      createdAt: stamp(-2, 11),
    },
  ]

  const services = [
    { id: 'svc-express-01', businessId: PRIMARY_BUSINESS_ID, name: 'Express Wash', description: 'Exterior wash, dry and tyre shine. Great for a quick refresh.', price: 200, duration: 30, isActive: true },
    { id: 'svc-premium-01', businessId: PRIMARY_BUSINESS_ID, name: 'Premium Wash', description: 'Exterior wash, interior vacuum, windows and dashboard wipe.', price: 350, duration: 45, isActive: true },
    { id: 'svc-detail-01', businessId: PRIMARY_BUSINESS_ID, name: 'Full Detailing', description: 'Deep interior cleaning, wax, polish and engine bay tidy.', price: 850, duration: 120, isActive: true },
    { id: 'svc-mobile-01', businessId: PRIMARY_BUSINESS_ID, name: 'Mobile Wash', description: 'Our team comes to your location with water and power.', price: 500, duration: 60, isActive: true },
    { id: 'svc-express-02', businessId: businesses[1].id, name: 'Express Wash', description: 'Fast exterior wash.', price: 180, duration: 30, isActive: true },
    { id: 'svc-wax-02', businessId: businesses[1].id, name: 'Wax & Polish', description: 'Hand wax and buff.', price: 420, duration: 60, isActive: true },
    { id: 'svc-interior-03', businessId: businesses[2].id, name: 'Interior Deep Clean', description: 'Seats, carpets and dashboard.', price: 700, duration: 90, isActive: true },
  ]

  const config = {
    [PRIMARY_BUSINESS_ID]: {
      slotDuration: 30,
      bufferBetweenSlots: 5,
      maxAdvanceBooking: 30,
      maxSlotsPerBooking: 5,
      operatingHours,
      slotDurationRules: [
        { from: '08:00', to: '12:00', duration: 30, buffer: 5 },
        { from: '12:00', to: '19:00', duration: 45, buffer: 10 },
      ],
    },
  }
  businesses.forEach((b) => {
    if (!config[b.id]) {
      config[b.id] = {
        slotDuration: 30,
        bufferBetweenSlots: 5,
        maxAdvanceBooking: 30,
        maxSlotsPerBooking: 5,
        operatingHours: { ...operatingHours },
        slotDurationRules: [{ from: '09:00', to: '18:00', duration: 30, buffer: 5 }],
      }
    }
  })

  const workers = [
    { id: demoUuid(301), businessId: PRIMARY_BUSINESS_ID, name: 'Dawit Ali', fullName: 'Dawit Ali', phone: '+251911111111', jobRole: 'Washer', digitalId: 'FD-WRK-001', isActive: true, is_active: true, profileImage: '', washedCount: 42, washCount: 42 },
    { id: demoUuid(302), businessId: PRIMARY_BUSINESS_ID, name: 'Hana lemma', fullName: 'Hana lemma', phone: '+251922222222', jobRole: 'Detailer', digitalId: 'FD-WRK-002', isActive: true, is_active: true, profileImage: '', washedCount: 31, washCount: 31 },
    { id: demoUuid(303), businessId: PRIMARY_BUSINESS_ID, name: 'Elias Kassa', fullName: 'Elias Kassa', phone: '+251933333333', jobRole: 'Washer', digitalId: 'FD-WRK-003', isActive: true, is_active: true, profileImage: '', washedCount: 26, washCount: 26 },
    { id: demoUuid(304), businessId: PRIMARY_BUSINESS_ID, name: 'Marta Fikru', fullName: 'Marta Fikru', phone: '+251944444444', jobRole: 'Supervisor', digitalId: 'FD-WRK-004', isActive: true, is_active: true, profileImage: '', washedCount: 58, washCount: 58 },
    { id: demoUuid(305), businessId: businesses[1].id, name: 'Abel Tsegaye', fullName: 'Abel Tsegaye', phone: '+251955555555', jobRole: 'Washer', digitalId: 'FD-WRK-005', isActive: true, is_active: true, profileImage: '', washedCount: 19, washCount: 19 },
  ]

  const availability = {}
  workers.forEach((worker, index) => {
    availability[worker.id] = Array.from({ length: 7 }, (_, day) => ({
      dayOfWeek: day,
      isAvailable: day !== 0 || index % 2 === 0,
      startTime: day === 6 ? '09:00' : '08:00',
      endTime: day === 6 ? '17:00' : '19:00',
    }))
  })

  const vehicles = [
    { id: demoUuid(401), customerId: CUSTOMER_ID, make: 'Toyota', model: 'Corolla', year: 2019, plateNumber: 'AA-1234', color: 'White', vehicleType: 'SEDAN', isDefault: true },
    { id: demoUuid(402), customerId: CUSTOMER_ID, make: 'Hyundai', model: 'Tucson', year: 2021, plateNumber: 'AB-5678', color: 'Silver', vehicleType: 'SUV', isDefault: false },
    { id: demoUuid(403), customerId: demoUuid(104), make: 'Kia', model: 'Rio', year: 2017, plateNumber: 'AC-9012', color: 'Blue', vehicleType: 'SEDAN', isDefault: true },
  ]

  const slots = [
    ...makeSlots(PRIMARY_BUSINESS_ID, 12, 0),
    ...makeSlots(businesses[1].id, 7, 500),
    ...makeSlots(businesses[2].id, 7, 1000),
  ]

  const pickSlot = (businessId, dayOffset, startTime) =>
    slots.find((slot) => slot.businessId === businessId && slot.date === ymd(addDays(dayOffset)) && slot.startTime === startTime)

  const bookingSeeds = [
    { seed: 501, customerId: CUSTOMER_ID, customerName: 'Alemayehu Tesfaye', customerPhone: '+251911234567', businessId: PRIMARY_BUSINESS_ID, serviceId: 'svc-premium-01', serviceName: 'Premium Wash', vehicleId: vehicles[0].id, vehicle: 'Toyota Corolla · AA-1234', day: -1, start: '10:00', end: '10:45', status: 'COMPLETED', amount: 350, type: 'SCHEDULED', wash: 'ON_GARAGE', worker: workers[0], notes: 'Please pay attention to the rear seats.' },
    { seed: 502, customerId: CUSTOMER_ID, customerName: 'Alemayehu Tesfaye', customerPhone: '+251911234567', businessId: PRIMARY_BUSINESS_ID, serviceId: 'svc-express-01', serviceName: 'Express Wash', vehicleId: vehicles[0].id, vehicle: 'Toyota Corolla · AA-1234', day: 0, start: '11:30', end: '12:00', status: 'IN_PROGRESS', amount: 200, type: 'INSTANT', wash: 'ON_GARAGE', worker: workers[2], notes: '' },
    { seed: 503, customerId: CUSTOMER_ID, customerName: 'Alemayehu Tesfaye', customerPhone: '+251911234567', businessId: PRIMARY_BUSINESS_ID, serviceId: 'svc-detail-01', serviceName: 'Full Detailing', vehicleId: vehicles[1].id, vehicle: 'Hyundai Tucson · AB-5678', day: 2, start: '14:00', end: '16:00', status: 'CONFIRMED', amount: 850, type: 'SCHEDULED', wash: 'ON_GARAGE', worker: workers[1], notes: 'Ceramic coating quote requested.' },
    { seed: 504, customerId: CUSTOMER_ID, customerName: 'Alemayehu Tesfaye', customerPhone: '+251911234567', businessId: businesses[1].id, serviceId: 'svc-wax-02', serviceName: 'Wax & Polish', vehicleId: vehicles[0].id, vehicle: 'Toyota Corolla · AA-1234', day: 4, start: '09:30', end: '10:30', status: 'PENDING', amount: 420, type: 'SCHEDULED', wash: 'ON_GARAGE', worker: null, notes: '' },
    { seed: 505, customerId: demoUuid(104), customerName: 'Bethel Arega', customerPhone: '+251917890123', businessId: PRIMARY_BUSINESS_ID, serviceId: 'svc-premium-01', serviceName: 'Premium Wash', vehicleId: vehicles[2].id, vehicle: 'Kia Rio · AC-9012', day: 0, start: '09:00', end: '09:45', status: 'PENDING', amount: 350, type: 'SCHEDULED', wash: 'ON_GARAGE', worker: null, notes: '' },
    { seed: 506, customerId: demoUuid(105), customerName: 'Nahom Tefera', customerPhone: '+251918901234', businessId: PRIMARY_BUSINESS_ID, serviceId: 'svc-express-01', serviceName: 'Express Wash', vehicleId: vehicles[0].id, vehicle: 'Toyota Corolla · AA-1234', day: 0, start: '13:00', end: '13:30', status: 'CONFIRMED', amount: 200, type: 'INSTANT', wash: 'ON_GARAGE', worker: workers[3], notes: 'Office drop-off.' },
    { seed: 507, customerId: demoUuid(104), customerName: 'Bethel Arega', customerPhone: '+251917890123', businessId: PRIMARY_BUSINESS_ID, serviceId: 'svc-mobile-01', serviceName: 'Mobile Wash', vehicleId: vehicles[2].id, vehicle: 'Kia Rio · AC-9012', day: 1, start: '15:30', end: '16:30', status: 'CONFIRMED', amount: 500, type: 'SCHEDULED', wash: 'MOBILE', worker: workers[0], notes: 'At Bole Airport parking.' },
    { seed: 508, customerId: demoUuid(105), customerName: 'Nahom Tefera', customerPhone: '+251918901234', businessId: PRIMARY_BUSINESS_ID, serviceId: 'svc-premium-01', serviceName: 'Premium Wash', vehicleId: vehicles[0].id, vehicle: 'Toyota Corolla · AA-1234', day: -2, start: '16:00', end: '16:45', status: 'COMPLETED', amount: 350, type: 'SCHEDULED', wash: 'ON_GARAGE', worker: workers[1], notes: '' },
    { seed: 509, customerId: demoUuid(104), customerName: 'Bethel Arega', customerPhone: '+251917890123', businessId: PRIMARY_BUSINESS_ID, serviceId: 'svc-express-01', serviceName: 'Express Wash', vehicleId: vehicles[2].id, vehicle: 'Kia Rio · AC-9012', day: -5, start: '12:00', end: '12:30', status: 'CANCELLED', amount: 200, type: 'SCHEDULED', wash: 'ON_GARAGE', worker: null, notes: 'Customer cancelled.' },
    { seed: 510, customerId: demoUuid(105), customerName: 'Nahom Tefera', customerPhone: '+251918901234', businessId: businesses[2].id, serviceId: 'svc-interior-03', serviceName: 'Interior Deep Clean', vehicleId: vehicles[0].id, vehicle: 'Toyota Corolla · AA-1234', day: 3, start: '11:00', end: '12:30', status: 'PENDING', amount: 700, type: 'SCHEDULED', wash: 'ON_GARAGE', worker: null, notes: '' },
  ]

  const bookings = bookingSeeds.map((seed) => {
    const slot = pickSlot(seed.businessId, seed.day, seed.start)
    if (slot) slot.status = 'BOOKED'
    return {
      id: demoUuid(seed.seed),
      customerId: seed.customerId,
      businessId: seed.businessId,
      businessName: businesses.find((b) => b.id === seed.businessId)?.businessName || 'CareCar Partner',
      serviceId: seed.serviceId,
      serviceName: seed.serviceName,
      vehicleId: seed.vehicleId,
      vehicle: seed.vehicle,
      washType: seed.wash,
      bookingType: seed.type,
      date: ymd(addDays(seed.day)),
      startTime: seed.start,
      endTime: seed.end,
      slotIds: slot ? [slot.id] : [],
      status: seed.status,
      totalAmount: seed.amount,
      customerName: seed.customerName,
      customerPhone: seed.customerPhone,
      workerId: seed.worker?.id || null,
      workerName: seed.worker?.name || null,
      notes: seed.notes,
      review: seed.status === 'COMPLETED' && seed.seed === 508,
      createdAt: stamp(seed.day - 1, 8, 30),
      updatedAt: stamp(seed.day, 8, 45),
    }
  })

  const statusOrder = ['PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED']
  const history = bookings.flatMap((booking, index) => {
    const reached = statusOrder.indexOf(booking.status)
    const steps = booking.status === 'CANCELLED' ? ['PENDING', 'CANCELLED'] : statusOrder.slice(0, reached + 1)
    return steps.map((status, step) => ({
      id: demoUuid(1500 + index * 10 + step),
      bookingId: booking.id,
      fromStatus: step === 0 ? null : steps[step - 1],
      toStatus: status,
      reason: status === 'CANCELLED' ? 'Customer requested cancellation' : '',
      createdAt: stamp(booking.date === ymd(addDays(0)) ? 0 : -1, 9 + step),
    }))
  })

  const reviews = [
    { id: demoUuid(1701), bookingId: bookings[0].id, businessId: PRIMARY_BUSINESS_ID, customerName: 'Alemayehu Tesfaye', rating: 5, comment: 'Excellent service, the interior looked brand new.', createdAt: stamp(0, 8) },
    { id: demoUuid(1702), bookingId: bookings[7].id, businessId: PRIMARY_BUSINESS_ID, customerName: 'Nahom Tefera', reviewerName: 'Nahom Tefera', rating: 4, comment: 'Friendly team and on time. Would book again.', createdAt: stamp(-1, 18) },
    { id: demoUuid(1703), bookingId: bookings[3].id, businessId: businesses[1].id, customerName: 'Alemayehu Tesfaye', rating: 5, comment: 'Quick wax and very fair price.', createdAt: stamp(-3, 12) },
  ]

  const paymentSeeds = [
    { seed: 1801, booking: bookings[0], amount: 350, method: 'TELEBIRR', status: 'COMPLETED', days: 0, hour: 10 },
    { seed: 1802, booking: bookings[1], amount: 200, method: 'CASH', status: 'PENDING', days: 0, hour: 11 },
    { seed: 1803, booking: bookings[5], amount: 200, method: 'TELEBIRR', status: 'COMPLETED', days: 0, hour: 13 },
    { seed: 1804, booking: bookings[2], amount: 850, method: 'TELEBIRR', status: 'PENDING', days: -1, hour: 16 },
    { seed: 1805, booking: bookings[7], amount: 350, method: 'CASH', status: 'COMPLETED', days: -2, hour: 17 },
    { seed: 1806, booking: bookings[6], amount: 500, method: 'TELEBIRR', status: 'COMPLETED', days: -3, hour: 12 },
    { seed: 1807, booking: bookings[4], amount: 350, method: 'TELEBIRR', status: 'FAILED', days: -4, hour: 9 },
    { seed: 1808, booking: bookings[9], amount: 700, method: 'CASH', status: 'COMPLETED', days: -6, hour: 14 },
  ]

  const transactions = paymentSeeds.map((item) => ({
    id: demoUuid(item.seed),
    invoiceId: demoUuid(1900 + item.seed),
    bookingId: item.booking.id,
    customerId: item.booking.customerId,
    businessId: item.booking.businessId,
    amount: item.amount,
    paymentMethod: item.method,
    method: item.method,
    status: item.status,
    description: item.booking.serviceName,
    createdAt: stamp(item.days, item.hour),
    date: stamp(item.days, item.hour),
  }))

  const notifications = [
    { id: demoUuid(2001), isRead: false, type: 'BOOKING', title: 'New booking received', body: 'Bethel Arega booked Premium Wash for today at 09:00.', message: 'Bethel Arega booked Premium Wash for today at 09:00.', createdAt: stamp(0, 8, 45) },
    { id: demoUuid(2002), isRead: false, type: 'PAYMENT', title: 'Payment received', body: 'ETB 350 received from Alemayehu Tesfaye via Telebirr.', message: 'ETB 350 received from Alemayehu Tesfaye via Telebirr.', createdAt: stamp(0, 8, 20) },
    { id: demoUuid(2003), isRead: false, type: 'SYSTEM', title: 'New owner awaiting review', body: 'Kaleb Akalu submitted ownership documents for Sunshine Mobile Wash.', message: 'Kaleb Akalu submitted ownership documents.', createdAt: stamp(-1, 16, 10) },
    { id: demoUuid(2004), isRead: true, type: 'BOOKING', title: 'Booking confirmed', body: 'Your Full Detailing on Friday at 14:00 is confirmed.', message: 'Your Full Detailing is confirmed.', createdAt: stamp(-1, 12, 5) },
    { id: demoUuid(2005), isRead: true, type: 'WORKER', title: 'Shift reminder', body: 'Dawit Ali is assigned to the morning bay shift.', message: 'Dawit Ali is assigned to the morning bay shift.', createdAt: stamp(-2, 7, 30) },
    { id: demoUuid(2006), isRead: true, type: 'SYSTEM', title: 'Weekly report ready', body: 'Your weekly revenue and wash report is available.', message: 'Your weekly report is available.', createdAt: stamp(-4, 9) },
  ]

  const holidays = [
    { id: demoUuid(2101), date: ymd(addDays(9)), reason: 'Public holiday' },
    { id: demoUuid(2102), date: ymd(addDays(23)), reason: 'Staff training' },
  ]

  const branches = [
    { id: demoUuid(2201), businessId: PRIMARY_BUSINESS_ID, branchName: 'Bole Main Branch', address: 'Bole Road, near Friendship Square', city: 'Addis Ababa', phone: '+251912345678', email: 'bole@carecar.demo', googleMapsLink: 'https://maps.google.com/?q=9.0320,38.7469', workingHours: '08:00–19:00', isActive: true },
    { id: demoUuid(2202), businessId: PRIMARY_BUSINESS_ID, branchName: 'Saris Service Point', address: 'Saris, Blue Star Area', city: 'Addis Ababa', phone: '+251912345679', email: 'saris@carecar.demo', googleMapsLink: 'https://maps.google.com/?q=9.0150,38.7900', workingHours: '09:00–18:00', isActive: true },
  ]

  const admins = [
    { id: ADMIN_ID, role: 'ADMIN', fullName: 'Dawit Haile', phone: '+251913456789', email: 'dawit@carecar.demo', isActive: true, createdAt: stamp(-200, 9) },
    { id: demoUuid(2301), role: 'ADMIN', fullName: 'Ruth Samuel', phone: '+251919876543', email: 'ruth@carecar.demo', isActive: true, createdAt: stamp(-150, 10) },
  ]

  const businessApplications = [
    { id: demoUuid(2401), ownerPhone: '+251914567890', fullName: 'Yonas Getachew', businessName: 'Green Wash Ethiopia', faydaId: 'FD-OWN-002', googleMapsLink: 'https://maps.google.com/?q=9.02,38.75', status: 'PENDING', reviewNote: '', createdAt: stamp(-3, 14) },
  ]

  return {
    version: 1,
    users,
    businesses,
    services,
    config,
    workers,
    availability,
    vehicles,
    slots,
    bookings,
    history,
    reviews,
    transactions,
    notifications,
    holidays,
    branches,
    admins,
    businessApplications,
    otpCodes: {},
  }
}
