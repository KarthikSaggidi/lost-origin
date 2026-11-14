# POS open bills

Open `/admin?view=pos` on the admin service (local port 5174).

- Select **New bill** to open another customer's draft. Each bill keeps its own items, label, name, phone, notes, coupon, payment choice and billing reference. Selecting a bill opens its details in a pop up, with quantity controls, customer details, payment method, tax and total. Use **Review and bill** to continue.
- The ticket on the right scrolls independently, so the counter menu does not need to be scrolled past to review a large bill. On mobile, use the fixed total bar to open the same bill preview.
- Switching bills does not create a sale or reserve stock. Clear affects only the selected draft; a draft must be empty before it can be closed. Up to 20 bills can remain open.
- Creating a bill locks only that draft, so another customer can be served while the request finishes. If a response is interrupted, the original draft stays locked with its submitted snapshot. **Recover bill** checks the authenticated `/api/v1/pos?requestKey=…` endpoint and retries the same reference if needed, avoiding a duplicate sale.
- Unpaid drafts recover after refresh in the same browser tab and admin account using session storage. They are local to that tab, not shared across devices. Closing the tab or clearing browser storage can discard unpaid drafts. A duplicated tab receives a separate workspace on browsers with Web Locks; BroadcastChannel provides a fallback. Saved financial records remain in the server database.
- Cash and UPI bills can be queued offline and keep their original reference when syncing. Card billing requires connectivity. Payments remain demo records until a real payment provider is configured.
