# Kamra front-desk guide

The working manual for a day at the desk. Everything here assumes you're
signed in at your hotel's Kamra URL; your role decides which sections of
the sidebar you see.

## The day at a glance — Today

**Today** is home: arrivals, departures, in-house guests and the room
board, refreshed every 30 seconds.

- Every stay row carries a **payment chip** — `Paid`, `₹X due`, or
  `Unpaid` — straight from the folio.
- Arrival rows link to the **GRC** (registration card) and a
  **copy check-in link** button. Hover it: it tells you whether the link
  should go to the guest or the booker.
- "via Priya (Assistant)" on a row means the stay was booked on
  someone's behalf — hover for the booker's phone.

## Booking

**New booking** (top right, anywhere):

1. Type the guest's name — returning guests appear as you type; picking
   one attaches the stay to their profile ("Returning guest · 4 stays").
2. Pick room type, dates, occupancy, meal plan. The **quote updates live**
   and states the cancellation policy and any deposit expected. Check-in
   cannot be before today (unless recording a past stay via import or an
   explicit catch-up flag).
3. **Add another room** turns the booking into a group — one confirm
   books every room under one group reference.
4. Optional: company (bills corporate — see billing rules), travel
   agent, add-ons (posted to the folio at check-in), voucher, and
   "Booked on someone's behalf" (who arranged it + who receives links).

**Tape chart vs Calendar:** the Calendar sells (availability and rates
by room *type* — click a cell to book); the tape chart operates (who is
in which physical room — click a bar to move rooms or amend dates,
both re-priced and overlap-checked).

## Check-in

**Check in** on the arrival row opens the check-in flow:

1. **Registration at a glance** — chips show whether the guest
   pre-checked-in online, whether ID and address proof are on file,
   phone and email, and a VIP flag. Nothing blocks check-in, but you
   see what's missing. **Open GRC** is one click for capture or print.
2. **The room** — if none is assigned, the allocator suggests one with
   its reason ("VIP → high floor", preference matches). Take it, or
   pick from every free room of the type; housekeeping state shows on
   each, with a warning before handing over an uncleaned room.
3. Confirm — the room is assigned and the guest is in.

**Changing rooms**: use **Change room** in the reservation drawer's Room
card or on the GRC (or drag on the tape chart). Pick from rooms free for
the stay's dates (clean rooms first; switch to *All types* to upgrade),
see the price effect, give a reason, and confirm. Moving an in-house
guest marks the old room Dirty for housekeeping.

**On the GRC**: a checklist on the right shows what the registration
still needs (ID, address proof, occupants, signature), with one-tap
document capture and the stay's money. Then: record the **occupants** (everyone in the room — the
legal register) and capture **each occupant's ID** with the camera
button on their row; capture or replace the guest's ID and address
proof; **edit the primary guest's nationality** (click **edit** next to
Nationality — updates the guest profile for the folio and printed
invoice); correct the **actual check-in/out times** when reality differs
from plan; and manage the stay's money line — advances, security
deposits, refunds (reason required, capped at what was collected).
Under Verify & Discard retention, every scan and full ID number is
masked and deleted at checkout.

**Children** (under 18) are recorded by name and age only: no phone, and
no ID unless the register needs it. In India that means foreign nationals
(Form C); in Saudi Arabia, Shomoos registers every guest, so IDs stay.

### Walk-ins — one screen

For a guest standing at the counter, use **Walk-in** (top bar, or the
**Reservation / Walk-in** switch in New booking). On one screen enter the
guest's name, phone and **ID** (the ID types your country accepts), pick
the **room type and the actual room** (free tonight, clean rooms first),
the nights, and the **payment** — cash, card or transfer, the full
amount or part of it. **Check in & collect** books the stay, checks the
guest into the room and records the advance in one go. It is
all-or-nothing: if the till is closed or the room was just taken,
nothing is saved and the screen tells you why.

## Money — folios

Every stay has a folio; corporate stays may have Company/Group folios
that charges route to automatically (set per company under Corporate →
billing rules; alcohol always bills to the guest). A credit company with
no rules of its own uses the property default in **Settings → Finance →
Corporate billing**: by default the company pays the room, its meal plan,
levies and food & beverage, and the guest pays liquor and personal extras
(laundry, minibar, spa, misc). Pick **Nothing** to bill a company only
through its own rules.

- **Post a charge** or **record a payment** from the folio screen.
- **Nationality** on the folio header is editable (**edit** → Save) and
  updates the guest profile for the printed bill.
- **Split** any line by percent or amount (`30%` or `1500`) to another
  folio; select several lines to **move them in bulk**.
- **Payment link** creates a gateway link for the balance and copies it.
- Night audit posts room nights at 3 AM, flags **and charges** no-shows
  per your policy. It's idempotent — safe to run manually too.
- Room nights bill the **rate confirmed at booking**, night by night
  (season, demand premium and rate plan included). A later rate change,
  a new season or the house emptying out never changes a confirmed
  stay. Changing the dates or moving to another room type re-quotes it:
  Kamra shows the new total and only saves once you confirm it.

