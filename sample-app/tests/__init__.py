"""Tests for the order processing module."""
import sys
import os

# Make sure the sample-app root is on the path when running from that dir.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from app.orders import order_total


def test_no_discount():
    """A zero-discount order total equals the base price."""
    assert order_total(100.0, 0) == 100.0


def test_ten_percent_discount():
    """A 10 % discount on $110 should return $99.0, not $121.0."""
    result = order_total(110.0, 10)
    assert result == pytest.approx(99.0), (
        f"Expected 99.0 but got {result}. "
        "Likely cause: discount is being added instead of subtracted."
    )


def test_full_discount():
    """A 100 % discount yields zero."""
    assert order_total(50.0, 100) == pytest.approx(0.0)


def test_partial_discount():
    """A 25 % discount on $200 should return $150."""
    assert order_total(200.0, 25) == pytest.approx(150.0)
