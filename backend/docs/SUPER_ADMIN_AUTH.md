# Super Admin authentication

The standalone Super Admin flow uses backend-only environment values and does not create a row in the existing `User` table.

Configure these values in the backend environment (never in `NEXT_PUBLIC_*` variables):

```text
SUPER_ADMIN_EMAIL=admin@example.com
SUPER_ADMIN_PASSWORD_HASH=<bcrypt hash>
SUPER_ADMIN_DEV_SHOW_OTP=false
```

Generate a bcrypt hash locally without printing or committing the password:

```powershell
node -e "const bcrypt=require('bcrypt'); const readline=require('readline'); const r=readline.createInterface({input:process.stdin,output:process.stdout}); r.question('Password: ', async p=>{console.log(await bcrypt.hash(p,12)); r.close();})"
```

Copy the resulting hash directly into the local backend environment file. Do not put the plaintext password in source control, browser configuration, logs, or frontend environment variables.

`SUPER_ADMIN_DEV_SHOW_OTP=true` is accepted only when `NODE_ENV=development`; it returns the OTP to the local login page after the first factor succeeds. It is ignored in all other environments. Production uses the existing centralized Resend sender and never returns or logs OTP values.

The authenticated session is an HTTP-only, SameSite cookie with a 30-minute expiry. Mutating management requests also require the non-HTTP-only double-submit CSRF cookie in `X-CSRF-Token`. The in-memory session store is suitable for a single local process only; production deployment must use a shared encrypted/session store before running multiple backend instances.
