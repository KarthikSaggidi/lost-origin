# POS voice entry and open bills

Open `/admin?view=pos` on the admin service (local port 5174).

- Select **Enable voice** and allow microphone access. Say “one brownie cold coffee”, “two cappuccinos and one veg sandwich”, or “one cold latte”. The switch disables microphone entry; Stop pauses listening. Voice starts off for each bill.
- Hot/cold items require a variant. Choose it on screen, or say “hot” / “cold” when a single variant is pending. Unknown items and invalid quantities do not partially add a command. Only final recognition results add items.
- Voice recognition needs a supported browser (Chrome or Edge), a secure context (HTTPS or localhost), microphone permission and usually the browser provider’s internet service. Audio may be processed by that provider. The typed quick-command field uses the same menu matching and remains available without speech support. Voice cannot complete payments, clear a bill or delete items.
- **New bill** opens another customer’s draft. Each tab holds its own items, label, name, phone, notes, coupon, payment choice and unique billing reference. Switching tabs does not create a sale or reserve inventory. Inventory is checked again when billing.
- Close checkout to return to open bills; its details remain saved. Creating a bill locks only that draft, so another customer can be served while the request finishes. Clear affects only the selected draft; close requires an empty draft. Up to 20 drafts can remain open.
- Unpaid drafts recover after refresh in the same browser tab and admin account using session storage. They are local to that tab, not shared among devices. Closing the tab or clearing browser storage can discard unpaid drafts. A duplicated tab receives a separate workspace on browsers with Web Locks; BroadcastChannel provides a fallback. Saved financial records remain in the server database.
- If a response is interrupted, the original draft stays locked with its submitted snapshot. **Recover bill** checks the authenticated `/api/v1/pos?requestKey=…` endpoint and retries the same reference if needed. It does not start a second sale. A recovered result removes only that draft, even if another bill is active.
- Cash/UPI offline bills continue to use the existing local outbox and keep their original reference when syncing. Card billing requires connectivity. Payments remain demo records until a real payment provider is configured.

Automated checks cover parsing, variants, stock/quantity limits, independent bill state, recovery snapshots and late completion. Browser QA uses simulated speech events to test lifecycle/duplicate handling; an actual microphone and the browser’s external recognition service still require a device check.