### Night audit and no-show policy

Settings → **Front Desk** → **Night audit & no-shows** decides when an
arrival that never came becomes a **No Show**. The fee itself is the
*No-show charge* under **Stay policies**.

| Setting | Default | What it does |
| --- | --- | --- |
| Mark no-shows | At audit for arrival date | The audit that closes the arrival date marks it. *One day later* keeps it Due In until the next day's audit. |
| Hold late arrivals until the next audit | On | An arrival due on the day being closed stays Due In when it is flagged **Late arrival** (reservation drawer) or its ETA is later than the moment the audit runs. An ETA before 06:00 means after midnight: a manual audit at 23:00 holds a 01:00 ETA, the 03:00 scheduled run does not. Held arrivals are listed in the audit result and the next audit marks them no-show if they still have not arrived. |
| No no-show fee on OTA bookings | On | OTA and channel bookings are still marked No Show, but no fee is posted: the OTA charges the guest under its own policy. |
| Release non-guaranteed arrivals at | Blank (off) | At this time, today's arrivals that are not guaranteed are cancelled with no fee and the room goes back on sale. Guaranteed means an advance paid, a payment or deposit on the folio, an OTA booking or a company booking. Late arrivals and bookings made after the release time are kept. |

### Night audit checklist — End of Day

**Finance → End of Day** (also under Front Desk, and found by typing
*night audit*, *end of day* or *EOD* in search, Ctrl/Cmd+K) is where the
night auditor closes the business date. **Manage End of Day** shows one
card per property: the business date, the property's clock, arrivals and
departures pending, open cashiers, open POS bills and a *Ready* /
*N blockers* chip. Below it is the history of past audits, searchable by
date, each with its audit pack.

**Manage** opens the wizard. The steps are listed on the left with a
status each (pending, running, done, blocked, skipped); the right shows
the active step's message, its actions and a searchable, sortable list.
Progress is saved on a draft run, so reopening resumes where you stopped.

| # | Step | What you do |
| --- | --- | --- |
| 1 | Prepare End of Day | Pre-checks load; business date, server date and property time side by side. |
| 2 | Arrivals not checked in | Check in, **Mark no-show** or Continue. Each row shows what the no-show policy will do: no-show with the fee, held late arrival, or OTA fee waived. |
| 3 | Departures not checked out | **Check out**, **Extend stay**, or **Quick check out** every zero-balance departure at once. *Blocks by default.* |
| 4 | Open folios and high balances | In-house folios over the threshold, balances left on departed stays, companies over their credit limit (AR plus in-house company folios). |
| 5 | Outlets and room postings | Open restaurant bills (*blocks by default*) and every outlet bill posted to a room today - outlet, bill no, room and guest - to catch a wrong-room posting. |
| 6 | Rate check | Room nights posted more than the tolerance away from the booked (locked) rate, and zero-rate / complimentary rooms. |
| 7 | Room status | Rooms where the front office and the room board disagree, and vacant rooms. |
| 8 | Cashier closure | Open cashier sessions with **Close session** (count the drawer); expected vs counted per session. *Blocks by default.* |
| 9 | Notes | Notes for the manager (weather, incidents); printed on the pack. |
| 10 | Post room and tax and roll the business date | Runs the night audit. |
| 11 | Print final reports | Each report with View / Print / Download PDF, plus **Print all** on A4. |
| 12 | Finalize | Summary and done. |

A **blocking** step cannot be passed until it is resolved or a supervisor
**acknowledges** it with a reason; who acknowledged it and when are saved on
the audit. Warning steps just have **Continue**. The final reports - the
manager's flash, the journal by cashier and transaction code, the cashier
summary, the guest ledger, the city ledger / AR summary, the deposit
ledger, the trial balance, occupancy & revenue (Occ %, ADR, RevPAR),
no-shows and cancellations, rate variance and the pre-checks with their
acknowledgements - are read from the **audit pack** saved on the Night
Audit Run, so a past night prints exactly what was printed that night.
Audits from before packs existed say so instead.

Settings → **Front Desk** → **Night audit checklist**:

| Setting | Default | What it does |
| --- | --- | --- |
| Open tills block the audit | On | Off lists open cashier sessions as a warning. |
| Open restaurant bills block the audit | On | Off lists them as a warning. |
| Departures still in house block the audit | On | Off lists them as a warning. |
| Flag in-house folios owing more than | 50,000 | 0 turns the high-balance check off. |
| Rate variance tolerance | 1 | How far (in currency units) a posted room night may be from the booked rate. |
| Scheduled 03:00 audit when checks block | Run and report exceptions | *Run and report exceptions* always rolls the date and lists the open items as exceptions in the pack. *Hold and alert* leaves the business date and alerts Hotel Admin and Finance (in-app notification and email). |

The **Night Auditor** role can run End of Day and acknowledge blockers,
check guests in and out (quick check-out too), close cashier sessions,
and view folios, the cashier summary and reports. Agents use the
`night_audit_precheck` MCP tool for the same checklist.

