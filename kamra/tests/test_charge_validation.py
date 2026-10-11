# Copyright (c) 2026, HeyKoala and contributors
# For license information, please see license.txt

"""Posted charges: positive amount, tax rate from the country pack."""

import unittest
from unittest.mock import patch

import frappe

from kamra.api import _check_charge_amount_and_tax


class _Pack:
	@staticmethod
	def tax_rate_options(property):
		return [0, 5, 12, 18, 28]


def _check(amount, gst):
	with patch("kamra.localization.pack_for", return_value=_Pack):
		return _check_charge_amount_and_tax("P", amount, gst)


class TestChargeValidation(unittest.TestCase):
	def test_normal_charge_passes(self):
		_check(100, 5)
		_check("250.50", 0)
		_check(100, None)

	def test_zero_and_minus_amount_rejected(self):
		for amount in (0, -50, "-1"):
			with self.assertRaisesRegex(frappe.ValidationError, "more than zero"):
				_check(amount, 5)

	def test_not_a_number_rejected(self):
		for amount in (None, "abc"):
			with self.assertRaisesRegex(frappe.ValidationError, "must be a number"):
				_check(amount, 5)

	def test_unknown_tax_rate_rejected(self):
		with self.assertRaisesRegex(frappe.ValidationError, "99% is not allowed"):
			_check(100, 99)
		with self.assertRaisesRegex(frappe.ValidationError, "7% is not allowed"):
			_check(100, 7)
