# LPU-AdvisorHUB

A responsive, front-end-only advisor booking demo built with semantic HTML, CSS, and vanilla JavaScript ES modules. User accounts, appointments, availability, theme preference, notifications, and feedback are stored in the browser's `localStorage`; there is no backend.

## Run it

The recommended way is the included Node.js static server. It has no package dependencies and serves ES modules with the correct MIME type:

```sh
npm run dev
```

Then open <http://localhost:5173>. `PORT` can be set to use a different local port.

The home page is `index.html`. Because browsers restrict imported ES modules on some `file://` URLs, use the local server if opening the file directly does not load the app in your browser.

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Student | `student@demo.com` | `student123` |
| Teacher / advisor | `teacher@demo.com` | `teacher123` |
| Admin | `admin@demo.com` | `admin123` |

Other seeded students use `priya@demo.com` or `dev@demo.com` with `student123`. Additional seeded advisors can log in as `advisor2@demo.com` through `advisor6@demo.com` with `teacher123`.

Seed data is created automatically on the first page load. Admin > Reset demo data restores it. Since this is a client-only demo, passwords are stored as plain text in local storage and are not secure; a production app needs a backend, secure password hashing, authorization, and server-side validation.

## Project structure

```text
index.html
pages/
  404.html
  about.html
  admin-dashboard.html
  advisor-profile.html
  advisors.html
  appointments.html
  booking.html
  calendar.html
  feedback.html
  login.html
  profile.html
  register.html
  student-dashboard.html
  teacher-dashboard.html
css/
  styles.css
js/
  app.js
  auth.js
  calendar.js
  reminders.js
  storage.js
  theme.js
  ui.js
server.cjs
package.json
```

`app.js` renders the shared navigation/footer and page views. The other JavaScript modules isolate local data, session/authentication, theme selection, calendar and slot logic, reminders, and UI notifications/dialogs. The app stores all site data in the `lpu-advisorhub-v1` localStorage record and the current signed-in user in `lpu-advisorhub-session`.

## Notes

- Booking requests are initially **Pending**; advisors can accept, decline, complete, and add notes.
- Advisors manage recurring weekly slots, date-specific slots, and blocked days. Slots in the past, blocked slots, and slots booked by a live appointment cannot be booked.
- Students can cancel at least two hours before a session. Cancelled or declined bookings release the slot.
- Teacher registrations start unapproved; an admin can approve the listing and manage users, appointments, and moderated feedback.
- The calendar supports month and week views, and session details can be downloaded as an `.ics` file.
- Browser notifications are optional. The app also shows in-app reminders for confirmed sessions within 24 hours and one hour.
