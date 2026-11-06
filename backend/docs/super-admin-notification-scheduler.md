# Super Admin notification scheduler

The worker is intentionally disabled by default. A deployment must complete the notification migration, verify the target database, and receive operational approval before setting `NOTIFICATION_WORKER_ENABLED=true`.

Run the existing worker from an external scheduler every five minutes:

```text
npm run notifications:process
```

The worker claims due rows using the existing database lease and idempotency rules. It is safe for repeated scheduler invocations and concurrent workers. The scheduler must provide the migrated `DATABASE_URL`, `RESEND_API_KEY`, sender configuration, and `NOTIFICATION_WORKER_ENABLED=true` as secrets/environment variables. Do not place credentials in the repository or workflow files.

Example scheduler settings:

- GitHub Actions: `*/5 * * * *`, with repository secrets and a protected environment approval.
- Windows Task Scheduler: repeat every 5 minutes, running `npm run notifications:process` from `backend`.
- Linux cron or a container scheduler: `*/5 * * * *` with the same protected environment variables.

Until the migration, backup, authorization, and sender checks are approved, leave the flag `false`; the command exits without database access or email delivery.
