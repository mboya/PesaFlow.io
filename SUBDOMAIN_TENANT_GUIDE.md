# Subdomain-Based Tenant Identification Guide

## Overview

The application supports **subdomain-based tenant identification** as one of several methods to identify which tenant a request belongs to. Currently, it's implemented but marked as "for future use" - meaning the code is ready but may need additional configuration to work fully.

## How Subdomain Identification Works

### Current Implementation

The subdomain-based tenant identification is implemented in `TenantScoped#find_tenant` with **Priority 3** (after headers and before user-based identification):

```ruby
# Priority 3: Subdomain-based identification (for future use)
if request.subdomain.present? && request.subdomain != 'www' && request.subdomain != 'api'
  return ActsAsTenant.without_tenant do
    Tenant.active.find_by(subdomain: request.subdomain.downcase.strip)
  end
end
```

### How It Works

1. **Request Processing**: When a request comes in, Rails extracts the subdomain from the URL
2. **Subdomain Extraction**: `request.subdomain` contains the subdomain part (e.g., `acme` from `acme.example.com`)
3. **Tenant Lookup**: The system looks up a tenant with a matching `subdomain` field
4. **Tenant Scoping**: If found, that tenant is set as the current tenant for the request

### Example URLs

- `https://acme.pesaflow.io/api/v1/dashboard` → Looks for tenant with `subdomain: 'acme'`
- `https://company1.pesaflow.io/api/v1/subscriptions` → Looks for tenant with `subdomain: 'company1'`
- `https://www.pesaflow.io/api/v1/dashboard` → Skips subdomain (uses 'www')
- `https://api.pesaflow.io/api/v1/dashboard` → Skips subdomain (uses 'api')

## Tenant Identification Priority Order

The system tries to identify tenants in this order:

1. **Priority 1**: `X-Tenant-Subdomain` header (currently primary method)
2. **Priority 2**: `X-Tenant-ID` header
3. **Priority 3**: **Subdomain from URL** (this is what you're asking about)
4. **Priority 4**: Authenticated user's tenant
5. **Priority 5**: Webhook payload inference

## Current Status

### ✅ What's Working

- Code is implemented and ready
- Subdomain validation in Tenant model (lowercase, alphanumeric + hyphens)
- Subdomain normalization (auto-lowercase and strip)
- Database index on subdomain for fast lookups

### ⚠️ What May Need Configuration

1. **Rails Subdomain Extraction**: Rails needs to be configured to extract subdomains correctly
   - This depends on your domain structure and TLD length
   - May need `config.action_dispatch.tld_length` configuration

2. **DNS Configuration**: For production, you'd need:
   - Wildcard DNS: `*.pesaflow.io` → your server
   - Or individual subdomain records

3. **Development Setup**: For local development:
   - Use `lvh.me` or similar service (e.g., `acme.lvh.me:3000`)
   - Or configure `/etc/hosts` entries

## Tenant Model

Each tenant has:
- `subdomain`: Unique identifier (e.g., "acme", "company1")
- `name`: Display name (e.g., "Acme Corporation")
- `domain`: Optional custom domain (e.g., "acme.com")
- `status`: active, suspended, or cancelled

### Subdomain Rules

- Must be unique across all tenants
- Format: lowercase letters, numbers, and hyphens only
- Automatically normalized (lowercased and trimmed)
- Examples: `acme`, `company-1`, `tenant123`

## Enabling Subdomain Support

### For Development

1. **Use lvh.me** (recommended):
   ```bash
   # Access via: http://acme.lvh.me:3001/api/v1/dashboard
   # Rails will extract "acme" as the subdomain
   ```

2. **Configure /etc/hosts**:
   ```bash
   127.0.0.1 acme.localhost
   127.0.0.1 company1.localhost
   ```
   Then access: `http://acme.localhost:3001/api/v1/dashboard`

### For Production

1. **Set TLD Length** (if needed):
   ```ruby
   # config/environments/production.rb
   config.action_dispatch.tld_length = 1  # For .io domains
   # Or 2 for .co.uk domains
   ```

2. **DNS Configuration**:
   - Set up wildcard DNS: `*.yourdomain.com` → your server IP
   - Or create individual A/CNAME records for each tenant

3. **Nginx/Reverse Proxy** (if using):
   - Ensure subdomain is passed through correctly
   - May need to configure `Host` header forwarding

## Testing Subdomain Identification

### Create a Test Tenant

```ruby
# Rails console
ActsAsTenant.without_tenant do
  Tenant.create!(
    name: "Acme Corp",
    subdomain: "acme",
    status: "active"
  )
end
```

### Test via Header (Current Method)

```bash
curl -H "X-Tenant-Subdomain: acme" \
  http://localhost:3000/api/v1/dashboard
```

### Test via Subdomain (Future Method)

```bash
# Using lvh.me
curl http://acme.lvh.me:3000/api/v1/dashboard

# Or with /etc/hosts
curl http://acme.localhost:3000/api/v1/dashboard
```

## Why Header-Based is Currently Primary

Header-based identification (`X-Tenant-Subdomain`) is currently the primary method because:

1. **Works everywhere**: No DNS or domain configuration needed
2. **Development friendly**: Works with `localhost` and any domain
3. **Flexible**: Can be used with any URL structure
4. **API-first**: Perfect for API clients and mobile apps

Subdomain-based identification is great for:
- Web applications with custom domains per tenant
- White-label solutions
- Better SEO and branding
- User-friendly URLs

## Migration Path

To fully enable subdomain support:

1. ✅ Code is already implemented
2. ⚠️ Configure Rails subdomain extraction (if needed)
3. ⚠️ Set up DNS (for production)
4. ⚠️ Test with real subdomains
5. ⚠️ Update documentation for users

The system will automatically use subdomain identification when available, falling back to headers if not.

