-- Applied with `npm run db:migrate`. Safe to run more than once.
-- The CHECK constraints mirror lib/validation.ts and lib/services.ts:
-- the application validates first, the database is the last line of defence.

create table if not exists service_requests (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null check (char_length(name) between 2 and 100),
  email       text        not null check (char_length(email) between 3 and 254),
  service     text        not null check (service in (
                'invoice-automation',
                'customer-notifications',
                'reporting-integration',
                'process-analysis'
              )),
  description text        not null check (char_length(description) between 10 and 2000),
  created_at  timestamptz not null default now()
);
