# TaskFlow Security Notes

## Authentication and authorization

- Users authenticate through Firebase Authentication using Google sign-in.
- The frontend obtains a Firebase ID token and sends it to the API as a bearer token.
- The API verifies the token signature using Google's Secure Token JWKS endpoint.
- Token verification checks the expected Firebase project issuer, audience, and subject.
- Requests without a valid token are rejected with HTTP 401.
- Task and attachment operations use the authenticated user's UID and enforce ownership checks.

## Storage

- Task attachments are stored in the Azure Blob Storage `task-attachments` container.
- The container is private; anonymous public blob access is disabled.
- Attachment size is limited by the application to 5 MB.
- Download and deletion operations require authenticated API access and ownership validation.

## Azure identity and secrets

- The Function App has a managed identity for configured Azure resource access.
- Key Vault is configured with role-based access control and a Function App identity assignment.
- Keep credentials and local configuration in local settings or Azure application settings / Key Vault as appropriate.
- Never commit `local.settings.json`, `.env` files, storage keys, Cosmos DB keys, connection strings, or private credentials.

## Network and transport

- Deployed application endpoints use HTTPS.
- Function App CORS should allow only the intended frontend origins.
- Storage is configured to require HTTPS and disallow public blob access.

## Important limitations

This document records the implemented configuration and manual checks; it is not a certification or independent security assessment. Review current Azure role assignments, application settings, dependency advisories, Firebase project restrictions, and logs periodically. Rotate any credential that may have been exposed.
