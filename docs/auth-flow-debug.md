# Auth Flow Debug: Ghost Wallet Issue

The user authenticates via Privy (wallet `0x84D5...5D95`) but no `users` row exists in Supabase. All API calls return 401 because `getCurrentUserFromRequestCookie()` finds the wallet but no matching DB record.

## The Flow and Where It Breaks

```mermaid
sequenceDiagram
    participant U as User
    participant P as Privy SDK
    participant C as Client (React)
    participant S as Server API
    participant DB as Supabase

    Note over U,DB: 1. LOGIN
    U->>P: Click "Join Now" / "Create Account"
    P->>P: Login modal (email/wallet/farcaster)
    P->>C: authenticated = true
    P->>C: Sets privy-token cookie (JWT, ~60min expiry)
    C->>C: Redirect to /home

    Note over U,DB: 2. HOME PAGE LOAD (HomeWelcomeFlow)
    C->>S: GET /api/me (credentials: include)
    Note right of S: Reads privy-token cookie
    S->>S: getWalletFromPrivyToken(cookie)

    alt Cookie JWT is FRESH
        S->>S: verifyAuthToken() OK, wallet = 0x84d5...5d95
        S->>DB: SELECT * FROM users WHERE wallet = 0x84d5...5d95
        DB-->>S: [] (no rows - first login)
        S-->>C: { user: null }
    else Cookie JWT is EXPIRED/STALE
        S->>S: verifyAuthToken() FAILS
        S-->>C: { user: null }
        Note right of C: Same result either way!
    end

    Note over U,DB: 3. ATTEMPT USER CREATION
    C->>S: POST /api/auth/wallet-signup (credentials: include)

    alt Cookie JWT is FRESH
        S->>S: getWalletFromPrivyToken(cookie) = 0x84d5...5d95
        S->>DB: INSERT INTO users (wallet_address = 0x84d5...5d95)
        DB-->>S: OK
        S-->>C: { ok: true }
        C->>C: Fetch /api/me again, show OnboardingModal
        Note over U,C: HAPPY PATH - user sees onboarding
    else Cookie JWT is EXPIRED/STALE
        S->>S: getWalletFromPrivyToken(cookie) = null
        S-->>C: 401 "Authentication required"
        Note over C: BUG: Falls through silently!
        C->>C: setAuthState('ready')
        Note over U,C: GHOST STATE - page renders normally
        Note over U,C: Privy says authenticated = true
        Note over U,C: But NO users row exists in DB
    end

    Note over U,DB: 4. USER TRIES AVATAR/NAME CHANGE
    U->>C: Click "Select Avatar"
    C->>S: GET /api/avatars/choices
    S->>S: getCurrentUserFromRequestCookie()
    S->>S: getWalletFromPrivyToken() = 0x84d5...5d95 (or null)
    S->>DB: SELECT * FROM users WHERE wallet = 0x84d5...5d95
    DB-->>S: [] (NO ROW EXISTS)
    S-->>C: 401 "Not signed in"
    Note over U,C: User sees 401 despite being "logged in"
```

## Why Logout Doesn't Fix It

```mermaid
sequenceDiagram
    participant U as User
    participant P as Privy SDK
    participant C as Client
    participant S as Server

    U->>C: Click "Sign Out"
    C->>P: privyLogout()
    P->>P: Clear Privy session
    C->>S: POST /api/auth/logout
    S->>S: Clear cookies (mwa_session, privy-token, etc.)
    S-->>C: { ok: true }
    C->>C: Redirect to /

    Note over U,P: BUT on next page load:
    U->>C: Navigate to any page
    P->>P: Privy SDK initializes
    P->>P: Checks localStorage/IndexedDB
    P->>P: Finds persisted session
    P->>C: authenticated = true (AUTO-RECONNECT)
    P->>C: Sets NEW privy-token cookie
    Note over U,C: User is re-authenticated but STILL no DB record
    Note over U,C: The cycle repeats - ghost state persists
```

## Root Cause

The `HomeWelcomeFlow` and `WalletConnectionHandler` rely on the `privy-token` **cookie** for server auth. But:

1. The Privy SDK sets `privy-token` as a short-lived JWT (~60 min)
2. The SDK refreshes it in the background, but cookie may be stale during the initial `/api/auth/wallet-signup` call
3. If signup returns 401, `HomeWelcomeFlow` falls through to `setAuthState('ready')` with no error shown
4. Once in ghost state, there's no recovery path -- the user creation is never retried

## Fix

Pass a fresh Privy access token via the `Authorization` header using `getAccessToken()` from `usePrivy()` in:

- `HomeWelcomeFlow.tsx` (the `/api/me` and `/api/auth/wallet-signup` calls)
- `WalletConnectionHandler.tsx` (same calls)
- `OnboardingModal.tsx` (avatar and profile creation calls)

This ensures the server always receives a valid, non-expired JWT regardless of cookie state.
