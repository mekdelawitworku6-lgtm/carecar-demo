# Care Car Wash: User Stories

This document converts the roles, pages, and interactive features of the **Care Car Wash** application into standard Agile User Stories (`As a... I want to... So that...`) to provide complete contextual guidance for developers and AI coding agents.

---

## 1. Customer (`CUSTOMER`) User Stories

### Authentication & Sessions ([Auth.jsx](file:///c:/Users/Tech%20Haven/Documents/Work/PossibleTech/Care-Car-Wash/care-car-frontend/src/components/Auth.jsx))
*   **US-C01:** As a Customer, I want to register a new account on the platform, so that I can begin using the car wash booking services.
*   **US-C02:** As a Customer, I want to request a secure verification OTP to my mobile number, so that my registration and sessions are verified.
*   **US-C03:** As a Customer, I want to sign in with my registered credentials, so that I can access my dashboard and active orders.

### Home / Dashboard ([Dashboard.jsx](file:///c:/Users/Tech%20Haven/Documents/Work/PossibleTech/Care-Car-Wash/care-car-frontend/src/components/Dashboard.jsx))
*   **US-C04:** As a Customer, I want to view my stats (number of active bookings, registered vehicles, and alerts), so that I can see my profile status at a glance.
*   **US-C05:** As a Customer, I want to search and filter car wash providers by name, city, or address, so that I can quickly find the service I need.
*   **US-C06:** As a Customer, I want to see providers on an interactive map, so that I can check their locations relative to my current position.

### Track Order ([Bookings.jsx](file:///c:/Users/Tech%20Haven/Documents/Work/PossibleTech/Care-Car-Wash/care-car-frontend/src/components/Bookings.jsx))
*   **US-C07:** As a Customer, I want to choose a provider, select one of my registered vehicles, and pick an open time slot, so that I can book a car wash appointment.
*   **US-C08:** As a Customer, I want to view and track the real-time status of my active bookings, so that I know exactly when my car is in queue, in progress, or ready.

### Providers & Slots ([Slots.jsx](file:///c:/Users/Tech%20Haven/Documents/Work/PossibleTech/Care-Car-Wash/care-car-frontend/src/components/Slots.jsx))
*   **US-C09:** As a Customer, I want to browse provider slot listings, so that I can see their available hours before selecting a service.

### Vehicle Management ([Vehicles.jsx](file:///c:/Users/Tech%20Haven/Documents/Work/PossibleTech/Care-Car-Wash/care-car-frontend/src/components/Vehicles.jsx))
*   **US-C10:** As a Customer, I want to register my vehicles by adding details like brand, plate number, and car size, so that I can quickly select them for bookings.
*   **US-C11:** As a Customer, I want to edit or delete vehicles from my profile, so that my garage list remains accurate and up to date.

### Alerts & Notifications ([Notifications.jsx](file:///c:/Users/Tech%20Haven/Documents/Work/PossibleTech/Care-Car-Wash/care-car-frontend/src/components/Notifications.jsx))
*   **US-C12:** As a Customer, I want to receive live updates on my bookings, so that I am immediately notified of slot changes, bookings starting, or order completions.

### Account Profile ([Profile.jsx](file:///c:/Users/Tech%20Haven/Documents/Work/PossibleTech/Care-Car-Wash/care-car-frontend/src/components/Profile.jsx))
*   **US-C13:** As a Customer, I want to edit my personal profile details (first name, last name, email), so that my user profile stays correct.
*   **US-C14:** As a Customer, I want to request a deletion OTP and permanently delete my account, so that all my data is removed if I choose to leave the platform.

---

## 2. Business Owner (`BUSINESS_OWNER`) User Stories

### Authentication & Approvals ([Auth.jsx](file:///c:/Users/Tech%20Haven/Documents/Work/PossibleTech/Care-Car-Wash/care-car-frontend/src/components/Auth.jsx))
*   **US-B01:** As a Business Owner, I want to register my business details on the platform, so that my business request goes into the queue for admin approval.
*   **US-B02:** As a Business Owner, I want to log in once my business gets approved, so that I can configure my catalog and workers.

