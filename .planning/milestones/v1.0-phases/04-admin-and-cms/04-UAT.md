---
status: complete
phase: 04-admin-and-cms
source: [04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md, 04-04-SUMMARY.md]
started: 2026-03-12T12:00:00Z
updated: 2026-03-12T12:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running dev server. Run `npm run dev` from scratch. Server boots without errors. Navigate to the homepage — it loads. Navigate to /admin — it either shows the dashboard (admin user) or redirects away (non-admin).
result: pass

### 2. Admin Route Protection
expected: While logged in as a non-admin user, navigate to /admin. You should be redirected away (not shown the admin dashboard). While logged in as an admin user, /admin loads the dashboard normally.
result: pass

### 3. Admin Dashboard Stats
expected: As admin, navigate to /admin. You see 4 stat cards: Total Users, Active Members, Today's Reservations, and Upcoming Events — each displaying a number.
result: pass

### 4. Admin Sidebar Navigation
expected: The admin area shows a sidebar with 7 links: Dashboard, Users, Courts, Reservations, Events, CMS, Stripe. Clicking each link navigates to the corresponding admin page. On mobile, the sidebar collapses and can be toggled.
result: pass

### 5. Admin Link in Navbar
expected: As an admin user, the main site Navbar shows an "Admin" link. As a non-admin user, no Admin link appears.
result: pass

### 6. User Search
expected: Navigate to /admin/users. Type a name, email, or phone number in the search bar. After a brief delay (~300ms), the user table filters to show matching results.
result: pass

### 7. User Table and Slide-Out
expected: The /admin/users page shows a paginated table (20 users per page) with name, email, plan, status badge, and join date. Clicking a row opens a slide-out panel on the right showing profile info, membership details, recent reservations, and action buttons (Disable, Password Reset).
result: pass

### 8. Disable and Enable User
expected: In the user slide-out, click Disable on an active user. A confirmation dialog appears. After confirming, the user's status changes to disabled. Their future reservations should be cancelled. The Enable button then appears to re-enable them.
result: pass

### 9. Court Management
expected: Navigate to /admin/courts. Existing courts are listed with status badges. Click to add a new court — a form appears for name, location, and GPS coordinates. After submitting, the new court appears in the list.
result: pass

### 10. Court Maintenance Mode
expected: On the courts page, toggle maintenance mode on a court. A confirmation dialog warns that overlapping reservations will be cancelled. After confirming, the court shows a maintenance badge. Toggling off clears maintenance.
result: pass

### 11. Reservation Table with Filters
expected: Navigate to /admin/reservations. A table shows reservations with date, court, user, status. Filter controls let you narrow by date, court, and status. Pagination works at 20 per page.
result: pass

### 12. Admin Create Reservation
expected: On the reservations page, click to create a new reservation. You can search for a registered user or enter a guest name for a walk-in. Select date, time, and court, then submit. The reservation appears in the table.
result: pass

### 13. Events CRUD
expected: Navigate to /admin/events. Tabs show upcoming and past events. Create a new event with title, type, date/time, and description. The event appears in the list. Edit the event — changes are saved. Delete the event with confirmation — it disappears.
result: pass

### 14. CMS Content Editor
expected: Navigate to /admin/cms. Content blocks are grouped by page (Home, About, Learn, FAQ). Expand a block to edit. The Tiptap rich text editor loads with a toolbar. Switch between ES/EN language tabs. Save content and see the preview update. Content changes should be reflected on public pages after save (ISR revalidation).
result: pass

### 15. Stripe Dashboard Link
expected: Navigate to /admin/stripe. The page shows a link to the Stripe Dashboard. Clicking it opens the Stripe Dashboard in a new tab.
result: pass

## Summary

total: 15
passed: 15
issues: 0
pending: 0
skipped: 0

## Gaps

[none]
