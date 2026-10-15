"""Night audit: kamra.folio.run_night_audit and everything it drives.

Covers the business-date rules (closes only the current date, never one
ahead of today, rolls exactly one day), the postings (one room night per
in-house guest at the engine's rate, missing folios opened, departed guests
left alone), no-shows and their policy fee, the waitlist purge, the Night
Audit Run record, the 03:00 scheduler entry and the role gate on the API.

The calendar is pinned with TODAY / YESTERDAY from audit_fixtures; see that
module for how commits inside the audit are kept out of the site.
"""

from __future__ import annotations

from typing import ClassVar
from unittest.mock import patch

import frappe

from kamra import business_date as bdm
from kamra import folio as folio_mod
from kamra.tests.audit_fixtures import (
	PROP_A,
	PROP_B,
	TODAY,
	YESTERDAY,
	AuditTestCase,
	charges,
	d,
	ensure_user,
	guest_folio,
	make_property,
	make_reservation,
	make_room,
	make_room_type,
)


class NightAuditTestCase(AuditTestCase):
	def setUp(self):
		super().setUp()
		self.at(TODAY)
		make_property(PROP_A, business_date=YESTERDAY)
		make_property(PROP_B, business_date=YESTERDAY)
		self.rt = make_room_type(PROP_A, "STD", base_price=1000)
		self.rt_deluxe = make_room_type(PROP_A, "DLX", base_price=2500)
		self.rooms = [make_room(PROP_A, self.rt, f"10{i}") for i in range(1, 6)]
		self.deluxe_room = make_room(PROP_A, self.rt_deluxe, "201")
		self.rt_b = make_room_type(PROP_B, "STD", base_price=4000)
		self.room_b = make_room(PROP_B, self.rt_b, "101")
		make_room(PROP_B, self.rt_b, "102")

	# helpers -------------------------------------------------------------

	def in_house(self, room=None, check_in=None, check_out=None, prop=PROP_A,
	             room_type=None, **kw):
		return make_reservation(
			prop, room_type or self.rt, check_in or d(-3), check_out or d(2),
			status="Checked In", room=room or self.rooms[0], **kw)

	def arrival(self, check_in=None, check_out=None, **kw):
		return make_reservation(PROP_A, self.rt, check_in or d(-3),
		                        check_out or d(1), status="Confirmed", **kw)

	def bd(self, prop=PROP_A):
		return str(frappe.db.get_value("Property", prop, "business_date"))

	def set_bd(self, value, prop=PROP_A):
		frappe.db.set_value("Property", prop, "business_date", value)

	def set_policy(self, basis, prop=PROP_A):
		frappe.db.set_value("Property", prop, "no_show_charge", basis)

	def room_nights(self, res, date=None):
		rows = charges(res.name, "Room")
		if date:
			rows = [r for r in rows if str(r.posting_date) == str(date)]
		return rows

	# business date -------------------------------------------------------

	def test_closes_only_the_current_business_date(self):
		res = self.in_house()
		out = folio_mod.run_night_audit(PROP_A)
		self.assertEqual(str(out["business_date"]), YESTERDAY)
		self.assertTrue(frappe.db.exists("Night Audit Run",
		                                 f"AUDIT-{YESTERDAY}-{PROP_A}"))
		self.assertEqual(len(self.room_nights(res, YESTERDAY)), 1)
		# nothing was posted for any other night
		self.assertEqual(len(self.room_nights(res)), 1)

	def test_explicit_current_date_is_accepted(self):
		out = folio_mod.run_night_audit(PROP_A, YESTERDAY)
		self.assertEqual(str(out["business_date"]), YESTERDAY)

	def test_explicit_non_current_date_is_refused(self):
		res = self.in_house()
		for wrong in (d(-2), TODAY):
			with self.assertRaises(frappe.ValidationError):
				folio_mod.run_night_audit(PROP_A, wrong)
		self.assertEqual(self.bd(), YESTERDAY)
		self.assertFalse(self.room_nights(res))
		self.assertFalse(frappe.db.exists("Night Audit Run",
		                                  {"property": PROP_A}))

	def test_business_date_ahead_of_today_is_refused(self):
		self.set_bd(d(1))
		res = self.in_house()
		with self.assertRaises(frappe.ValidationError):
			folio_mod.run_night_audit(PROP_A)
		self.assertEqual(self.bd(), d(1))
		self.assertFalse(self.room_nights(res))
		self.assertFalse(frappe.db.exists("Night Audit Run",
		                                  {"property": PROP_A}))

	def test_blank_business_date_is_seeded_from_today(self):
		self.set_bd(None)
		out = folio_mod.run_night_audit(PROP_A)
		self.assertEqual(str(out["business_date"]), TODAY)
		self.assertEqual(self.bd(), d(1))

	def test_business_date_advances_exactly_one_day(self):
		out = folio_mod.run_night_audit(PROP_A)
		self.assertEqual(str(out["next_business_date"]), TODAY)
		self.assertEqual(self.bd(), TODAY)

	def test_business_date_rolls_over_a_month_end(self):
		self.at("2031-03-01")
		self.set_bd("2031-02-28")
		out = folio_mod.run_night_audit(PROP_A)
		self.assertEqual(str(out["next_business_date"]), "2031-03-01")

	# idempotency ---------------------------------------------------------

	def test_retry_after_success_returns_already_ran(self):
		res = self.in_house()
		first = folio_mod.run_night_audit(PROP_A)
		# the run finished but the date roll did not stick (a crash, a
		# restore): the same business date comes round again
		self.set_bd(YESTERDAY)
		again = folio_mod.run_night_audit(PROP_A)
		self.assertTrue(again.get("already_ran"))
		self.assertEqual(again["audit"], first["audit"])
		self.assertEqual(len(self.room_nights(res)), 1)
		self.assertEqual(frappe.db.count("Night Audit Run",
		                                 {"property": PROP_A}), 1)
		# and the business date was not rolled a second time
		self.assertEqual(self.bd(), YESTERDAY)

	def test_retry_with_the_closed_date_does_not_post_twice(self):
		res = self.in_house()
		first = folio_mod.run_night_audit(PROP_A)
		# a retry naming the closed date answers already_ran (#197)
		again = folio_mod.run_night_audit(PROP_A, YESTERDAY)
		self.assertTrue(again.get("already_ran"))
		self.assertEqual(again["audit"], first["audit"])
		self.assertEqual(len(self.room_nights(res)), 1)
		self.assertEqual(self.bd(), TODAY)

	def test_post_room_night_is_idempotent_per_date(self):
		res = self.in_house()
		self.assertTrue(folio_mod.post_room_night(res, YESTERDAY))
		self.assertFalse(folio_mod.post_room_night(res, YESTERDAY))
		self.assertEqual(len(self.room_nights(res, YESTERDAY)), 1)

	# postings ------------------------------------------------------------

	def test_one_room_night_per_in_house_guest_at_the_nightly_rate(self):
		std = self.in_house(room=self.rooms[0])
		std2 = self.in_house(room=self.rooms[1])
		dlx = self.in_house(room=self.deluxe_room, room_type=self.rt_deluxe)
		out = folio_mod.run_night_audit(PROP_A)
		self.assertEqual(out["room_charges_posted"], 3)
		for res, rate in ((std, 1000), (std2, 1000), (dlx, 2500)):
			rows = self.room_nights(res)
			self.assertEqual(len(rows), 1, res.name)
			self.assertEqual(str(rows[0].posting_date), YESTERDAY)
			self.assertAlmostEqual(float(rows[0].amount), rate, places=2)
			self.assertEqual(rows[0].parent, guest_folio(res.name))
		self.assertAlmostEqual(out["amount_posted"], 4500, places=2)

	def test_room_night_uses_the_season_rate_for_that_night(self):
		frappe.get_doc({
			"doctype": "Season", "property": PROP_A, "season_name": "UT Peak",
			"start_date": d(-1), "end_date": d(-1),
			"adjustment_type": "Percent", "adjustment_value": 20,
		}).insert(ignore_permissions=True)
		res = self.in_house()
		out = folio_mod.run_night_audit(PROP_A)
		self.assertAlmostEqual(float(self.room_nights(res)[0].amount), 1200,
		                       places=2)
		self.assertAlmostEqual(out["amount_posted"], 1200, places=2)

	def test_room_night_ignores_a_season_on_another_night(self):
		frappe.get_doc({
			"doctype": "Season", "property": PROP_A, "season_name": "UT Later",
			"start_date": d(0), "end_date": d(5),
			"adjustment_type": "Percent", "adjustment_value": 50,
		}).insert(ignore_permissions=True)
		res = self.in_house()
		folio_mod.run_night_audit(PROP_A)
		self.assertAlmostEqual(float(self.room_nights(res)[0].amount), 1000,
		                       places=2)

	# rate plans: the folio's room night is the night the guest was quoted.
	# folio._nightly_room_rate once ignored reservation.rate_plan, so the
	# audit and checkout billed the rack rate on a discounted booking.

	def plan(self, name, kind, value):
		return frappe.get_doc({
			"doctype": "Rate Plan", "property": PROP_A, "rate_plan_name": name,
			"code": name.upper().replace(" ", "-"),
			"modifier_type": kind, "modifier_value": value,
		}).insert(ignore_permissions=True).name

	def test_room_night_honours_the_bookings_rate_plan(self):
		plan = self.plan("UT Advance Purchase", "Percent", -10)
		res = self.in_house(rate_plan=plan)
		nightly_booked = float(res.amount_before_tax) / res.nights
		self.assertAlmostEqual(nightly_booked, 900, places=2)
		folio_mod.run_night_audit(PROP_A)
		self.assertAlmostEqual(float(self.room_nights(res)[0].amount), 900,
		                       places=2)

	def test_room_nights_equal_the_quote_night_by_night(self):
		"""Season on one night + a -10% plan: every posted night equals
		the quote's night under the same plan, and the stay sums to it."""
		from kamra.pricing import quote
		frappe.get_doc({
			"doctype": "Season", "property": PROP_A, "season_name": "UT Peak",
			"start_date": d(-2), "end_date": d(-2),
			"adjustment_type": "Percent", "adjustment_value": 20,
		}).insert(ignore_permissions=True)
		plan = self.plan("UT Member", "Percent", -10)
		res = self.in_house(check_in=d(-3), check_out=d(-1), rate_plan=plan)
		posted = folio_mod.post_remaining_nights(res)
		self.assertEqual(posted, 2)
		q = quote(PROP_A, self.rt, d(-3), d(-1), 2, 0, rate_plan=plan)
		rows = sorted(self.room_nights(res), key=lambda r: str(r.posting_date))
		# 1000 then 1200 (season), each 10% off
		self.assertEqual([round(float(r.amount), 2) for r in rows], [900, 1080])
		self.assertAlmostEqual(sum(float(r.amount) for r in rows),
		                       q["room_total"], places=2)
		self.assertAlmostEqual(q["room_total"], float(res.amount_before_tax),
		                       places=2)

	def test_amount_rate_plan_is_spread_over_the_stay(self):
		# the quote adds an Amount plan to the stay total once, so each night
		# carries its share and the nights sum to what was quoted
		plan = self.plan("UT Flat Off", "Amount", -400)
		res = self.in_house(check_in=d(-4), check_out=d(0), rate_plan=plan)
		self.assertAlmostEqual(float(res.amount_before_tax), 3600, places=2)
		folio_mod.post_remaining_nights(res)
		rows = self.room_nights(res)
		self.assertEqual(len(rows), 4)
		for r in rows:
			self.assertAlmostEqual(float(r.amount), 900, places=2)

	def test_rate_plan_applies_on_top_of_small_group_rate(self):
		rt = make_room_type(PROP_A, "SGV", base_price=8000,
		                    small_group_max_adults=4,
		                    small_group_price_per_adult=1500)
		room = make_room(PROP_A, rt, "301")
		plan = self.plan("UT SG Plan", "Percent", -10)
		res = self.in_house(room=room, room_type=rt, rate_plan=plan)
		folio_mod.run_night_audit(PROP_A)
		# 2 adults x 1500 per head, then 10% off
		self.assertAlmostEqual(float(self.room_nights(res)[0].amount), 2700,
		                       places=2)

	def test_no_plan_bills_the_plan_free_rate(self):
		res = self.in_house()
		self.assertAlmostEqual(folio_mod._nightly_room_rate(res, YESTERDAY),
		                       1000, places=2)

	def test_missing_guest_folio_is_opened(self):
		res = self.in_house()
		frappe.delete_doc("Folio", guest_folio(res.name), force=True,
		                  ignore_permissions=True)
		self.assertIsNone(guest_folio(res.name))
		out = folio_mod.run_night_audit(PROP_A)
		self.assertEqual(out["folios_opened"], 1)
		folio = guest_folio(res.name)
		self.assertTrue(folio)
		self.assertEqual(self.room_nights(res)[0].parent, folio)

	def test_existing_folio_is_not_reopened(self):
		self.in_house()
		out = folio_mod.run_night_audit(PROP_A)
		self.assertEqual(out["folios_opened"], 0)

	def test_guest_past_departure_is_not_charged(self):
		# still Checked In, but the stay ended on the date being closed
		gone = self.in_house(check_in=d(-4), check_out=YESTERDAY)
		long_gone = self.in_house(room=self.rooms[1], check_in=d(-5),
		                          check_out=d(-3))
		out = folio_mod.run_night_audit(PROP_A)
		self.assertEqual(out["room_charges_posted"], 0)
		self.assertFalse(self.room_nights(gone))
		self.assertFalse(self.room_nights(long_gone))

	def test_future_arrival_and_checked_out_stays_are_not_charged(self):
		future = make_reservation(PROP_A, self.rt, d(0), d(2),
		                          status="Confirmed", room=self.rooms[2])
		out = folio_mod.run_night_audit(PROP_A)
		self.assertEqual(out["room_charges_posted"], 0)
		self.assertFalse(self.room_nights(future))
		self.assertEqual(frappe.db.get_value("Reservation", future.name,
		                                     "status"), "Confirmed")

	def test_folio_totals_include_the_posted_night(self):
		res = self.in_house()
		folio_mod.run_night_audit(PROP_A)
		folio = frappe.get_doc("Folio", guest_folio(res.name))
		self.assertAlmostEqual(float(folio.charges_total), 1000, places=2)
		self.assertAlmostEqual(
			float(folio.grand_total),
			float(folio.charges_total) + float(folio.tax_total), places=2)

	# no-shows ------------------------------------------------------------

	def test_no_show_is_flagged_without_a_fee_when_policy_is_none(self):
		self.set_policy("None")
		res = self.arrival()
		out = folio_mod.run_night_audit(PROP_A)
		self.assertEqual(out["no_shows_flagged"], 1)
		self.assertEqual(frappe.db.get_value("Reservation", res.name, "status"),
		                 "No Show")
		self.assertFalse(charges(res.name))
		self.assertAlmostEqual(out["amount_posted"], 0, places=2)

	def test_no_show_first_night_fee(self):
		self.set_policy("First Night")
		res = self.arrival(check_in=d(-3), check_out=d(1))
		out = folio_mod.run_night_audit(PROP_A)
		self.assertEqual(frappe.db.get_value("Reservation", res.name, "status"),
		                 "No Show")
		fee = [c for c in charges(res.name)
		       if c.description == "No-show charge (First Night)"]
		self.assertEqual(len(fee), 1)
		self.assertAlmostEqual(float(fee[0].amount), 1000, places=2)
		self.assertAlmostEqual(out["amount_posted"], 1000, places=2)

	def test_no_show_full_stay_fee(self):
		self.set_policy("Full Stay")
		res = self.arrival(check_in=d(-3), check_out=d(1))  # 4 nights
		out = folio_mod.run_night_audit(PROP_A)
		fee = [c for c in charges(res.name)
		       if c.description == "No-show charge (Full Stay)"]
		self.assertEqual(len(fee), 1)
		self.assertAlmostEqual(float(fee[0].amount),
		                       float(res.amount_before_tax), places=2)
		self.assertAlmostEqual(float(fee[0].amount), 4000, places=2)
		self.assertAlmostEqual(out["amount_posted"], 4000, places=2)

	def test_policy_fee_basis_none_is_zero(self):
		res = self.arrival()
		self.assertEqual(folio_mod.policy_fee(res, "None"), 0.0)
		self.assertEqual(folio_mod.post_policy_fee(res, "None", "x"), 0.0)
		self.assertIsNone(guest_folio(res.name))

	def test_post_policy_fee_is_not_posted_twice(self):
		res = self.arrival()
		label = "No-show charge (First Night)"
		self.assertAlmostEqual(
			folio_mod.post_policy_fee(res, "First Night", label), 1000, places=2)
		self.assertEqual(folio_mod.post_policy_fee(res, "First Night", label), 0.0)
		self.assertEqual(len([c for c in charges(res.name)
		                      if c.description == label]), 1)

	def test_cancelled_and_in_house_stays_are_not_no_shows(self):
		self.set_policy("First Night")
		cancelled = self.arrival()
		frappe.db.set_value("Reservation", cancelled.name, "status", "Cancelled")
		in_house = self.in_house()
		out = folio_mod.run_night_audit(PROP_A)
		self.assertEqual(out["no_shows_flagged"], 0)
		self.assertEqual(frappe.db.get_value("Reservation", cancelled.name,
		                                     "status"), "Cancelled")
		self.assertEqual(frappe.db.get_value("Reservation", in_house.name,
		                                     "status"), "Checked In")

	# every money posting uses the business date, not the calendar: the
	# fee of a no-show flagged by the audit closing YESTERDAY is dated
	# YESTERDAY, like the room nights of the same run.
	def test_no_show_fee_is_dated_on_the_closed_business_date(self):
		self.set_policy("First Night")
		res = self.arrival()
		folio_mod.run_night_audit(PROP_A)
		fee = [c for c in charges(res.name) if c.description.startswith("No-show")]
		self.assertEqual(str(fee[0].posting_date), YESTERDAY)

	def test_cancellation_fee_is_dated_on_the_current_business_date(self):
		# outside the audit the fee belongs to the open business day, which
		# lags the calendar until the audit rolls it
		res = self.arrival(check_in=d(3), check_out=d(5))
		folio_mod.post_policy_fee(res, "First Night", "Cancellation fee (First Night)")
		fee = [c for c in charges(res.name) if c.description.startswith("Cancellation")]
		self.assertEqual(str(fee[0].posting_date), YESTERDAY)

	def test_arrival_due_on_the_closed_date_is_a_no_show(self):
		# end of day for D marks D's unarrived, guaranteed arrivals (Opera)
		self.set_policy("First Night")
		due = self.arrival(check_in=YESTERDAY, check_out=d(1))
		later = self.arrival(check_in=TODAY, check_out=d(2))
		out = folio_mod.run_night_audit(PROP_A)
		self.assertEqual(out["no_shows_flagged"], 1)
		self.assertEqual(frappe.db.get_value("Reservation", due.name, "status"),
		                 "No Show")
		self.assertEqual(frappe.db.get_value("Reservation", later.name,
		                                     "status"), "Confirmed")
		fee = [c for c in charges(due.name) if c.description.startswith("No-show")]
		self.assertEqual(str(fee[0].posting_date), YESTERDAY)

	# waitlist ------------------------------------------------------------

	def test_waitlist_purged_two_days_after_departure_but_not_one(self):
		two = make_reservation(PROP_A, self.rt, d(-6), d(-3), status="Waitlist")
		one = make_reservation(PROP_A, self.rt, d(-6), d(-2), status="Waitlist")
		future = make_reservation(PROP_A, self.rt, d(1), d(3), status="Waitlist")
		folio_mod.run_night_audit(PROP_A)  # closes d(-1): cut-off is d(-3)
		self.assertFalse(frappe.db.exists("Reservation", two.name))
		self.assertTrue(frappe.db.exists("Reservation", one.name))
		self.assertTrue(frappe.db.exists("Reservation", future.name))
		log = frappe.db.get_value("Night Audit Run",
		                          f"AUDIT-{YESTERDAY}-{PROP_A}", "log")
		self.assertIn("purged 1 stale waitlist entries", log)

	def test_waitlist_of_another_property_is_left_alone(self):
		other = make_reservation(PROP_B, self.rt_b, d(-9), d(-5),
		                         status="Waitlist")
		folio_mod.run_night_audit(PROP_A)
		self.assertTrue(frappe.db.exists("Reservation", other.name))

	# properties ----------------------------------------------------------

	def test_two_properties_are_audited_independently(self):
		a = self.in_house()
		b = self.in_house(prop=PROP_B, room=self.room_b, room_type=self.rt_b)
		b_noshow = make_reservation(PROP_B, self.rt_b, d(-3), d(1),
		                            status="Confirmed")
		out_a = folio_mod.run_night_audit(PROP_A)
		self.assertEqual(out_a["audit"], f"AUDIT-{YESTERDAY}-{PROP_A}")
		# A's run touched nothing of B's
		self.assertFalse(self.room_nights(b))
		self.assertEqual(self.bd(PROP_B), YESTERDAY)
		self.assertEqual(frappe.db.get_value("Reservation", b_noshow.name,
		                                     "status"), "Confirmed")
		# and B's own audit of the same date is not mistaken for A's
		out_b = folio_mod.run_night_audit(PROP_B)
		self.assertFalse(out_b.get("already_ran"))
		self.assertEqual(out_b["audit"], f"AUDIT-{YESTERDAY}-{PROP_B}")
		self.assertEqual(out_b["room_charges_posted"], 1)
		self.assertEqual(out_b["no_shows_flagged"], 1)
		self.assertAlmostEqual(float(self.room_nights(b)[0].amount), 4000,
		                       places=2)
		self.assertEqual(len(self.room_nights(a)), 1)

	# the record ----------------------------------------------------------

	def test_night_audit_run_record_counts(self):
		self.set_policy("First Night")
		self.in_house(room=self.rooms[0])
		missing = self.in_house(room=self.deluxe_room, room_type=self.rt_deluxe)
		frappe.delete_doc("Folio", guest_folio(missing.name), force=True,
		                  ignore_permissions=True)
		self.arrival()
		out = folio_mod.run_night_audit(PROP_A)
		run = frappe.get_doc("Night Audit Run", out["audit"])
		self.assertEqual(run.property, PROP_A)
		self.assertEqual(str(run.business_date), YESTERDAY)
		self.assertEqual(run.status, "Completed")
		self.assertEqual(run.room_charges_posted, 2)
		self.assertEqual(run.folios_opened, 1)
		self.assertEqual(run.no_shows_flagged, 1)
		# 1000 + 2500 room nights, 1000 first-night no-show fee
		self.assertAlmostEqual(float(run.amount_posted), 4500, places=2)
		self.assertAlmostEqual(out["amount_posted"], 4500, places=2)
		self.assertIn("flagged no-show", run.log)
		self.assertIn("opened folio", run.log)

	def test_empty_day_writes_a_nothing_to_do_record(self):
		out = folio_mod.run_night_audit(PROP_A)
		run = frappe.get_doc("Night Audit Run", out["audit"])
		self.assertEqual((run.room_charges_posted, run.folios_opened,
		                  run.no_shows_flagged), (0, 0, 0))
		self.assertEqual(float(run.amount_posted), 0)
		self.assertEqual(run.log, "Nothing to do.")

	def test_audit_is_logged_to_the_action_log(self):
		out = folio_mod.run_night_audit(PROP_A)
		self.assertTrue(frappe.db.exists("Agent Action Log", {
			"action_type": "night_audit", "reference_name": out["audit"]}))

	# context -------------------------------------------------------------

	def test_runs_without_frappe_local_lang(self):
		self.in_house()
		frappe.local.lang = None
		out = folio_mod.run_night_audit(PROP_A)
		self.assertEqual(out["room_charges_posted"], 1)
		self.assertEqual(frappe.local.lang, "en")

	def test_runs_when_lang_attribute_is_absent(self):
		if hasattr(frappe.local, "lang"):
			del frappe.local.lang
		out = folio_mod.run_night_audit(PROP_A)
		self.assertIn("audit", out)