### KPI Dashboard ([Dashboard.jsx](file:///c:/Users/Tech%20Haven/Documents/Work/PossibleTech/Care-Car-Wash/care-car-frontend/src/components/Dashboard.jsx))
*   **US-B03:** As a Business Owner, I want to view operational metrics (active worker status, today's open slots, booking queues, and aggregate revenue), so that I can evaluate shop performance at a glance.
*   **US-B04:** As a Business Owner, I want to view analytical charts (daily revenue lists, service statistics, peak wash hours, and booking lines), so that I can make data-driven decisions.

### Booking & Queue Management ([OwnerBookings.jsx](file:///c:/Users/Tech%20Haven/Documents/Work/PossibleTech/Care-Car-Wash/care-car-frontend/src/components/OwnerBookings.jsx))
*   **US-B05:** As a Business Owner, I want to view a centralized list of incoming customer bookings, so that I can monitor the queue.
*   **US-B06:** As a Business Owner, I want to accept, reject, or assign booking slots to available workers, so that my staff works efficiently and customer orders progress.

### Business Settings ([BusinessOwnerPanel.jsx](file:///c:/Users/Tech%20Haven/Documents/Work/PossibleTech/Care-Car-Wash/care-car-frontend/src/components/BusinessOwnerPanel.jsx))
*   **US-B07:** As a Business Owner, I want to update my shop details (business name, description, phone number, address, and coordinates), so that customers can find and contact my business.
*   **US-B08:** As a Business Owner, I want to manage my wash catalog (names, prices, and durations), so that customers see correct services and options when booking.

### Worker Management ([WorkerManagement.jsx](file:///c:/Users/Tech%20Haven/Documents/Work/PossibleTech/Care-Car-Wash/care-car-frontend/src/components/WorkerManagement.jsx))
*   **US-B09:** As a Business Owner, I want to add/register workers to my shop, so that I can assign them to pending booking queues.
*   **US-B10:** As a Business Owner, I want to monitor worker availability statuses (busy, idle, inactive), so that I can keep track of my staff.

### Slot Generation ([Slots.jsx](file:///c:/Users/Tech%20Haven/Documents/Work/PossibleTech/Care-Car-Wash/care-car-frontend/src/components/Slots.jsx))
*   **US-B11:** As a Business Owner, I want to generate and open time slots for specific calendar dates, so that customers can select and book wash appointments.

### Earnings Audit ([Payments.jsx](file:///c:/Users/Tech%20Haven/Documents/Work/PossibleTech/Care-Car-Wash/care-car-frontend/src/components/Payments.jsx))
*   **US-B12:** As a Business Owner, I want to view payout records and business transaction histories, so that I can verify my payments and earnings.

### Logs & Alerts ([Notifications.jsx](file:///c:/Users/Tech%20Haven/Documents/Work/PossibleTech/Care-Car-Wash/care-car-frontend/src/components/Notifications.jsx))
*   **US-B13:** As a Business Owner, I want to view notifications and warnings about booking cancelations or worker schedule updates, so that I can adapt to changes quickly.

### Profile ([Profile.jsx](file:///c:/Users/Tech%20Haven/Documents/Work/PossibleTech/Care-Car-Wash/care-car-frontend/src/components/Profile.jsx))
*   **US-B14:** As a Business Owner, I want to update my profile settings and safely sign out, so that my account credentials remain secure.

---

## 3. Admin (`ADMIN`) User Stories

### Platform Verification ([Auth.jsx](file:///c:/Users/Tech%20Haven/Documents/Work/PossibleTech/Care-Car-Wash/care-car-frontend/src/components/Auth.jsx))
*   **US-A01:** As an Admin, I want to log in using my administrator credentials, so that I can access the system management dashboard.

### Platform Overview ([Dashboard.jsx](file:///c:/Users/Tech%20Haven/Documents/Work/PossibleTech/Care-Car-Wash/care-car-frontend/src/components/Dashboard.jsx))
*   **US-A02:** As an Admin, I want to view platform-wide summaries (total platform users, pending business listings, pending owner registrations, and system-wide revenue), so that I can monitor overall platform growth.

### User & Business Moderation ([AdminPanel.jsx](file:///c:/Users/Tech%20Haven/Documents/Work/PossibleTech/Care-Car-Wash/care-car-frontend/src/components/AdminPanel.jsx))
*   **US-A03:** As an Admin, I want to approve or reject pending business owner accounts and new business registrations, so that only legitimate entities are listed on the platform.
*   **US-A04:** As an Admin, I want to view and manage all active users and modify roles, so that I can keep the platform safe.

### Financial Audits ([Payments.jsx](file:///c:/Users/Tech%20Haven/Documents/Work/PossibleTech/Care-Car-Wash/care-car-frontend/src/components/Payments.jsx))
*   **US-A05:** As an Admin, I want to view global platform transactions and commission payouts, so that I can audit revenues and payouts.

### Global Notification Logs ([Notifications.jsx](file:///c:/Users/Tech%20Haven/Documents/Work/PossibleTech/Care-Car-Wash/care-car-frontend/src/components/Notifications.jsx))
*   **US-A06:** As an Admin, I want to audit system-wide logs of sent notifications, so that I can check the platform's messaging status.

### Admin Profile ([Profile.jsx](file:///c:/Users/Tech%20Haven/Documents/Work/PossibleTech/Care-Car-Wash/care-car-frontend/src/components/Profile.jsx))
*   **US-A07:** As an Admin, I want to view my personal account details and log out, so that I can protect the admin session.
