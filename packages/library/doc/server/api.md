# Server API Documentation

This section details the server-side utilities and API methods.

## File Utility (`file.library.ts`)

Static class for file system operations using `node:fs`.

### `File.read(file: string): Promise<any>`
Reads a file from the temporary directory. Coerces the result to a number if numeric.

### `File.write(file: string, doc: any): Promise<any>`
Writes a document to the temporary directory.

### `File.exist(file: string): Promise<boolean>`
Checks if a file exists in the temporary directory.

### `File.remove(path: string): Promise<void>`
Synchronously removes a file from the temporary directory.

## Request Utilities (`request.library.ts`)

### `httpRequest<T>(url: string | URL, init?: RequestInit, config?: Config): Promise<T>`
Standardized JSON fetch request with a default 2-second timeout and error handling.

### `headRequest(url: string | URL): Promise<{ status: number, headers: Headers }>`
Performs a `HEAD` request to verify resource existence without downloading content.

## Buffer Utilities (`buffer.library.ts`)

### `encode64(str: any): string`
Encodes any value (after stringification) to Base64.

### `decode64<T>(str: string): T`
Decodes a Base64 string and objectifies the result.

## Auth Utilities (`auth.library.ts`)

### `decodeJWT(token: string): any`
Decodes the payload of a JSON Web Token (JWT).