class BusinessDateTestCase(AuditTestCase):
	def setUp(self):
		super().setUp()
		self.at(TODAY)
		make_property(PROP_A)

	def test_blank_business_date_falls_back_to_today(self):
		self.assertEqual(bdm.get_business_date(PROP_A), TODAY)
		self.assertEqual(bdm.get_business_date(""), TODAY)
		# reading does not seed
		self.assertIsNone(frappe.db.get_value("Property", PROP_A, "business_date"))

	def test_ensure_seeds_once(self):
		self.assertEqual(bdm.ensure_business_date(PROP_A), TODAY)
		frappe.db.set_value("Property", PROP_A, "business_date", d(-5))
		self.assertEqual(bdm.ensure_business_date(PROP_A), d(-5))

	def test_advance_rolls_one_day_from_the_given_date(self):
		self.assertEqual(bdm.advance_business_date(PROP_A, d(-5)), d(-4))
		self.assertEqual(bdm.get_business_date(PROP_A), d(-4))
		self.assertEqual(bdm.advance_business_date(PROP_A), d(-3))


class NightlySchedulerTestCase(AuditTestCase):
	"""kamra.folio.nightly_audit_all_properties - the 03:00 cron."""

	def setUp(self):
		super().setUp()
		self.at(TODAY)
		make_property(PROP_A, business_date=YESTERDAY)
		make_property(PROP_B, business_date=YESTERDAY)
		self.rt = make_room_type(PROP_A, "STD", base_price=1000)
		self.room = make_room(PROP_A, self.rt, "101")
		self.rt_b = make_room_type(PROP_B, "STD", base_price=4000)
		self.room_b = make_room(PROP_B, self.rt_b, "101")
		self.calls: list[str] = []
		self.fail_first_ut = False
		real = folio_mod.run_night_audit

		def only_ours(prop, business_date=None):
			# the cron walks every property on the site; audit only ours so
			# the test never posts into a developer's seeded hotels
			self.calls.append(prop)
			if prop not in (PROP_A, PROP_B):
				return {"skipped": True}
			if self.fail_first_ut:
				self.fail_first_ut = False
				raise RuntimeError("boom")
			return real(prop, business_date)

		self._stack.enter_context(
			patch.object(folio_mod, "run_night_audit", side_effect=only_ours))
		self.log_error = self._stack.enter_context(
			patch.object(frappe, "log_error"))

	def bd(self, prop):
		return str(frappe.db.get_value("Property", prop, "business_date"))

	def audits(self, prop):
		return frappe.get_all("Night Audit Run", filters={"property": prop},
		                      pluck="business_date")

	def test_runs_when_business_date_is_yesterday(self):
		res = make_reservation(PROP_A, self.rt, d(-2), d(2),
		                       status="Checked In", room=self.room)
		folio_mod.nightly_audit_all_properties()
		self.assertEqual([str(x) for x in self.audits(PROP_A)], [YESTERDAY])
		self.assertEqual(self.bd(PROP_A), TODAY)
		self.assertEqual(len(charges(res.name, "Room")), 1)
		self.log_error.assert_not_called()

	# the 03:00 cron only closes a day that has ended: with the business
	# date already TODAY (closed by hand before midnight, or a second
	# worker), it leaves the property alone (#197).
	def test_skips_when_business_date_is_today(self):
		res = make_reservation(PROP_A, self.rt, d(-2), d(2),
		                       status="Checked In", room=self.room)
		frappe.db.set_value("Property", PROP_A, "business_date", TODAY)
		folio_mod.nightly_audit_all_properties()
		self.assertNotIn(PROP_A, self.calls)  # skipped before the audit
		self.assertEqual(self.audits(PROP_A), [])
		self.assertEqual(self.bd(PROP_A), TODAY)
		self.assertFalse(charges(res.name, "Room"))
		# B, still on YESTERDAY, was closed as usual
		self.assertEqual(self.bd(PROP_B), TODAY)

	def test_does_not_close_a_business_date_ahead_of_today(self):
		frappe.db.set_value("Property", PROP_A, "business_date", d(1))
		folio_mod.nightly_audit_all_properties()
		self.assertEqual(self.audits(PROP_A), [])
		self.assertEqual(self.bd(PROP_A), d(1))
		# B is unaffected by A's refusal
		self.assertEqual(self.bd(PROP_B), TODAY)

	def test_skips_disabled_properties(self):
		frappe.db.set_value("Property", PROP_B, "disabled", 1)
		folio_mod.nightly_audit_all_properties()
		self.assertIn(PROP_A, self.calls)
		self.assertNotIn(PROP_B, self.calls)
		self.assertEqual(self.bd(PROP_B), YESTERDAY)
		self.assertEqual(self.bd(PROP_A), TODAY)

	def test_one_property_failing_does_not_stop_the_others(self):
		self.fail_first_ut = True
		folio_mod.nightly_audit_all_properties()
		ours = [p for p in self.calls if p in (PROP_A, PROP_B)]
		self.assertEqual(sorted(ours), [PROP_A, PROP_B])
		failed, survived = ours[0], ours[1]
		self.assertEqual(self.bd(failed), YESTERDAY)
		self.assertEqual(self.bd(survived), TODAY)
		titles = [c.kwargs.get("title") for c in self.log_error.call_args_list]
		self.assertIn(f"Night audit failed: {failed}", titles)
		self.assertNotIn(f"Night audit failed: {survived}", titles)

	def test_runs_without_frappe_local_lang(self):
		frappe.local.lang = None
		folio_mod.nightly_audit_all_properties()
		self.assertEqual(self.bd(PROP_A), TODAY)
		self.log_error.assert_not_called()


