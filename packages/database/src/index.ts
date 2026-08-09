import type { GuardianScan } from "@guardian/shared";

export interface GuardianRepository {
  saveScan(scan: GuardianScan): Promise<void>;
  getScan(id: string): Promise<GuardianScan | null>;
  listScans(accountId: string): Promise<GuardianScan[]>;
  consumeNonce(sessionId: string, nonce: number, expiresAt: number): Promise<boolean>;
}

export const schemaSql = `
create extension if not exists pg_trgm;

create table if not exists guardian_accounts (
  id uuid primary key,
  privy_user_id text unique,
  primary_wallet_address text not null,
  wallet_type text not null,
  network text not null default 'studionet',
  access_status text not null default 'PAYMENT_REQUIRED',
  created_at timestamptz not null default now()
);

create table if not exists access_entitlements (
  wallet_address text primary key,
  payment_transaction_id text not null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists relay_sessions (
  id uuid primary key,
  account_id uuid not null references guardian_accounts(id),
  wallet_address text not null,
  allowed_contracts jsonb not null,
  allowed_methods jsonb not null,
  last_nonce bigint not null default 0,
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create table if not exists scans (
  id uuid primary key,
  account_id uuid not null references guardian_accounts(id),
  report_ref text unique not null,
  product_name text not null,
  manufacturer text not null default '',
  seller text not null default '',
  status text not null,
  evidence_manifest jsonb,
  assessment jsonb,
  transaction_hash text not null default '',
  public_report boolean not null default false,
  challenged boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists scans_product_search on scans using gin (product_name gin_trgm_ops);

create table if not exists evidence_assets (
  id uuid primary key,
  scan_id uuid not null references scans(id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  byte_size bigint not null,
  sha256 text not null,
  extracted_text text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists watchlist_entries (
  account_id uuid not null references guardian_accounts(id),
  product_key text not null,
  product_name text not null,
  latest_scan_id uuid references scans(id),
  created_at timestamptz not null default now(),
  primary key (account_id, product_key)
);

create table if not exists appeals (
  id uuid primary key,
  scan_id uuid not null references scans(id),
  round integer not null,
  reason text not null,
  evidence_manifest jsonb,
  transaction_hash text not null default '',
  status text not null,
  created_at timestamptz not null default now()
);

create table if not exists relay_nonces (
  session_id uuid primary key,
  last_nonce bigint not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);
`;
