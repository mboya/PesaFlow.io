# Rails API Authentication with Devise, JWT, and OTP (2FA)

This document describes the authentication API implementation using Devise, JWT tokens, and Time-based One-Time Password (TOTP) for two-factor authentication.

## Table of Contents

- [Setup](#setup)
- [API Endpoints](#api-endpoints)
- [Authentication Flow](#authentication-flow)
- [Request/Response Examples](#requestresponse-examples)
- [Testing](#testing)
- [Environment Variables](#environment-variables)
- [Security Considerations](#security-considerations)

## Setup

### Prerequisites

- Ruby 3.3+
- Rails 7.2+
- PostgreSQL
- Redis (for JWT denylist)

### Installation

1. Install dependencies:
```bash
bundle install
```

2. Setup database:
```bash
rails db:create db:migrate
```

3. Configure JWT secret key:
```bash
# Generate a secret key
rails secret

# Add to credentials or environment variables
# In config/credentials.yml.enc or .env:
# DEVISE_JWT_SECRET_KEY: <generated_secret>
```

4. Run tests:
```bash
bundle exec rspec
```

## API Endpoints

### Authentication Endpoints

#### POST /api/v1/signup
Register a new user.

**Request:**
```json
{
  "user": {
    "email": "user@example.com",
    "password": "password123"
  }
}
```

**Response (200 OK):**
```json
{
  "status": {
    "code": 200,
    "message": "Signed up successfully."
  },
  "data": {
    "id": 1,
    "email": "user@example.com",
    "created_at": "2024-01-01T00:00:00.000Z",
    "otp_enabled": false
  }
}
```
**Headers:** `Authorization: Bearer <JWT_TOKEN>`

---

#### POST /api/v1/login
Login user. Returns JWT token if OTP is not enabled, or requires OTP verification if enabled.

**Request:**
```json
{
  "user": {
    "email": "user@example.com",
    "password": "password123"
  }
}
```

**Response (200 OK) - No OTP:**
```json
{
  "status": {
    "code": 200,
    "message": "Logged in successfully"
  },
  "data": {
    "id": 1,
    "email": "user@example.com",
    "otp_enabled": false
  }
}
```
**Headers:** `Authorization: Bearer <JWT_TOKEN>`

**Response (200 OK) - OTP Required:**
```json
{
  "status": {
    "code": 200,
    "message": "OTP verification required"
  },
  "otp_required": true,
  "user_id": 1
}
```

---

#### DELETE /api/v1/logout
Logout user and revoke JWT token.

**Headers:** `Authorization: Bearer <JWT_TOKEN>`

**Response (200 OK):**
```json
{
  "status": {
    "code": 200,
    "message": "Logged out successfully"
  }
}
```

---

#### GET /api/v1/current_user
Get current authenticated user information.

**Headers:** `Authorization: Bearer <JWT_TOKEN>`

**Response (200 OK):**
```json
{
  "status": {
    "code": 200,
    "message": "User retrieved successfully"
  },
  "data": {
    "id": 1,
    "email": "user@example.com",
    "created_at": "2024-01-01T00:00:00.000Z",
    "otp_enabled": true
  }
}
```

---

### OTP (Two-Factor Authentication) Endpoints

#### POST /api/v1/otp/enable
Generate OTP secret and QR code for setting up 2FA.

**Headers:** `Authorization: Bearer <JWT_TOKEN>`

**Response (200 OK):**
```json
{
  "status": {
    "code": 200,
    "message": "OTP secret generated"
  },
  "data": {
    "secret": "BASE32ENCODEDSECRET",
    "qr_code": "data:image/png;base64,iVBORw0KG...",
    "provisioning_uri": "otpauth://totp/PesaFlow:user@example.com?secret=BASE32ENCODEDSECRET&issuer=PesaFlow"
  }
}
```

---

#### POST /api/v1/otp/verify
Verify OTP code and enable 2FA. Returns backup codes.

**Headers:** `Authorization: Bearer <JWT_TOKEN>`

**Request:**
```json
{
  "otp_code": "123456"
}
```

**Response (200 OK):**
```json
{
  "status": {
    "code": 200,
    "message": "2FA enabled successfully"
  },
  "backup_codes": [
    "ABC12345",
    "XYZ98765",
    ...
  ]
}
```

---

#### POST /api/v1/otp/disable
Disable 2FA. Requires password and current OTP code.

**Headers:** `Authorization: Bearer <JWT_TOKEN>`

**Request:**
```json
{
  "password": "password123",
  "otp_code": "123456"
}
```

**Response (200 OK):**
```json
{
  "status": {
    "code": 200,
    "message": "2FA disabled successfully"
  }
}
```

---

#### POST /api/v1/otp/verify_login
Verify OTP during login to complete authentication and receive JWT token.

**Request:**
```json
{
  "user_id": 1,
  "otp_code": "123456"
}
```

**Response (200 OK):**
```json
{
  "status": {
    "code": 200,
    "message": "Logged in successfully"
  },
  "data": {
    "id": 1,
    "email": "user@example.com",
    "otp_enabled": true
  }
}
```
**Headers:** `Authorization: Bearer <JWT_TOKEN>`

**Note:** Backup codes can also be used instead of OTP code.

---

#### POST /api/v1/otp/backup_codes
Generate new backup codes. Requires password.

**Headers:** `Authorization: Bearer <JWT_TOKEN>`

**Request:**
```json
{
  "password": "password123"
}
```

**Response (200 OK):**
```json
{
  "status": {
    "code": 200,
    "message": "Backup codes generated successfully"
  },
  "backup_codes": [
    "NEW12345",
    "NEW98765",
    ...
  ]
}
```

---

#### GET /api/v1/otp/qr_code
Get QR code for authenticator app setup.

**Headers:** `Authorization: Bearer <JWT_TOKEN>`

**Response (200 OK):**
```json
{
  "status": {
    "code": 200,
    "message": "QR code retrieved successfully"
  },
  "qr_code": "data:image/png;base64,iVBORw0KG...",
  "provisioning_uri": "otpauth://totp/PesaFlow:user@example.com?secret=..."
}
```

---

### Protected Endpoint Example

#### GET /api/v1/protected
Example protected endpoint requiring authentication.

**Headers:** `Authorization: Bearer <JWT_TOKEN>`

**Response (200 OK):**
```json
{
  "status": {
    "code": 200,
    "message": "Access granted"
  },
  "data": {
    "message": "This is a protected endpoint",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "otp_enabled": true
    }
  }
}
```

---

## Authentication Flow

### Standard Login (No OTP)

1. User sends POST `/api/v1/login` with email and password
2. Server validates credentials
3. Server returns JWT token in `Authorization` header
4. Client stores token and includes it in subsequent requests

### Login with OTP Enabled

1. User sends POST `/api/v1/login` with email and password
2. Server validates credentials
3. Server detects OTP is enabled, returns `otp_required: true` and `user_id`
4. User enters OTP code from authenticator app
5. User sends POST `/api/v1/otp/verify_login` with `user_id` and `otp_code`
6. Server validates OTP code
7. Server returns JWT token in `Authorization` header

### Enabling 2FA

1. Authenticated user sends POST `/api/v1/otp/enable`
2. Server generates OTP secret and returns QR code
3. User scans QR code with authenticator app (Google Authenticator, Authy, etc.)
4. User enters current OTP code from app
5. User sends POST `/api/v1/otp/verify` with OTP code
6. Server validates OTP and enables 2FA
7. Server returns 10 backup codes (user should save these)

### Using Backup Codes

Backup codes can be used instead of OTP codes during login:
- Send POST `/api/v1/otp/verify_login` with backup code instead of OTP code
- Used backup codes are automatically removed
- Each backup code can only be used once

---

## Request/Response Examples

### cURL Examples

#### Sign Up
```bash
curl -X POST http://localhost:3000/api/v1/signup \
  -H "Content-Type: application/json" \
  -d '{"user":{"email":"test@example.com","password":"password123"}}' \
  -i
```

#### Login (No OTP)
```bash
curl -X POST http://localhost:3000/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{"user":{"email":"test@example.com","password":"password123"}}' \
  -i
```

#### Enable OTP
```bash
curl -X POST http://localhost:3000/api/v1/otp/enable \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

#### Verify OTP
```bash
curl -X POST http://localhost:3000/api/v1/otp/verify \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"otp_code":"123456"}'
```

#### Login with OTP (Two-Step)
```bash
# Step 1: Login with password
curl -X POST http://localhost:3000/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{"user":{"email":"test@example.com","password":"password123"}}'

# Step 2: Verify OTP
curl -X POST http://localhost:3000/api/v1/otp/verify_login \
  -H "Content-Type: application/json" \
  -d '{"user_id":1,"otp_code":"123456"}' \
  -i
```

#### Access Protected Endpoint
```bash
curl -X GET http://localhost:3000/api/v1/protected \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Logout
```bash
curl -X DELETE http://localhost:3000/api/v1/logout \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Testing

### Running Tests

```bash
# Run all tests
bundle exec rspec

# Run specific test file
bundle exec rspec spec/models/user_spec.rb

# Run with coverage
COVERAGE=true bundle exec rspec
```

### Test Coverage

The test suite includes:
- Model specs (User, JwtDenylist)
- Request specs for all endpoints
- Integration tests for full authentication flows
- OTP flow tests
- Backup code flow tests

---

## Environment Variables

Required environment variables:

```bash
# JWT Secret Key (or use Rails credentials)
DEVISE_JWT_SECRET_KEY=your_secret_key_here

# Database
DATABASE_URL=postgresql://user:password@localhost/dbname

# Redis (for JWT denylist)
REDIS_URL=redis://localhost:6379/0
```

---

## Security Considerations

### JWT Tokens
- Tokens expire after 30 minutes (configurable)
- Revoked tokens are stored in JWT denylist
- Tokens cannot be reused after logout

### OTP (TOTP)
- 6-digit codes, 30-second validity window
- Drift tolerance: ±1 time step (90 seconds total)
- Compatible with Google Authenticator, Authy, 1Password, etc.
- OTP secrets should be encrypted at rest (currently stored as plain text - add encryption for production)

### Backup Codes
- 10 single-use codes generated on OTP setup
- Each code is 8 characters (alphanumeric)
- Codes are removed after use
- Cannot be reused

### Best Practices
- Use HTTPS in production
- Rate limit OTP verification attempts
- Consider account lockout after repeated failures
- Encrypt OTP secrets in database
- Store backup codes securely (hashed/encrypted)
- Require password re-authentication for sensitive operations
- Log authentication attempts for security monitoring

---

## Additional Notes

### OTP Secret Encryption

Currently, OTP secrets are stored as plain text. For production, consider:
- Using Rails encrypted attributes (`encrypts :otp_secret_key`)
- Using `attr_encrypted` gem
- Using application-level encryption

### Rate Limiting

Consider implementing rate limiting for:
- Login attempts
- OTP verification attempts
- Signup requests

### Account Lockout

Consider implementing account lockout after:
- Multiple failed login attempts
- Multiple failed OTP verification attempts

---

## Support

For issues or questions, please refer to:
- [Devise Documentation](https://github.com/heartcombo/devise)
- [devise-jwt Documentation](https://github.com/waiting-for-dev/devise-jwt)
- [ROTP Documentation](https://github.com/mdp/rotp)

