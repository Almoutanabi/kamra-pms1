/** Party-size limits shared by the public booking screens.
 *
 * Both the property page and a single listing have to stop a guest asking for
 * more people than the room can sleep - the booking refuses it on submit
 * (Reservation.validate_occupancy), and a guest who gets a price first and a
 * refusal afterwards has been wasted. The rule lived in both screens; it lives
 * here so a correction reaches both.
 */

export interface RoomCapacity {
  adults_capacity: number
  children_capacity: number
  /** Beds the house will add to a let room by arrangement. */
  max_extra_beds?: number
}

/** Hold a guest count inside its floor and, when there is one, its cap. */
export function clampGuests(value: number, floor: number, cap: number) {
  const n = Number.isFinite(value) ? value : floor
  const atLeast = Math.max(floor, n)
  return cap > 0 ? Math.min(atLeast, cap) : atLeast
}

/** What the roomiest of these room types can sleep.
 *
 * A property page lists several and the guest has not picked one yet, so the
 * largest bounds the search - capping at the smallest would block a party a
 * bigger room could take. One room type with no capacity set means no cap at
 * all, since a stated limit of zero is "unset", not "nobody".
 */
export function maxCapacity(
  roomTypes: RoomCapacity[] | undefined,
  field: keyof RoomCapacity,
) {
  const caps = (roomTypes || []).map((rt) => Number(rt[field]) || 0)
  return caps.length && caps.every((c) => c > 0) ? Math.max(...caps) : 0
}

/** The most guests of one kind a room of this type may be told to sleep:
 * its stated occupancy plus the beds the house adds by arrangement.
 *
 * A bigger party is still bookable - it splits across rooms and each one
 * carries its own count - but no single room accepts more guests than it has
 * beds for, because the booking would only be refused on save
 * (Reservation.validate_occupancy). A stated capacity of 0 means "unset", so
 * it caps nothing.
 */
export function sleeps(
  rt: RoomCapacity | undefined,
  kind: "adults" | "children",
) {
  const base = Number(rt?.[`${kind}_capacity`] || 0)
  return base > 0 ? base + Number(rt?.max_extra_beds || 0) : 0
}
