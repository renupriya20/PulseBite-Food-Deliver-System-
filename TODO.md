# TODO - Delivery Boy live location popup on Home

## Step 1
- Verify Home page file and current UI for `user` role. (Home currently renders UserDashboard / OwnerDashboard / DeliveryBoy)


## Step 2
- Implement Home-level popup (toast-like) for `user` role:
  - Show only when a delivery boy has accepted/picked the order (target: `shopOrder.status === "out of delivery"`).
  - Display live location (lat,lng) OR map link.
  - Display ETA/timing as “~X minute left” using distance approximation between:
    - deliveryBoy current location (assignedDeliveryBoy.location.coordinates)
    - customer deliveryAddress (lat,lng)
  - ✅ Added `frontend/src/components/LiveDeliveryPopup.jsx` and mounted it on Home page.


## Step 3
- Add polling to refresh orders + ETA every 8-10 seconds.

## Step 4
- Update UI to match “pop ki trh” styling (fixed card / bottom sheet / toast).

## Step 5
- Test:
  - deliveryBoy updates location
  - MyOrders / Home popup updates


