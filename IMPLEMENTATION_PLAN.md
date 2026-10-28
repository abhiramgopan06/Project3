# Evently implementation plan

This upgrade keeps the existing React + Django structure and focuses first on reliable ticketing and check-in. It is intentionally organized in beginner-friendly phases so each part can be tested before the next is expanded.

## Phase 1 — Ticketing and venue operations (implemented in this package)

- Every booking receives a unique UUID ticket token from Django.
- Confirmed and paid bookings show a QR ticket in My Bookings, with event, seat, amount, and payment details.
- Organizer event cards include a Scan shortcut beside Attendees, Edit, and Delete.
- Organizers can scan a ticket using a camera; Django validates event ownership, booking status, and payment status before recording attendance.
- Duplicate scans are rejected, and the check-in timestamp is stored.
- Organizer attendee list includes search and CSV export.
- A basic audit record is saved when a QR check-in succeeds.
- Saved events (wishlist) are stored per user.
- A management command can expire unpaid bookings after the 15-minute hold. Schedule it to run periodically on the host for automatic expiry even when no one visits the site.
- Existing manual Attended/Absent actions remain available as a fallback.

## Phase 2 — Booking and payment reliability

1. Replace mock payment with Razorpay test mode, server-side signature verification, webhook handling, idempotency, and clear success/failure states. Keep mock payment only for local demonstrations.
2. Add cancellation requests and organizer/admin approval rules, then connect refunds to the payment provider. Do not label a mock status change as a real refund.
3. Add a waitlist and offer released seats to the next eligible attendee.
4. Harden concurrent booking using database transactions, database constraints, and row-level locking when deploying to PostgreSQL. SQLite is acceptable for local learning but has limited row-locking behavior.
5. Add promo codes and group booking rules with server-side expiry, usage limits, and discount calculation.

## Phase 3 — Attendee experience

1. Complete ticket PDF/receipt downloads and email confirmation/reminder templates.
2. Expand event discovery filters and pagination; the existing search/category/location/date/price filters should remain compatible.
3. Add a dedicated saved-events page, review editing/moderation, and notification preferences.
4. Keep the booking page readable on phones and ensure all ticket and payment states have clear explanations.

## Phase 4 — Organizer operations

1. Expand analytics with date-range filters, revenue, sold tickets, attendance rate, cancellation count, and downloadable reports.
2. Add role-scoped organizer staff permissions; check-in staff should not be able to edit ticket prices or access financial reports.
3. Add event approval history and organizer activity logs.
4. Add bulk attendee tools and QR scanner fallback by manual booking code.

## Phase 5 — Admin, testing, and production readiness

1. Add automated API tests for role permissions, double booking, ticket token uniqueness, 15-minute expired holds, duplicate scans, refunds, and organizer isolation.
2. Configure production secrets and DEBUG=False, HTTPS, secure cookies, allowed hosts, PostgreSQL, backups, and persistent media storage.
3. Add error monitoring, rate limits, audit-log retention, and privacy controls.
4. Verify keyboard navigation, contrast, screen readers, responsive layouts, and reduced-motion support.
5. Deploy a staging build and complete manual browser testing before release.

## Beginner test checklist

1. Run migrations: `python manage.py migrate`.
2. Start Django and React.
3. Create or use an attendee account and book a seat.
4. Complete mock payment. Verify that the QR ticket appears only for a confirmed booking.
5. Sign in as the event's organizer and open the event card's Scan button.
6. Allow camera permission and scan the attendee's QR. Verify the attendee becomes `attended` and the check-in time appears.
7. Scan the same QR again. The API should reject the duplicate.
8. Open the organizer attendee page, search by name/booking ID, and export the CSV.
9. Test expiry by running `python manage.py expire_pending_bookings` after a pending booking has passed 15 minutes.

## Dependencies added

- `qrcode.react`: renders a QR ticket in the React booking page.
- `html5-qrcode`: opens the device camera and reads QR tickets for organizer check-in.

Camera scanning normally requires `localhost` or HTTPS and user permission.

## Feature status in this ZIP

### Implemented or expanded now

- **1–2:** Unique QR tickets and booking details with print-to-PDF ticket/receipt support.
- **5:** Cancellation request flow for paid bookings with organizer approval; refund status is simulated only.
- **6, 9–12, 16–17:** Existing search, reviews, dashboards, organizer event tools, and event approval are retained.
- **7:** Saved events with a heart button and a saved-events section on the home page.
- **8:** Existing notification records are retained and new booking/cancellation/check-in messages are created; a full email reminder scheduler remains future work.
- **13–14:** QR check-in, duplicate-scan protection, attendee search, and CSV export.
- **18:** Basic audit records for check-ins and approved cancellations, visible in Django admin.
- **23–24:** Existing transaction-based booking safeguards are retained; a management command was added for scheduled expiry.
- **26–27:** QR-scan and favorites API tests were added; source syntax checks and improved frontend messages were performed. Full Django tests could not be run in this environment because Django dependencies are not installed here.
- **28:** Setup and deployment-readiness guidance is included; production hardening still needs to be completed before public deployment.

### Still requiring a later implementation phase

- **3:** VIP/Premium/Standard seat price tiers and category-level pricing.
- **4 and 25:** Real payment gateway integration, signature verification, webhooks, idempotency, and real refunds. Provider credentials and a configured test account are required; the current payment button is mock-only.
- **15:** Organizer staff accounts and granular permissions.
- **19:** More advanced personalized recommendations. Existing event discovery is retained, but a full recommendation engine is not part of this stage.
- **20:** Promo codes, discount limits, and group booking rules.
- **5:** A waitlist is still future work.
- **26:** Add more automated coverage and run the full test suite in an environment with the backend dependencies installed.