class NightAuditPermissionTestCase(AuditTestCase):
	"""kamra.api.run_night_audit: who may close the day."""

	ALLOWED: ClassVar[dict] = {
		"ut.audit.desk@test.local": ["Front Desk"],
		"ut.audit.finance@test.local": ["Finance"],
		"ut.audit.agent@test.local": ["Kamra Agent"],
		"ut.audit.admin@test.local": ["Hotel Admin"],
	}
	REFUSED: ClassVar[dict] = {
		"ut.audit.hk@test.local": ["Housekeeping"],
		"ut.audit.revenue@test.local": ["Revenue Manager"],
		"ut.audit.nobody@test.local": [],
	}

	def setUp(self):
		super().setUp()
		make_property(PROP_A, business_date=YESTERDAY)
		for email, roles in {**self.ALLOWED, **self.REFUSED}.items():
			ensure_user(email, roles)
		self.stub = self._stack.enter_context(patch.object(
			folio_mod, "run_night_audit", return_value={"audit": "stub"}))

	def test_front_office_and_finance_roles_may_run_it(self):
		from kamra import api
		for email in self.ALLOWED:
			frappe.set_user(email)  # nosemgrep: frappe-setuser -- acting as the persona
			self.assertEqual(api.run_night_audit(PROP_A), {"audit": "stub"},
			                 email)
		frappe.set_user("Administrator")  # nosemgrep: frappe-setuser -- restore
		self.assertEqual(self.stub.call_count, len(self.ALLOWED))
		self.stub.assert_called_with(PROP_A, None)

	def test_other_roles_are_refused(self):
		from kamra import api
		for email in self.REFUSED:
			frappe.set_user(email)  # nosemgrep: frappe-setuser -- acting as the persona
			with self.assertRaises(frappe.PermissionError, msg=email):
				api.run_night_audit(PROP_A)
		frappe.set_user("Administrator")  # nosemgrep: frappe-setuser -- restore
		self.stub.assert_not_called()

	def test_gate_is_introspectable(self):
		from kamra import api
		self.assertTrue({"Front Desk", "Finance", "Kamra Agent"}
		                <= set(api.run_night_audit._kamra_roles))
		self.assertNotIn("Housekeeping", api.run_night_audit._kamra_roles)
