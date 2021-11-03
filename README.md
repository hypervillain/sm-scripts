### 1. Update Prismic CTS to use SharedSlices

Note that this does not migrate content that relies on Non Shared Slices.

Create a `.env` file with `TOKEN` (prismic-auth) and `REPO` values.

```bash
npm install
node migrate-cts.mjs
````

This will create customtypes ans slices folders.
Untested.