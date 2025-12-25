# Ecommerce

# backend

## Google OAuth

Set these environment variables before using the OAuth redirect flow:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (e.g. `http://localhost:4000/auth/google/callback`)
- `FRONTEND_URL` (e.g. `http://localhost:5173`)

## Payments (Razorpay)

- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are required for checkout order creation.
- `RAZORPAY_WEBHOOK_SECRET` validates Razorpay webhooks (`POST /payments/razorpay/webhook`).
- Client checkout uses `POST /payments/razorpay/order` (auth required) with cart + address to create a pending order and a Razorpay order. Configure your Razorpay webhook to point to `/payments/razorpay/webhook` with the same secret so the API can mark orders as paid after capture.
- Webhook events: `payment.captured` / `payment.authorized` / `order.paid` mark orders as `PAID` (and decrement stock). `payment.failed` / `order.payment_failed` (or payment status `failed`) mark non-shipped orders as `CANCELLED`.
