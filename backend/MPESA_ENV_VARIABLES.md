# M-Pesa STK Gem Environment Variables

## Quick Reference - All Variables

```bash
# API URLs (REQUIRED - these are missing and cause 404 errors!)
base_url=https://sandbox.safaricom.co.ke  # or https://api.safaricom.co.ke for production
token_generator_url=/oauth/v1/generate?grant_type=client_credentials
process_request_url=/mpesa/stkpush/v1/processrequest
ratiba_url=/v1/billmanager-invoice/change-optin-details  # For Standing Orders

# Core Authentication
key=YOUR_CONSUMER_KEY
secret=YOUR_CONSUMER_SECRET

# STK Push / Ratiba
business_short_code=174379
business_passkey=YOUR_PASSKEY
callback_url=https://your-domain.com/webhooks/stk_push/callback
till_number=174379

# B2C / Reversal
initiator_name=testapi
security_credential=YOUR_ENCRYPTED_CREDENTIAL
result_url=https://your-domain.com/webhooks/b2c/result
queue_timeout_url=https://your-domain.com/webhooks/b2c/timeout

# C2B
confirmation_url=https://your-domain.com/webhooks/c2b/confirmation
validation_url=https://your-domain.com/webhooks/c2b/validation

# App Host (for generating callback URLs)
APP_HOST=your-domain.com
```

## Detailed List by Category

### ⚠️ API Base URLs (REQUIRED)

These are **critical** and cause "Failed to get access token: 404" if missing:

| Variable | Description | Sandbox Value | Production Value |
|----------|-------------|---------------|------------------|
| `base_url` | M-Pesa API base URL | `https://sandbox.safaricom.co.ke` | `https://api.safaricom.co.ke` |
| `token_generator_url` | OAuth token endpoint | `/oauth/v1/generate?grant_type=client_credentials` | Same |
| `process_request_url` | STK Push endpoint | `/mpesa/stkpush/v1/processrequest` | Same |
| `ratiba_url` | Ratiba (Standing Orders) endpoint | `/v1/billmanager-invoice/change-optin-details` | Same |

### Core Authentication (Required)

| Variable | Description |
|----------|-------------|
| `key` | Consumer Key from Safaricom Developer Portal |
| `secret` | Consumer Secret from Safaricom Developer Portal |

### STK Push (Lipa Na M-Pesa Online)

| Variable | Description | Required |
|----------|-------------|----------|
| `business_short_code` | PayBill or Till number | ✅ Yes |
| `business_passkey` | Passkey from Safaricom | ✅ Yes |
| `callback_url` | URL to receive STK Push results | ✅ Yes |
| `till_number` | Till number (for Buy Goods only) | Only for Buy Goods |

### Ratiba (Standing Orders)

Uses the same variables as STK Push:
- `business_short_code`
- `callback_url`

### B2C / B2B / Transaction Status / Account Balance / Reversal

| Variable | Description |
|----------|-------------|
| `initiator_name` or `initiator` | API initiator username |
| `security_credential` | Encrypted password (Base64) |
| `result_url` | URL to receive results |
| `queue_timeout_url` | URL for timeout notifications |

### C2B (Customer to Business)

| Variable | Description | Required |
|----------|-------------|----------|
| `business_short_code` | PayBill or Till number | ✅ Yes |
| `confirmation_url` | Confirmation webhook URL | ✅ Yes |
| `validation_url` | Validation webhook URL | Optional |

### IoT APIs (Optional)

| Variable | Description |
|----------|-------------|
| `iot_api_key` | IoT API key |
| `vpn_group` | VPN group identifier |
| `username` | IoT username |

## Sandbox Test Credentials

For development/testing, use these Safaricom sandbox values:

```bash
# Sandbox URLs
base_url=https://sandbox.safaricom.co.ke
token_generator_url=/oauth/v1/generate?grant_type=client_credentials
process_request_url=/mpesa/stkpush/v1/processrequest
ratiba_url=/v1/billmanager-invoice/change-optin-details

# Sandbox test credentials (get your own from developer.safaricom.co.ke)
key=YOUR_SANDBOX_CONSUMER_KEY
secret=YOUR_SANDBOX_CONSUMER_SECRET
business_short_code=174379
business_passkey=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
callback_url=https://your-ngrok-url.ngrok.io/webhooks/stk_push/callback
till_number=174379
```

## Getting Test Credentials

1. Go to [developer.safaricom.co.ke](https://developer.safaricom.co.ke)
2. Create an account / Log in
3. Create a new app
4. Get your Consumer Key and Consumer Secret
5. For STK Push, use the sandbox passkey provided in the portal

## Exposing Local Callbacks

For development, use ngrok to expose your local server:

```bash
ngrok http 3000
```

Then use the ngrok URL for your callback URLs.