### Deposits before arrival

Secure a booking with a deposit at booking time or any time before
check-in: the **Deposit** panel appears on the booking-confirmed screen
and in the reservation drawer. It shows what the property's deposit %
expects, what has come in, and what is still due.

- **Record payment**: cash, card at the desk or a transfer (the methods
  your country pack offers). It goes through the till like any other
  payment, so the shift report and ledger include it.
- **Send payment link**: creates a gateway link for the amount due (or
  any amount you type) with a ready-made message to copy or send on
  WhatsApp. When the guest pays, the deposit posts itself.

Either way the money sits on the guest folio as an **Advance**, and at
check-in it counts against the bill, so the balance due is right. A
*Held* or *Pending Payment* booking is confirmed by its deposit.

## Cancelling

Open the reservation → **Cancel this stay…** You'll see what it costs
*before* you confirm (policy window and fee), pick a reason, optionally
waive the fee (logged). You get a **cancellation number** to give the
guest and a printable confirmation letter showing any refund due.
The status field itself refuses direct flips to Cancelled — the policy
can't be skipped by accident.

## Checkout & invoicing

Check out from the departure row (the chip warns you if money is owed).
Checkout back-fills any unposted nights, then refuses while any folio has
a balance: collect what is owed, or refund an overpayment, first. On a
corporate stay whose company has credit, the balance moves to the city
ledger automatically. On the folio, **Close &
generate invoice** assigns the GST invoice number and produces the
printable multi-rate invoice (B2B GSTIN included when a company pays).
GSTR-1 export lives in the billing APIs for your accountant.

**Saudi Arabia:** settled bills print as a *Simplified Tax Invoice*
(*فاتورة ضريبية مبسطة*) with the ZATCA QR code; cancelling an invoice
issues a credit note. Set up the seller details once under *Settings →
ZATCA e-invoicing* — see [Country setup & ZATCA](/country-setup).

## Housekeeping

`/hk` on any phone: prioritized clean queue (rooms with arrivals jump
the line), tap Start/Done — Done marks the room clean on everyone's
board.

**Supervisors** (the *Housekeeping Supervisor* role, or the front desk)
get **Housekeeping → Room Board**: every room with its status, the guest
in it, who is due out, and each open task with its assignee — filter by
status or floor, tap a room to set its status. Attendants can mark
rooms Clean or Dirty; only a supervisor or the desk can pass a room
(Inspected) or take it Out of Order. The task list is under
**Housekeeping → Tasks**.

## WhatsApp

If your property connected its own number ([setup guide](/whatsapp)):
booking confirmations and self check-in links go out on their own.
**Operations → WhatsApp** is the inbox — threads per guest, chat on the
right, reply box at the bottom. Replies deliver while the guest's
24-hour session window is open (any message from them reopens it);
outside it, only templates deliver, and the screen says so. Messages
from in-house guests also raise a ticket on **Guest Requests**.

## The AI helpers

- **Front-desk copilot** (sparkle button, bottom right — if your admin
  enabled it): ask in plain language — "who's arriving?", "quote a
  double for the weekend", "cancel RES-2026-0142, guest request" — it
  quotes before booking, previews before cancelling, and every action
  it takes is logged.
- **MCP** — **Kamra Agent → Connect your AI → Connect Claude**. It acts
  as you. See [Connect your AI](/ai-and-mcp).

## Settings & access

Everything a property configures lives in **Settings** (Admin → Settings,
or the *Settings* item at the bottom of each app's sidebar, which opens
that app's own page). The left rail groups it:

- **Property**: identity and locale, stay policies (check-in/out times,
  cancellation, no-show, deposits), privacy and data retention.
- **Modules**: one page per app. Front Desk (pre-check-in links, holds,
  hourly view), Housekeeping (task deadlines by priority, room turnover,
  laundry express pricing and the rate card), Operations (guest request
  deadlines), F&B (table reservation window), Banquets & Groups (quote
  margins, default payment milestones, follow-up), Revenue (overbooking,
  demand pricing), Finance (room tax, levies and fees, cashier PIN
  lockout, cash refund limit) and Booking Engine.
- **Access**: *Staff & access* to add people, set their roles and which
  properties they reach, deactivate them or reset a cashier PIN.
  *Roles & permissions* shows what each role opens and which settings it
  may change. *Modules* switches off the apps a property doesn't run.
- **Integrations**: payments, the AI assistant key, Claude (MCP) and, for
  Saudi properties, ZATCA.

Press <kbd>/</kbd> to search every setting by name. Each page shows who may
change it. A Revenue Manager edits stay policies, revenue, banquets and the
booking engine; Finance edits finance and F&B; a Housekeeping Supervisor
edits housekeeping; Hotel Admin edits everything. Others see their pages
read-only. Changed values show a dot, unsaved changes collect in a save bar
at the bottom, and any value can be put back to its default. Every save
lands in the Activity log with the old and new values.

A Hotel Admin manages business roles. Only IT (System Manager) can grant
the IT administrator role, and an admin limited to some properties can
only give access to those.
