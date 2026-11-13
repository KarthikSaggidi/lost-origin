# Website booking alerts

Successful website court reservations create an administrator notification in the
same database transaction as the booking, slots and financial records. Retried
requests do not create another notification. Failed slot reservations roll back
their notification. Admin-created reservations do not trigger website alerts.

The authenticated SSE connection refreshes admin state after a committed change.
Polling and focus refresh provide a fallback after disconnection. Admin receives:

- A saved notification and unread count in the header bell.
- A corner popup with customer, phone, court, date, time and total.
- A short two-note chime when booking sound is enabled and permitted by the browser.
- **View booking**, which opens the reservation and marks it read.
- **Mark shown as read**, which acknowledges the displayed notification records.

Click **Enable sound** once in the browser. The header control mutes/unmutes, and
the bell panel has **Test sound**. Ordinary admin interaction also unlocks audio
when its saved preference is enabled. Muting closes the audio context so queued
notes cannot resume later. Audio preferences persist locally.

Alerts work while the admin panel is open, including in a background tab when
the browser allows audio. This is not web push to a closed browser. Sound obeys
browser autoplay rules, device volume and operating-system restrictions.

Popups stay for 15 seconds and pause while hovered, focused, or the tab is hidden.
Three are visible at a time, with the rest queued. Details remain in the bell
after popups close. Popups also work over open admin dialogs. The latest 100
notifications are shown with unread records first; the badge counts all unread
records. Read status is stored on the server and shared between admin sessions.

Presented IDs are remembered per administrator/origin in local storage, so
refresh and reconnect do not replay alerts. Web Locks coordinate tabs when
supported so only one tab displays and sounds an event. Only IDs and sound
preferences go into local storage. Customer details stay in authenticated state.
Website/customer responses contain no admin notifications. Marking them read
requires admin authentication, the exact request origin and a CSRF token.

Migration `0007_cool_tenebrous.sql` adds the notification table and index. After
pulling, use root `npm run db:migrate` with the repository's local migration
workflow. Hosted deployment must apply the migration before the updated Worker.

Unit tests cover eligibility, deduplication and public-response privacy. Browser
checks cover SSE, native audio playback scheduling, mute, dialogs, mobile layout,
read acknowledgement, refresh/reconnect and multiple tabs. These alerts do not
require SMS, SMTP or WhatsApp setup.

References: [Web Audio best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices),
[Web Locks](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API).
