# Server Interface and Type Definitions

This document details the types and interfaces used by the server-side API.

## Request Types (`request.library.ts`)

### `HTTP`
Common HTTP status codes used in requests:
- `Ok`: 200
- `PermRedirect`: 301
- `TempRedirect`: 302
- `BadRequest`: 400
- `Unauthorised`: 401
- `Forbidden`: 403

### `METHOD`
Standard HTTP methods:
- `Head`: 'HEAD'
- `Get`: 'GET'
- `Put`: 'PUT'
- `Delete`: 'DELETE'
- `Post`: 'POST'

### `Config`
Optional configuration for `httpRequest`:
- `timeOut?: number` (Defaults to 2 seconds)
- `prefix?: string` (Optional response wrapper prefix)
