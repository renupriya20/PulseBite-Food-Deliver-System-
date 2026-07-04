export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:9000";

export const AUTH_ROUTES = {
  REGISTER: `${BACKEND_URL}/api/v1/auth/register`,
  LOGIN: `${BACKEND_URL}/api/v1/auth/login`,
  SEND_OTP: `${BACKEND_URL}/api/v1/auth/send-otp`,
  VERIFY_OTP: `${BACKEND_URL}/api/v1/auth/verify-otp`,
  RESET_PASSWORD: `${BACKEND_URL}/api/v1/auth/reset-password`,
  LOGOUT: `${BACKEND_URL}/api/v1/auth/logout`,
  LOGIN_WITH_SSO: `${BACKEND_URL}/api/v1/auth/login-with-sso`,
};

export const USER_ROUTES = {
  CURRENT_USER: `${BACKEND_URL}/api/v1/user/current-user`,
  TOGGLE_ONLINE: `${BACKEND_URL}/api/v1/user/toggle-online`,
  UPDATE_LOCATION: `${BACKEND_URL}/api/v1/user/update-location`,
};

export const SHOP_ROUTES = {
  GET_MY_SHOP: `${BACKEND_URL}/api/v1/shop/get-my-shop`,
  CREATE_SHOP: `${BACKEND_URL}/api/v1/shop/create`,
  EDIT_SHOP: (id) => `${BACKEND_URL}/api/v1/shop/edit/${id}`,
  GET_SHOP_BY_ID: (id) => `${BACKEND_URL}/api/v1/shop/get-shop/${id}`,
  GET_ALL_SHOPS: `${BACKEND_URL}/api/v1/shop/get-all-shops`,
  GET_SHOP_BY_CITY: (city) =>
    `${BACKEND_URL}/api/v1/shop/get-shop-by-city/${city}`,
};

export const ITEM_ROUTES = {
  ADD_ITEM: `${BACKEND_URL}/api/v1/item/add`,
  EDIT_ITEM: (id) => `${BACKEND_URL}/api/v1/item/edit/${id}`,
  GET_ITEM_BY_ID: (id) => `${BACKEND_URL}/api/v1/item/${id}`,
  GET_ITEMS_BY_CITY: (city) => `${BACKEND_URL}/api/v1/item/get-by-city/${city}`,
  DELETE_ITEM: (id) => `${BACKEND_URL}/api/v1/item/${id}`,
};

export const ORDER_ROUTES = {
  PLACE_ORDER: `${BACKEND_URL}/api/v1/order/place`,
  VERIFY_PAYMENT: `${BACKEND_URL}/api/v1/order/verify-payment`,
  GET_ORDERS: `${BACKEND_URL}/api/v1/order/orders`,
  UPDATE_STATUS: (orderId, shopId) =>
    `${BACKEND_URL}/api/v1/order/update-status/${orderId}/${shopId}`,
  ACCEPT_ORDER: (orderId, shopId) =>
    `${BACKEND_URL}/api/v1/order/accept/${orderId}/${shopId}`,
  START_DELIVERY: (orderId, shopId) =>
    `${BACKEND_URL}/api/v1/order/start-delivery/${orderId}/${shopId}`,
  COMPLETE_DELIVERY: (orderId, shopId) =>
    `${BACKEND_URL}/api/v1/order/complete-delivery/${orderId}/${shopId}`,
  ASSIGN_DELIVERY_BOY: (orderId, shopId, deliveryBoyId) =>
    `${BACKEND_URL}/api/v1/order/assign/${orderId}/${shopId}/${deliveryBoyId}`,
  ONLINE_DELIVERY_BOYS: `${BACKEND_URL}/api/v1/order/online-delivery-boys`,
  RESEND_OTP: (orderId, shopId) =>
    `${BACKEND_URL}/api/v1/order/resend-otp/${orderId}/${shopId}`,
};

export const DELIVERY_ROUTES = {
  ONBOARDING_DETAILS: `${BACKEND_URL}/api/delivery/onboarding-details`,
  TOGGLE_STATUS: `${BACKEND_URL}/api/delivery/status`,
  SOS_ALERT: `${BACKEND_URL}/api/delivery/sos-alert`,
  ECO_DASHBOARD: `${BACKEND_URL}/api/delivery/eco-dashboard`,

  ACCEPT_ORDER: (orderId) => `${BACKEND_URL}/api/delivery/order/${orderId}/accept`,
  VERIFY_COMPLETE: (orderId) => `${BACKEND_URL}/api/delivery/order/${orderId}/verify-complete`,
};

