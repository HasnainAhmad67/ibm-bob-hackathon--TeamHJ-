"""Order processing module for the sample e-commerce service."""


def order_total(base: float, discount_pct: float = 0.0) -> float:
    """Return the final order total after applying a percentage discount.

    Args:
        base: The pre-discount subtotal.
        discount_pct: Discount as a percentage (e.g. 10 means 10 %).

    Returns:
        The discounted total.

    Note:
        Commit 7997883 introduced a regression: the discount is *added*
        instead of *subtracted*.  The fix is to change ``base + discount``
        to ``base - discount`` on the return line below.
    """
    discount = base * (discount_pct / 100)
    # Regression: discount is added instead of subtracted.
    return base + discount
