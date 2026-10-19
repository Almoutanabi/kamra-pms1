# Housekeeping — rooms, cleans and laundry

The Housekeeping module keeps every room's status current and gets rooms
cleaned in the right order. Supervisors and the front desk watch the
**Room Board**; attendants work from the **phone app**, where they take
rooms, mark them done, post minibar charges and log lost property.
Guest laundry runs from the same module.

![The Room Board: every room by floor, coloured by status, with the guest in it and the open task and its assignee](/img/housekeeping/room-board.png)

## Before you start

1. **Give staff the right role.** In **Settings → Staff & access**:
   - **Housekeeping** for attendants. They get the phone app, the task
     list, laundry and lost & found, and can mark rooms **Clean** or
     **Dirty**.
   - **Housekeeping Supervisor** for supervisors. It includes everything
     Housekeeping can do, plus the **Room Board**, the right to mark rooms
     **Inspected** or **Out of Order**, and **Settings → Housekeeping**.
   - The **Front Desk** and **Hotel Admin** roles can also use the Room
     Board and set any status.
2. **Set the task deadlines** in **Settings → Housekeeping → Task
   deadlines** (see [Settings](#settings)). Kamra uses them to flag late
   cleans and escalate them.
3. **Put a mobile number on each manager's user** if you want escalations
   on WhatsApp. Alerts go out over the property's WhatsApp connection
   ([WhatsApp setup](/whatsapp)).
4. **Fill in the laundry rate card** if you take guest laundry:
   **Housekeeping → Laundry → Price menu** (see
   [Set up the laundry price menu](#set-up-the-laundry-price-menu)).

## Where cleaning tasks come from

- **Check-out.** When the desk checks a guest out, Kamra marks the room
  **Dirty** and creates a **Checkout Clean** task with **High** priority.
  A room that is **Out of Order** gets no task.
- **Maintenance tickets.** When someone starts a guest request in the
  **Maintenance** category for a room, Kamra adds a **Maintenance** task
  to that room (see [Operations](/operations)).
- **Inspections.** With **Inspect after every checkout clean** on, a
  finished checkout clean creates an **Inspection** task.
- **By hand.** **Housekeeping → Tasks → New**: pick the room, the type
  (**Checkout Clean**, **Stayover Clean**, **Deep Clean**, **Inspection**,
  **Maintenance**), the priority and an optional note.

![The New Housekeeping Task form with room, type, priority, status and notes](/img/housekeeping/new-task.png)

Every task gets a deadline when it is created: its priority's minutes
from **Task deadlines**.

## Check every room on the Room Board

1. Open **Housekeeping → Room Board**.
2. Each tile shows the room number, its status, the guest staying in it,
   and the open task with its type and assignee. A bed icon means the
   room is occupied; an arrow icon means the guest is due out today.
3. Use the buttons along the top to show only **Dirty**, **Clean**,
   **Inspected** or **Out of Order** rooms, rooms **Due out** today, or
   rooms that **Has task**. Each button shows its count.
4. Use **All Floors** / **Floor 1** … to show one floor.

The board reloads every 30 seconds. Press **Refresh** to reload now.

## Change a room's status

1. On the Room Board, click the room.
2. Pick **Mark Clean**, **Mark Dirty**, **Mark Inspected** or **Mark Out
   of Order**.

![A room's menu on the Room Board with Mark Clean, Mark Inspected and Mark Out of Order](/img/housekeeping/room-board-menu.png)

Attendants only see **Mark Clean** and **Mark Dirty**. Passing a room
(**Inspected**) or taking it **Out of Order** is for a supervisor, the
front desk or a Hotel Admin. Kamra checks this on the server too, and logs
every change.

## Work from the phone app

The phone app is made for one hand on a housekeeping trolley. Open
**Housekeeping → Phone App**, or go to `/kamra/hk` on your Kamra address,
and sign in. Add it to the phone's home screen so staff open it like an
app.

![The phone app's My Tasks tab: room 203 assigned and waiting to be accepted, room 104 ready to start](/img/housekeeping/hk-my-tasks.png)

The app has four tabs along the bottom:

| Tab | What it shows |
| --- | --- |
| **My Tasks** | Tasks assigned to you or taken by you |
| **Available** | Tasks nobody has taken yet |
| **Rooms** | Every room and its status; tap an occupied room to post a charge |
| **Laundry** | Pickup requests and bags in hand (same as the desk's laundry board) |

Tasks are sorted so the right room comes first: rooms with a guest
arriving today, then checkout cleans, then by priority (**Urgent**,
**High**, **Medium**, **Low**), then oldest first. Each card shows:

- a star for a VIP guest,
- **arrival today** (with the guest's arrival time when the booking has
  one),
- the guest's requests from the booking, and any task note,
- **overdue** once the task is past its deadline.

### Take a room from the pool

1. Open **Available**.
2. Tap **Take this room** on a card. The task moves to **My Tasks**.

![The Available tab with three unassigned rooms, one of them a VIP stayover that is overdue](/img/housekeeping/hk-available.png)

If someone else took the room a moment earlier, Kamra refuses the second
tap and the card leaves **Available** on the next refresh.

### Accept or decline a room you were given

A task assigned to you shows **assigned to you** with **Accept** and
**Decline**.

- Tap **Accept** to keep it.
- Tap **Decline**, type a reason if you want (it's optional), and tap
  **Send back**. The task goes back to **Available** and the reason is
  kept on the task. **Keep** cancels.

### Clean a room

1. On **My Tasks**, tap **Start** when you begin. The card shows **In
   progress…**.
2. To keep proof of the clean, tap **Add photo / video** and take a photo
   or pick one. Add as many as you need; tap the red **×** on a thumbnail
   to remove it.
3. Tap **Done ✓**.

![A housekeeper takes room 105 from Available, starts it, marks it done, and the room shows Clean](/img/housekeeping/hk-take-and-finish.gif)

When a task is done, the room turns **Clean** on every screen. If the
clean finishes after its deadline, the task is marked as a missed
deadline. If a guest is arriving today in that room, the front desk gets
a WhatsApp message that the room is ready.

The front desk sees the photos from the room's latest clean on **Today**
(the camera button on the room), and on the task in **Housekeeping →
Tasks**.

## Assign a room to a housekeeper

Kamra's screens don't have an assign button yet. Staff take rooms from
the **Available** pool themselves. To hand a task to a named person, use
an AI agent connected over MCP (the `hk_assign_task` tool) or the API.
The task then shows on that person's **My Tasks** as **assigned to you**
until they accept or decline it.

## See all tasks

**Housekeeping → Tasks** lists every task, newest first, with its room,
type, priority and status. Click a task to change it or to see its
photos.

![The Housekeeping Tasks list: five pending cleans and one done](/img/housekeeping/tasks.png)

A task's status goes **Pending → In Progress → Done**. **Verified** is
for an inspection: setting a task to **Verified** marks the room
**Inspected** (or **Ready** when **Inspect after every checkout clean**
is on).

## Late tasks and escalation

Every 15 minutes Kamra looks for open tasks past their deadline:

1. As soon as a task is overdue, it is marked as a missed deadline and
   everyone with the **Front Desk** role gets a WhatsApp message: *room,
   task, priority, minutes past due*.
2. If it is still open after another full deadline (for example, a
   **High** clean still open 45 minutes after it was due), everyone with
   the **Hotel Admin** role gets a second message.

Messages go to the mobile number on each user's record, over the
property's WhatsApp connection. Without a connected WhatsApp number the
escalation is only written to the activity log.

## Post minibar and laundry charges from the room

1. In the phone app, open **Rooms**.
2. Tap an occupied room (rooms with a bed icon).
3. Pick **Minibar** or **Laundry**, write what was used ("2 cola, 1
   water") and the amount.
4. Tap **Post**.

![Posting a minibar charge of 240 to room 101 from the phone app](/img/housekeeping/hk-post-charge.png)

The charge goes on the in-house guest's folio. Housekeeping can only post
**Minibar** or **Laundry**, the amount must be more than zero, and the
room must have a checked-in guest. Tax on the line is worked out by
Kamra, not by the housekeeper. For counted laundry bags, use the laundry
board instead (below): it prices from the rate card.

## Handle guest laundry

**Housekeeping → Laundry** (also under **Finance → Laundry**) is the
laundry board. **Pickup requests** waits to be collected, **In hand**
are bags out with the laundry, **Recent** are the last delivered or
cancelled bags.

![The laundry board: a pickup request for room 101 and two bags in hand, one ready and one in process](/img/housekeeping/laundry-board.png)

1. **Log the request.** Press **Log pickup request**, pick the room, press
   **Standard service** to switch it to express if the guest wants it, add a note ("bag on the door after
   3 pm"), and press **Add to pickup queue**. Guests can also ask for a
   pickup themselves from their online check-in page once they are
   checked in.
2. **Collect and count.** At the door, press **Collect & count** on the
   request. Use **+** and **−** on each item and service, with the guest.
   Prices come from the price menu; you can't type a price. Press
   **Collect … pieces**. To take a bag with no request first, press
   **Collect now**.
3. **Send it.** Press **Send to laundry**, and **Mark ready** when it
   comes back.
4. **Return and deliver.** Press **Return & deliver**, count each item
   back in (or press **Everything came back**), and press **Deliver &
   bill**.

![Counting a bag with the guest: blazer, dress and jeans added, then collected](/img/housekeeping/laundry-collect.gif)

![Returning a bag to room 102 with one saree short and a note saying why](/img/housekeeping/laundry-return.png)

When the bag is delivered, Kamra posts the laundry bill to the guest's
folio. If a piece is missing, you must write why in the shortage box
before you can deliver; the note stays on the order.

Each bag gets a **Ready by** time: 8 pm today for express, 8 pm tomorrow
for standard. A bag past that time shows **overdue**. **Docket** prints
a slip for the bag on the thermal printer.

**House laundry and free bags.** In **Collect now**, choose **House
(uniforms / linen)** for hotel items, or tick **Complimentary — don't
bill the guest**. Kamra counts these bags but never bills them.

**Cancel** a bag that won't be done. You must give a reason; it is saved
on the order.

The **Billing** tab shows laundry revenue for the last days: billed
orders, pieces, revenue by service, and how many bags were house or
complimentary.

## Set up the laundry price menu

1. Open **Housekeeping → Laundry → Price menu**.
2. Press **Add rate**. Enter the item (Shirt, Saree…), the service
   (**Wash & Iron**, **Dry Clean** or **Iron Only**), the rate and,
   optionally, the express rate.
3. Press **Save**.

![The laundry rate card with items, services, rates and express rates](/img/housekeeping/laundry-price-menu.png)

A blank express rate uses the **Express price** multiplier in
**Settings → Housekeeping** (1.5 × the rate by default). The same card
is in **Settings → Housekeeping → Laundry rate card**, with **Import
CSV** and **Export CSV** for loading a whole list. Front Desk, Finance
and Hotel Admin can change rates; housekeepers can only read them.

## Log lost, missing and damaged items

From the phone:

1. Tap the box icon at the top of the phone app.
2. Choose **Found**, **Missing** or **Damaged**.
3. Write what it is, pick the room if you know it, and tap **Log it**.

![Logging a found grey hoodie from room 204 on the phone app](/img/housekeeping/hk-log-item.png)

The item lands in **Housekeeping → Lost & Found** as **In Storage**, with
today's date and your name. The desk can also add items there with
**New**.

![The Lost & Found register with four items in storage](/img/housekeeping/lost-found.png)

When the guest collects the item, open it and set **Status** to
**Returned**, the **Guest** and **Returned on**. Use **Disposed** for
items you throw away or donate. Filter the list by **Kind** and
**Status**.

## Hand over a shift

**Finance → Shift Handover** keeps a record per shift (**Morning**,
**Evening**, **Night**): opening cash, cash collected, payouts, closing
cash, who you handed over to, and notes for the next shift. Press
**New**, fill it in, and set **Status** to **Closed** when the next shift
has taken over.

![The Shift Handover list with three shifts and their closing cash](/img/housekeeping/shift-handover.png)

It is a plain record: Kamra doesn't calculate the cash figures. For the
till count with variance, use the cashier's **My Till** and **Shift
Report** (see [Billing](/billing)).

## Settings

**Settings → Housekeeping** (Hotel Admin or Housekeeping Supervisor).
**Module on** hides or shows the whole module.

![Settings → Housekeeping: task deadlines, room turnover and the laundry express multiplier](/img/housekeeping/settings.png)

| Setting | Where | Default | What it does |
| --- | --- | --- | --- |
| **Urgent** / **High** / **Medium** / **Low** | Task deadlines | 20 / 45 / 90 / 180 min | Minutes from creation until a task of that priority is overdue and escalates |
| **Inspect after every checkout clean** | Room turnover | Off | When a checkout clean is done, creates a **High** **Inspection** task |
| **Inspection takes** | Room turnover | 30 min | The deadline of that inspection task |
| **Checkout clean takes** | Room turnover | 120 min | Saved on the turnover profile; not used by any screen yet |
| **Buffer before the room is sellable** | Room turnover | 0 min | Saved on the turnover profile; not used by any screen yet |
| **Allow same-day turns** | Room turnover | On | Saved on the turnover profile; not used by any screen yet |
| **Express price** | Laundry | 1.5 × regular | Express price for rate card lines with no express rate |

## Good to know

- A task's deadline is set when it is created. Changing a deadline in
  Settings only affects new tasks.
- **Done** always sets the room to **Clean**, including for an
  inspection task. To pass a room after inspection, set the inspection
  task to **Verified** in **Housekeeping → Tasks**, or mark the room
  **Inspected** on the Room Board.
- Photos and videos on a task can be up to 25 MB each.
- The phone app and the Room Board update by themselves every 20 and 30
  seconds; tap **Refresh** after a change made on another device.
- A laundry pickup request needs a checked-in guest in the room. A guest
  can't request a second pickup while one is still waiting.

## Troubleshooting

**"Only a housekeeping supervisor can set a room to Inspected."** The
user has the Housekeeping role only. Give them **Housekeeping
Supervisor**, or ask a supervisor or the desk to pass the room.

**"No checked-in guest in that room to bill."** The minibar or laundry
post needs a guest who is checked in. Check the room on the front desk's
**Today** screen.

**"No rate for … add it to the rate card first."** That item and service
isn't on the price menu, or it was disabled. Add it in **Laundry → Price
menu**.

**"Still pending: …"** when delivering laundry. Count the missing pieces
back in, or write a shortage note.

**Escalations don't arrive on WhatsApp.** Check that the property has an
active WhatsApp connection in **Operations → Channels**, and that the
Front Desk and Hotel Admin users have a mobile number on their user
record.

**The phone app shows nothing assigned.** Open **Available**: tasks wait
there until someone takes them.

## For developers

The phone app, Room Board and tasks run on `kamra.api` endpoints
(`hk_queue`, `hk_update_task`, `hk_claim_task`, `hk_accept_task`,
`hk_reject_task`, `hk_assign_task`, `hk_post_consumable`, `hk_log_item`,
`room_board`, `set_housekeeping_status`); laundry runs on `kamra.laundry`.
Escalation is the scheduled job `kamra.housekeeping.escalate_overdue_tasks`
(every 15 minutes). AI agents use the same calls as MCP tools — see the
[MCP tools](/mcp-tools#housekeeping) ([laundry](/mcp-tools#laundry)) and
the [API reference](/api-reference#laundry-housekeeping).
