-- Enable extensions
create extension if not exists pgcrypto;

-- ENUMS
do $$ begin
  create type store_type as enum ('TIMS','CAFETERIA','GIFT','PHARMACY_OTC');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_type as enum ('INDIVIDUAL','GROUP');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum (
    'DRAFT',
    'AWAITING_PAYMENT',
    'QUEUED',
    'PENDING_ACCEPTANCE',
    'ACCEPTED',
    'SHOPPING',
    'NEEDS_MORE_AUTH',
    'READY_TO_CAPTURE',
    'DELIVERING',
    'DELIVERED',
    'CANCELED',
    'EXPIRED'
  );
exception when duplicate_object then null; end $$;

-- PROFILES
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text,
  display_name text,
  created_at timestamptz default now()
);

-- RUNNER STATE
create table runner_state (
  runner_id uuid primary key references profiles(id) on delete cascade,
  on_shift boolean default false,
  active_order_id uuid,
  updated_at timestamptz default now()
);

-- GROUPS
create table groups (
  id uuid primary key default gen_random_uuid(),
  host_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now()
);

create table group_members (
  group_id uuid references groups(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  primary key (group_id, user_id)
);

-- ORDERS
create table orders (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references profiles(id) on delete cascade,
  runner_id uuid references profiles(id),
  store store_type,
  order_type order_type default 'INDIVIDUAL',
  group_id uuid references groups(id),
  status order_status default 'DRAFT',
  delivery_area text,
  delivery_destination text,
  notes text,
  tip_cents integer default 0,
  item_cap_cents integer default 0,
  receipt_item_total_cents integer,
  delivery_fee_cents integer,
  stripe_payment_intent_id text,
  stripe_authorized_total_cents integer default 0,
  stripe_captured_total_cents integer,
  created_at timestamptz default now()
);

-- ORDER ITEMS
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  name text,
  qty integer default 1,
  modifiers jsonb default '{}'::jsonb,
  notes text
);

-- Enable RLS
alter table profiles enable row level security;
alter table runner_state enable row level security;
alter table groups enable row level security;
alter table group_members enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;