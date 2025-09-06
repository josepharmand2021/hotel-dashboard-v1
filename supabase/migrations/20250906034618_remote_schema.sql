create sequence "public"."ci_consumptions_id_seq";

create sequence "public"."document_types_id_seq";

create sequence "public"."document_versions_id_seq";

create sequence "public"."documents_id_seq";

create sequence "public"."payables_id_seq";

drop trigger if exists "ci_require_account" on "public"."capital_contributions";

drop trigger if exists "trg_check_po_on_post" on "public"."expenses";

alter table "public"."capital_contributions" drop constraint "capital_contributions_capital_injection_id_fkey";

alter table "public"."capital_contributions" drop constraint "capital_contributions_posted_need_bank";

alter table "public"."purchase_orders" drop constraint "purchase_orders_vendor_id_fkey";

drop function if exists "public"."check_po_paid_on_expense_post"();

drop view if exists "public"."v_ci_plan_summary";

drop view if exists "public"."v_ci_shareholder_progress";

drop view if exists "public"."v_po_paid";

drop view if exists "public"."v_pt_inflows_list";

drop index if exists "public"."idx_cc_plan";


  create table "public"."app_user_roles" (
    "user_id" uuid not null,
    "role" text not null
      );



  create table "public"."ci_consumptions" (
    "id" bigint not null default nextval('ci_consumptions_id_seq'::regclass),
    "contribution_id" bigint not null,
    "obligation_id" bigint not null,
    "amount" bigint not null,
    "created_at" timestamp with time zone default now()
      );



  create table "public"."document_types" (
    "id" bigint not null default nextval('document_types_id_seq'::regclass),
    "code" text not null,
    "name" text not null,
    "description" text,
    "constraints_json" jsonb
      );



  create table "public"."document_versions" (
    "id" bigint not null default nextval('document_versions_id_seq'::regclass),
    "document_id" bigint not null,
    "version" integer not null,
    "storage_key" text not null,
    "mime" text not null,
    "size_bytes" bigint not null,
    "hash_sha256" text not null,
    "uploaded_by" uuid not null default auth.uid(),
    "uploaded_at" timestamp with time zone not null default now(),
    "change_note" text,
    "created_by" uuid
      );


alter table "public"."document_versions" enable row level security;


  create table "public"."documents" (
    "id" bigint not null default nextval('documents_id_seq'::regclass),
    "type_id" bigint not null,
    "type_code" text not null,
    "title" text not null,
    "status" text not null default 'draft'::text,
    "vendor_id" bigint,
    "entity_type" text,
    "entity_id" bigint,
    "issue_date" date,
    "number" text,
    "currency" text,
    "amount" numeric(18,2),
    "meta" jsonb,
    "main_version_id" bigint,
    "mime_main" text,
    "storage_key_main" text,
    "pages" integer,
    "hash_sha256" text,
    "ocr_text" tsvector,
    "created_by" uuid not null default auth.uid(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "updated_by" uuid
      );


alter table "public"."documents" enable row level security;


  create table "public"."payables" (
    "id" bigint not null default nextval('payables_id_seq'::regclass),
    "po_id" bigint,
    "vendor_id" bigint not null,
    "vendor_name" text,
    "invoice_no" text not null,
    "invoice_date" date not null,
    "due_date" date,
    "term_no" integer,
    "term_percent" numeric,
    "category_id" bigint not null,
    "subcategory_id" bigint not null,
    "amount" bigint not null,
    "status" text not null default 'unpaid'::text,
    "note" text,
    "created_at" timestamp with time zone default now(),
    "source" text not null default 'PT'::text,
    "dpp_amount" bigint not null,
    "ppn_amount" bigint not null,
    "tax_invoice_no" text,
    "tax_invoice_date" date,
    "is_ppn_creditable" boolean not null default false,
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."payables" enable row level security;

alter table "public"."capital_contributions" drop column "capital_injection_id";

alter table "public"."capital_contributions" alter column "status" drop default;

alter table "public"."capital_contributions" alter column "status" drop not null;

alter table "public"."expenses" add column "origin" text not null default 'direct'::text;

alter table "public"."expenses" add column "payable_id" bigint;

alter sequence "public"."ci_consumptions_id_seq" owned by "public"."ci_consumptions"."id";

alter sequence "public"."document_types_id_seq" owned by "public"."document_types"."id";

alter sequence "public"."document_versions_id_seq" owned by "public"."document_versions"."id";

alter sequence "public"."documents_id_seq" owned by "public"."documents"."id";

alter sequence "public"."payables_id_seq" owned by "public"."payables"."id";

CREATE UNIQUE INDEX app_user_roles_pkey ON public.app_user_roles USING btree (user_id, role);

CREATE UNIQUE INDEX ci_consumptions_pkey ON public.ci_consumptions USING btree (id);

CREATE UNIQUE INDEX document_types_code_key ON public.document_types USING btree (code);

CREATE UNIQUE INDEX document_types_pkey ON public.document_types USING btree (id);

CREATE UNIQUE INDEX document_versions_pkey ON public.document_versions USING btree (id);

CREATE UNIQUE INDEX documents_pkey ON public.documents USING btree (id);

CREATE INDEX idx_ci_cons_contribution ON public.ci_consumptions USING btree (contribution_id);

CREATE INDEX idx_ci_cons_obligation ON public.ci_consumptions USING btree (obligation_id);

CREATE INDEX idx_payables_due_date ON public.payables USING btree (due_date);

CREATE INDEX idx_payables_invoice_date ON public.payables USING btree (invoice_date);

CREATE INDEX idx_payables_po ON public.payables USING btree (po_id);

CREATE INDEX idx_payables_source ON public.payables USING btree (source);

CREATE INDEX idx_payables_status ON public.payables USING btree (status);

CREATE INDEX idx_payables_vendor ON public.payables USING btree (vendor_id);

CREATE INDEX ix_doc_versions_hash ON public.document_versions USING btree (hash_sha256);

CREATE INDEX ix_documents_entity ON public.documents USING btree (entity_type, entity_id);

CREATE INDEX ix_documents_number ON public.documents USING btree (number);

CREATE INDEX ix_documents_ocr ON public.documents USING gin (ocr_text);

CREATE INDEX ix_documents_type ON public.documents USING btree (type_id);

CREATE INDEX ix_documents_vendor ON public.documents USING btree (vendor_id);

CREATE UNIQUE INDEX payables_pkey ON public.payables USING btree (id);

CREATE UNIQUE INDEX uq_expenses_payable_active ON public.expenses USING btree (payable_id) WHERE ((payable_id IS NOT NULL) AND (status <> 'void'::text));

CREATE UNIQUE INDEX uq_payables_vendor_invoice ON public.payables USING btree (vendor_id, invoice_no) WHERE (status <> 'void'::text);

CREATE UNIQUE INDEX ux_bank_accounts_only_one_default ON public.bank_accounts USING btree (is_default) WHERE (is_default IS TRUE);

CREATE UNIQUE INDEX ux_doc_versions_doc_ver ON public.document_versions USING btree (document_id, version);

CREATE UNIQUE INDEX ux_payable_one_fp ON public.documents USING btree (entity_type, entity_id) WHERE ((type_code = 'FP'::text) AND (entity_type = 'payable'::text));

CREATE UNIQUE INDEX ux_payable_one_invoice ON public.documents USING btree (entity_type, entity_id) WHERE ((type_code = 'INVOICE'::text) AND (entity_type = 'payable'::text));

alter table "public"."app_user_roles" add constraint "app_user_roles_pkey" PRIMARY KEY using index "app_user_roles_pkey";

alter table "public"."ci_consumptions" add constraint "ci_consumptions_pkey" PRIMARY KEY using index "ci_consumptions_pkey";

alter table "public"."document_types" add constraint "document_types_pkey" PRIMARY KEY using index "document_types_pkey";

alter table "public"."document_versions" add constraint "document_versions_pkey" PRIMARY KEY using index "document_versions_pkey";

alter table "public"."documents" add constraint "documents_pkey" PRIMARY KEY using index "documents_pkey";

alter table "public"."payables" add constraint "payables_pkey" PRIMARY KEY using index "payables_pkey";

alter table "public"."app_user_roles" add constraint "app_user_roles_role_check" CHECK ((role = ANY (ARRAY['super_admin'::text, 'admin'::text, 'viewer'::text]))) not valid;

alter table "public"."app_user_roles" validate constraint "app_user_roles_role_check";

alter table "public"."capital_injections" add constraint "ck_ci_status" CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'closed'::text]))) not valid;

alter table "public"."capital_injections" validate constraint "ck_ci_status";

alter table "public"."ci_consumptions" add constraint "ci_consumptions_amount_check" CHECK ((amount > 0)) not valid;

alter table "public"."ci_consumptions" validate constraint "ci_consumptions_amount_check";

alter table "public"."ci_consumptions" add constraint "ci_consumptions_contribution_id_fkey" FOREIGN KEY (contribution_id) REFERENCES capital_contributions(id) ON DELETE CASCADE not valid;

alter table "public"."ci_consumptions" validate constraint "ci_consumptions_contribution_id_fkey";

alter table "public"."ci_consumptions" add constraint "ci_consumptions_obligation_id_fkey" FOREIGN KEY (obligation_id) REFERENCES ci_obligations(id) ON DELETE CASCADE not valid;

alter table "public"."ci_consumptions" validate constraint "ci_consumptions_obligation_id_fkey";

alter table "public"."document_types" add constraint "document_types_code_key" UNIQUE using index "document_types_code_key";

alter table "public"."document_versions" add constraint "ck_doc_versions_mime_allowed" CHECK ((mime = ANY (ARRAY['application/pdf'::text, 'image/jpeg'::text, 'image/png'::text]))) not valid;

alter table "public"."document_versions" validate constraint "ck_doc_versions_mime_allowed";

alter table "public"."document_versions" add constraint "document_versions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."document_versions" validate constraint "document_versions_created_by_fkey";

alter table "public"."document_versions" add constraint "document_versions_document_id_fkey" FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE not valid;

alter table "public"."document_versions" validate constraint "document_versions_document_id_fkey";

alter table "public"."documents" add constraint "documents_type_code_fkey" FOREIGN KEY (type_code) REFERENCES document_types(code) not valid;

alter table "public"."documents" validate constraint "documents_type_code_fkey";

alter table "public"."documents" add constraint "documents_type_id_fkey" FOREIGN KEY (type_id) REFERENCES document_types(id) not valid;

alter table "public"."documents" validate constraint "documents_type_id_fkey";

alter table "public"."documents" add constraint "documents_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "public"."documents" validate constraint "documents_updated_by_fkey";

alter table "public"."expenses" add constraint "expenses_origin_check" CHECK ((origin = ANY (ARRAY['direct'::text, 'from_payable'::text]))) not valid;

alter table "public"."expenses" validate constraint "expenses_origin_check";

alter table "public"."expenses" add constraint "expenses_origin_payable_consistency" CHECK ((((origin = 'direct'::text) AND (payable_id IS NULL)) OR ((origin = 'from_payable'::text) AND (payable_id IS NOT NULL)))) not valid;

alter table "public"."expenses" validate constraint "expenses_origin_payable_consistency";

alter table "public"."expenses" add constraint "expenses_payable_id_fkey" FOREIGN KEY (payable_id) REFERENCES payables(id) not valid;

alter table "public"."expenses" validate constraint "expenses_payable_id_fkey";

alter table "public"."payables" add constraint "ck_payables_dpp_ppn_match_total" CHECK ((amount = (dpp_amount + ppn_amount))) not valid;

alter table "public"."payables" validate constraint "ck_payables_dpp_ppn_match_total";

alter table "public"."payables" add constraint "ck_payables_tax_only_pt" CHECK (((source = 'PT'::text) OR ((COALESCE(ppn_amount, (0)::bigint) = 0) AND (tax_invoice_no IS NULL) AND (tax_invoice_date IS NULL) AND (is_ppn_creditable = false)))) not valid;

alter table "public"."payables" validate constraint "ck_payables_tax_only_pt";

alter table "public"."payables" add constraint "payables_amount_check" CHECK ((amount > 0)) not valid;

alter table "public"."payables" validate constraint "payables_amount_check";

alter table "public"."payables" add constraint "payables_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) not valid;

alter table "public"."payables" validate constraint "payables_category_id_fkey";

alter table "public"."payables" add constraint "payables_po_id_fkey" FOREIGN KEY (po_id) REFERENCES purchase_orders(id) not valid;

alter table "public"."payables" validate constraint "payables_po_id_fkey";

alter table "public"."payables" add constraint "payables_source_check" CHECK ((source = ANY (ARRAY['PT'::text, 'RAB'::text, 'Petty'::text]))) not valid;

alter table "public"."payables" validate constraint "payables_source_check";

alter table "public"."payables" add constraint "payables_status_check" CHECK ((status = ANY (ARRAY['unpaid'::text, 'paid'::text, 'void'::text]))) not valid;

alter table "public"."payables" validate constraint "payables_status_check";

alter table "public"."payables" add constraint "payables_subcategory_id_fkey" FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) not valid;

alter table "public"."payables" validate constraint "payables_subcategory_id_fkey";

alter table "public"."payables" add constraint "payables_vendor_id_fkey" FOREIGN KEY (vendor_id) REFERENCES vendors(id) not valid;

alter table "public"."payables" validate constraint "payables_vendor_id_fkey";

alter table "public"."purchase_orders" add constraint "purchase_orders_vendor_id_fkey" FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT not valid;

alter table "public"."purchase_orders" validate constraint "purchase_orders_vendor_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.activate_bank_account(p_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update bank_accounts
     set is_active = true
   where id = p_id;
  if not found then
    raise exception 'Bank account % tidak ditemukan', p_id;
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.after_expense_change_recalc()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if tg_op in ('INSERT','UPDATE') and new.payable_id is not null then
    perform recalc_payable_status(new.payable_id);
  end if;

  if tg_op = 'UPDATE'
     and old.payable_id is distinct from new.payable_id
     and old.payable_id is not null then
    perform recalc_payable_status(old.payable_id);
  end if;

  if tg_op = 'DELETE' and old.payable_id is not null then
    perform recalc_payable_status(old.payable_id);
  end if;

  return null;
end$function$
;

CREATE OR REPLACE FUNCTION public.create_payable(p_po_id bigint, p_vendor_id bigint, p_vendor_name text, p_invoice_no text, p_invoice_date date, p_due_date date, p_term_no integer, p_term_percent numeric, p_category_id bigint, p_subcategory_id bigint, p_amount bigint, p_note text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id bigint;
begin
  insert into public.payables(
    po_id, vendor_id, vendor_name,
    invoice_no, invoice_date, due_date,
    term_no, term_percent,
    category_id, subcategory_id,
    amount, note
  )
  values(
    p_po_id, p_vendor_id,
    coalesce(p_vendor_name, (select name from public.vendors where id = p_vendor_id)),
    p_invoice_no, p_invoice_date, p_due_date,
    p_term_no, p_term_percent,
    p_category_id, p_subcategory_id,
    p_amount, p_note
  )
  returning id into v_id;

  return v_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_payable(p_po_id bigint, p_vendor_id bigint, p_vendor_name text, p_invoice_no text, p_invoice_date date, p_due_date date, p_term_no integer, p_term_percent numeric, p_category_id bigint, p_subcategory_id bigint, p_amount bigint, p_note text, p_source text DEFAULT 'PT'::text, p_dpp_amount bigint DEFAULT NULL::bigint, p_ppn_amount bigint DEFAULT NULL::bigint, p_tax_invoice_no text DEFAULT NULL::text, p_tax_invoice_date date DEFAULT NULL::date, p_is_ppn_creditable boolean DEFAULT true)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_id   bigint;
  v_src  text := coalesce(p_source,'PT');
  v_dpp  bigint;
  v_ppn  bigint;
  v_creditable boolean;
begin
  if v_src = 'PT' then
    v_dpp := coalesce(
      p_dpp_amount,
      case when p_ppn_amount is not null then p_amount - p_ppn_amount end,
      round((p_amount::numeric / 1.11))::bigint
    );
    v_ppn := coalesce(p_ppn_amount, p_amount - v_dpp);
    v_creditable := coalesce(p_is_ppn_creditable, true);
  else
    v_dpp := null; v_ppn := null; v_creditable := false;
  end if;

  insert into public.payables(
    po_id, vendor_id, vendor_name,
    invoice_no, invoice_date, due_date,
    term_no, term_percent,
    category_id, subcategory_id,
    amount, status, note,
    source, dpp_amount, ppn_amount, tax_invoice_no, tax_invoice_date,
    is_ppn_creditable
  )
  values(
    p_po_id, p_vendor_id,
    coalesce(p_vendor_name, (select name from public.vendors where id = p_vendor_id)),
    p_invoice_no, p_invoice_date, p_due_date,
    p_term_no, p_term_percent,
    p_category_id, p_subcategory_id,
    p_amount, 'unpaid', p_note,
    v_src, v_dpp, v_ppn,
    case when v_src='PT' then p_tax_invoice_no end,
    case when v_src='PT' then p_tax_invoice_date end,
    v_creditable
  )
  returning id into v_id;

  return v_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.deactivate_bank_account(p_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update bank_accounts
     set is_active = false,
         is_default = false
   where id = p_id;
  if not found then
    raise exception 'Bank account % tidak ditemukan', p_id;
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_expense_origin_from_payable()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v payables%rowtype;
BEGIN
  IF NEW.payable_id IS NULL THEN
    NEW.origin := 'direct';
    RETURN NEW;
  END IF;

  SELECT * INTO v FROM public.payables WHERE id = NEW.payable_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payable % tidak ditemukan', NEW.payable_id; END IF;
  IF v.status <> 'unpaid' THEN RAISE EXCEPTION 'Payable % berstatus %, harus UNPAID', v.id, v.status; END IF;

  IF EXISTS (
    SELECT 1 FROM public.expenses e
    WHERE e.payable_id = v.id AND e.status <> 'void'
      AND (TG_OP <> 'UPDATE' OR e.id <> COALESCE(OLD.id,-1))
  ) THEN
    RAISE EXCEPTION 'Payable % sudah punya pembayaran aktif', v.id;
  END IF;

  NEW.origin         := 'from_payable';
  NEW.vendor_id      := v.vendor_id;
  NEW.vendor_name    := v.vendor_name;
  NEW.invoice_no     := v.invoice_no;
  NEW.category_id    := v.category_id;
  NEW.subcategory_id := v.subcategory_id;
  NEW.amount         := v.amount;      -- period_month auto; amount dari payable
  IF ((NEW.account_id IS NOT NULL)::int + (NEW.cashbox_id IS NOT NULL)::int) > 1
  THEN RAISE EXCEPTION 'Pilih salah satu: account_id ATAU cashbox_id'; END IF;

  RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.f_shareholder_ci_summary(p_as_of_date date DEFAULT CURRENT_DATE, p_statuses text[] DEFAULT ARRAY['active'::text, 'closed'::text], p_shareholder_id bigint DEFAULT NULL::bigint)
 RETURNS TABLE(shareholder_id bigint, shareholder_name text, obligation_total bigint, obligation_ytd bigint, obligation_mtd bigint, allocated_total bigint, allocated_ytd bigint, allocated_mtd bigint, contributions_total bigint, contributions_ytd bigint, contributions_mtd bigint, credit_balance_total bigint, outstanding_total bigint, net_position_total bigint, last_contribution_date date, last_allocation_at timestamp with time zone, first_uncovered_period text)
 LANGUAGE sql
 STABLE
AS $function$
with b as (
  select
    date_trunc('month', coalesce(p_as_of_date, current_date))::date as asof_month,
    to_char(date_trunc('month', coalesce(p_as_of_date, current_date)),'YYYY-MM') as asof_key,
    to_char(date_trunc('year',  coalesce(p_as_of_date, current_date)),'YYYY-MM') as ytd_start_key,
    (date_trunc('month', coalesce(p_as_of_date, current_date)) + interval '1 month' - interval '1 day')::date as month_end
),
obl as (
  select
    o.shareholder_id,
    sum(o.obligation_amount) filter (
      where ci.status = any(p_statuses) and ci.period <= b.asof_key
    ) as obligation_total,
    sum(o.obligation_amount) filter (
      where ci.status = any(p_statuses) and ci.period between b.ytd_start_key and b.asof_key
    ) as obligation_ytd,
    sum(o.obligation_amount) filter (
      where ci.status = any(p_statuses) and ci.period = b.asof_key
    ) as obligation_mtd
  from public.ci_obligations o
  join public.capital_injections ci on ci.id = o.capital_injection_id
  cross join b
  where (p_shareholder_id is null or o.shareholder_id = p_shareholder_id)
  group by o.shareholder_id
),
alloc as (
  select
    o.shareholder_id,
    sum(cn.amount) filter (where cn.created_at::date <= b.month_end) as allocated_total,
    sum(cn.amount) filter (where cn.created_at::date between date_trunc('year', b.asof_month) and b.month_end) as allocated_ytd,
    sum(cn.amount) filter (where date_trunc('month', cn.created_at) = b.asof_month) as allocated_mtd,
    max(cn.created_at) filter (where cn.created_at::date <= b.month_end) as last_allocation_at
  from public.ci_consumptions cn
  join public.ci_obligations o on o.id = cn.obligation_id
  join public.capital_injections ci on ci.id = o.capital_injection_id
  cross join b
  where ci.status = any(p_statuses)
    and ci.period <= b.asof_key
    and (p_shareholder_id is null or o.shareholder_id = p_shareholder_id)
  group by o.shareholder_id
),
contrib as (
  select
    c.shareholder_id,
    sum(c.amount) filter (where c.transfer_date <= b.month_end) as contributions_total,
    sum(c.amount) filter (where c.transfer_date between date_trunc('year', b.asof_month) and b.month_end) as contributions_ytd,
    sum(c.amount) filter (where date_trunc('month', c.transfer_date) = b.asof_month) as contributions_mtd,
    max(c.transfer_date) filter (where c.transfer_date <= b.month_end) as last_contribution_date
  from public.capital_contributions c
  cross join b
  where (p_shareholder_id is null or c.shareholder_id = p_shareholder_id)
  group by c.shareholder_id
),
uncovered as (
  -- ambil 'period' (TEXT) tertua yang masih outstanding
  select shareholder_id, min(period) as first_uncovered_period
  from (
    select
      o.shareholder_id,
      ci.period,
      o.obligation_amount - coalesce(sum(cn.amount) filter (where cn.created_at::date <= b.month_end),0) as outstanding
    from public.ci_obligations o
    join public.capital_injections ci on ci.id = o.capital_injection_id
    left join public.ci_consumptions cn on cn.obligation_id = o.id
    cross join b
    where ci.status = any(p_statuses)
      and ci.period <= b.asof_key
      and (p_shareholder_id is null or o.shareholder_id = p_shareholder_id)
    group by o.shareholder_id, ci.period, o.obligation_amount
  ) x
  where x.outstanding > 0
  group by shareholder_id
)
select
  s.id   as shareholder_id,
  s.name as shareholder_name,

  coalesce(obl.obligation_total,0)::bigint as obligation_total,
  coalesce(obl.obligation_ytd,0)::bigint   as obligation_ytd,
  coalesce(obl.obligation_mtd,0)::bigint   as obligation_mtd,

  coalesce(alloc.allocated_total,0)::bigint as allocated_total,
  coalesce(alloc.allocated_ytd,0)::bigint   as allocated_ytd,
  coalesce(alloc.allocated_mtd,0)::bigint   as allocated_mtd,

  coalesce(contrib.contributions_total,0)::bigint as contributions_total,
  coalesce(contrib.contributions_ytd,0)::bigint   as contributions_ytd,
  coalesce(contrib.contributions_mtd,0)::bigint   as contributions_mtd,

  greatest(coalesce(contrib.contributions_total,0) - coalesce(alloc.allocated_total,0), 0)::bigint as credit_balance_total,
  greatest(coalesce(obl.obligation_total,0) - coalesce(alloc.allocated_total,0), 0)::bigint       as outstanding_total,
  (
    greatest(coalesce(obl.obligation_total,0) - coalesce(alloc.allocated_total,0), 0)
    - greatest(coalesce(contrib.contributions_total,0) - coalesce(alloc.allocated_total,0), 0)
  )::bigint as net_position_total,

  contrib.last_contribution_date,
  alloc.last_allocation_at,
  uncovered.first_uncovered_period
from public.shareholders s
left join obl       on obl.shareholder_id = s.id
left join alloc     on alloc.shareholder_id = s.id
left join contrib   on contrib.shareholder_id = s.id
left join uncovered on uncovered.shareholder_id = s.id
where (p_shareholder_id is null or s.id = p_shareholder_id)
order by s.name;
$function$
;

CREATE OR REPLACE FUNCTION public.fifo_allocate_all_unconsumed()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT cc.id
    FROM capital_contributions cc
    LEFT JOIN ci_consumptions c ON c.contribution_id = cc.id
    GROUP BY cc.id, cc.amount
    HAVING COALESCE(SUM(c.amount),0) < cc.amount
    ORDER BY cc.transfer_date, cc.id
  LOOP
    PERFORM fifo_allocate_contribution(r.id);
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fifo_allocate_contribution(p_contribution_id bigint)
 RETURNS TABLE(obligation_id bigint, capital_injection_id bigint, allocated numeric)
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_sh BIGINT;
  v_amount NUMERIC;
  v_remaining NUMERIC;
  r RECORD;
BEGIN
  -- ambil data kontribusi
  SELECT shareholder_id, amount::numeric
  INTO v_sh, v_amount
  FROM capital_contributions
  WHERE id = p_contribution_id;

  IF v_sh IS NULL THEN
    RAISE EXCEPTION 'Contribution % not found', p_contribution_id;
  END IF;

  -- sisa contribution yang belum pernah dialokasikan (jaga kalau fungsi dipanggil dua kali)
  SELECT v_amount - COALESCE(SUM(amount),0)
  INTO v_remaining
  FROM ci_consumptions
  WHERE contribution_id = p_contribution_id;

  IF v_remaining <= 0 THEN
    RETURN; -- tidak ada yang perlu dialokasikan
  END IF;

  -- loop kewajiban shareholder yang masih outstanding, urut paling tua → terbaru
  FOR r IN
    SELECT
      o.outstanding,
      o.obligation_id,
      o.capital_injection_id
    FROM v_ci_outstanding o
    JOIN capital_injections ci ON ci.id = o.capital_injection_id
    WHERE o.shareholder_id = v_sh
      AND o.outstanding > 0
    ORDER BY COALESCE(ci.period_month, ci.created_at), ci.id, o.obligation_id
  LOOP
    EXIT WHEN v_remaining <= 0;

    IF r.outstanding >= v_remaining THEN
      INSERT INTO ci_consumptions (contribution_id, obligation_id, amount)
      VALUES (p_contribution_id, r.obligation_id, v_remaining);

      obligation_id := r.obligation_id;
      capital_injection_id := r.capital_injection_id;
      allocated := v_remaining;
      v_remaining := 0;
      RETURN NEXT;
    ELSE
      INSERT INTO ci_consumptions (contribution_id, obligation_id, amount)
      VALUES (p_contribution_id, r.obligation_id, r.outstanding);

      obligation_id := r.obligation_id;
      capital_injection_id := r.capital_injection_id;
      allocated := r.outstanding;
      v_remaining := v_remaining - r.outstanding;
      RETURN NEXT;
    END IF;
  END LOOP;

  -- kalau masih ada sisa v_remaining > 0:
  -- anggap sebagai "saldo kredit" (tidak perlu disimpan di tabel terpisah;
  -- nanti otomatis termakan saat ada kewajiban baru dan fungsi ini dipanggil lagi
  -- untuk contribution lain / mekanisme batch).
  RETURN;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_after_insert_expense_mark_paid()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.payable_id IS NOT NULL AND NEW.origin='from_payable' AND NEW.status <> 'void' THEN
    UPDATE public.payables SET status='paid'
    WHERE id=NEW.payable_id AND status='unpaid';
  END IF;
  RETURN NULL;
END $function$
;

CREATE OR REPLACE FUNCTION public.fn_after_update_expense_void_reset_payable()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.payable_id IS NOT NULL AND NEW.origin='from_payable'
     AND OLD.status <> 'void' AND NEW.status='void' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.expenses e
      WHERE e.payable_id=NEW.payable_id AND e.id<>NEW.id AND e.status<>'void'
    ) THEN
      UPDATE public.payables SET status='unpaid' WHERE id=NEW.payable_id;
    END IF;
  END IF;
  RETURN NULL;
END $function$
;

CREATE OR REPLACE FUNCTION public.fn_link_expense_to_payable()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  v_payable_id bigint;
begin
  -- Jika FE sudah isi payable_id, set origin konsisten
  if new.payable_id is not null then
    new.origin := 'from_payable';
    return new;
  end if;

  -- Tanpa vendor/invoice_no => biarkan direct
  if new.vendor_id is null or coalesce(new.invoice_no, '') = '' then
    new.origin := coalesce(new.origin, 'direct');
    return new;
  end if;

  -- Cari payable yang cocok
  select id
    into v_payable_id
  from payables
  where vendor_id = new.vendor_id
    and invoice_no = new.invoice_no
  order by id desc
  limit 1;

  if v_payable_id is not null then
    new.payable_id := v_payable_id;
    new.origin := 'from_payable';
  else
    new.origin := coalesce(new.origin, 'direct');
  end if;

  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.has_role_current(p_uid uuid, p_roles text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select exists (
    select 1
      from public.app_user_roles r
     where r.user_id = coalesce(p_uid, auth.uid())
       and r.role    = any (p_roles)
  );
$function$
;

CREATE OR REPLACE FUNCTION public.link_expense_to_payable_trg()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  -- cari payable berdasarkan pasangan (invoice_no, vendor_id)
  if NEW.invoice_no is not null and NEW.vendor_id is not null then
    select id
      into NEW.payable_id
    from payables
    where invoice_no = NEW.invoice_no
      and vendor_id = NEW.vendor_id
    order by id desc
    limit 1;
  end if;
  return NEW;
end
$function$
;

CREATE OR REPLACE FUNCTION public.pay_payable(p_payable_id bigint, p_expense_date date, p_source text DEFAULT 'PT'::text, p_account_id bigint DEFAULT NULL::bigint, p_cashbox_id bigint DEFAULT NULL::bigint, p_note text DEFAULT NULL::text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v payables%rowtype;
  v_expense_id bigint;
begin
  select * into v from payables where id=p_payable_id for update;
  if not found then raise exception 'Payable % not found', p_payable_id; end if;
  if v.status <> 'unpaid' then raise exception 'Payable % already %', p_payable_id, v.status; end if;

  insert into expenses (
    source, expense_date, amount,
    vendor_id, vendor_name,
    category_id, subcategory_id,
    note, account_id, cashbox_id,
    origin, payable_id, status
  ) values (
    coalesce(p_source,'PT'),
    coalesce(p_expense_date,current_date),
    v.amount,
    v.vendor_id, v.vendor_name,
    v.category_id, v.subcategory_id,
    coalesce(p_note, concat('Pay invoice ', v.invoice_no)),
    p_account_id, p_cashbox_id,
    'from_payable', v.id, 'posted'
  ) returning id into v_expense_id;

  update payables set status='paid' where id=v.id;

  return v_expense_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.recalc_payable_status(p_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_amount numeric;
  v_paid   numeric;
begin
  select amount into v_amount from payables where id = p_id;
  if v_amount is null then return; end if;

  select coalesce(sum(amount),0) into v_paid
  from expenses
  where payable_id = p_id
    and status = 'posted';

  update payables
  set status = case when v_paid >= v_amount then 'paid' else 'unpaid' end
  where id = p_id;
end$function$
;

CREATE OR REPLACE FUNCTION public.set_expense_origin()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.payable_id is null then
    new.origin := 'direct';
  else
    new.origin := 'from_payable';
  end if;
  return new;
end$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin new.updated_at = now(); return new; end $function$
;

CREATE OR REPLACE FUNCTION public.upsert_payable_document(p_entity_id bigint, p_type_code text, p_title text, p_issue_date date DEFAULT NULL::date, p_number text DEFAULT NULL::text)
 RETURNS documents
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  r public.documents;
  v_type_id bigint;
begin
  -- pastikan type_code valid
  select id into v_type_id
  from public.document_types
  where code = p_type_code;

  if v_type_id is null then
    raise exception 'Unknown type_code: %', p_type_code;
  end if;

  -- sudah ada? langsung return
  select * into r
  from public.documents
  where entity_type = 'payable'
    and entity_id   = p_entity_id
    and type_code   = p_type_code
  limit 1;

  if found then
    return r;
  end if;

  -- belum ada -> coba insert
  begin
    insert into public.documents(
      type_id, type_code, title, entity_type, entity_id, issue_date, number
    ) values (
      v_type_id, p_type_code,
      coalesce(p_title, p_type_code||' for PAY-'||p_entity_id),
      'payable', p_entity_id, p_issue_date, p_number
    )
    returning * into r;

    return r;

  exception when unique_violation then
    -- kalau keburu dibuat proses lain (karena partial unique index), ambil yang ada
    select * into r
    from public.documents
    where entity_type = 'payable'
      and entity_id   = p_entity_id
      and type_code   = p_type_code
    limit 1;

    return r;
  end;
end;
$function$
;

create or replace view "public"."v_ap_aging_detail" as  SELECT id,
    vendor_id,
    vendor_name,
    invoice_no,
    invoice_date,
    due_date,
    amount,
    status,
        CASE
            WHEN (status = 'paid'::text) THEN 0
            ELSE GREATEST((CURRENT_DATE - COALESCE(due_date, invoice_date)), 0)
        END AS days_past_due,
        CASE
            WHEN (status = 'paid'::text) THEN 'PAID'::text
            WHEN (CURRENT_DATE <= COALESCE(due_date, invoice_date)) THEN 'Not due'::text
            WHEN (((CURRENT_DATE - COALESCE(due_date, invoice_date)) >= 1) AND ((CURRENT_DATE - COALESCE(due_date, invoice_date)) <= 30)) THEN '1-30'::text
            WHEN (((CURRENT_DATE - COALESCE(due_date, invoice_date)) >= 31) AND ((CURRENT_DATE - COALESCE(due_date, invoice_date)) <= 60)) THEN '31-60'::text
            WHEN (((CURRENT_DATE - COALESCE(due_date, invoice_date)) >= 61) AND ((CURRENT_DATE - COALESCE(due_date, invoice_date)) <= 90)) THEN '61-90'::text
            ELSE '>90'::text
        END AS aging_bucket
   FROM payables p
  WHERE (status <> 'void'::text);


create or replace view "public"."v_ap_aging_summary" as  SELECT vendor_id,
    vendor_name,
    aging_bucket,
    sum(amount) AS total_amount,
    count(*) AS invoice_count
   FROM v_ap_aging_detail
  WHERE (status <> 'paid'::text)
  GROUP BY vendor_id, vendor_name, aging_bucket
  ORDER BY vendor_name, aging_bucket;


create or replace view "public"."v_budget_vs_payables_rab" as  WITH used AS (
         SELECT p.category_id,
            p.subcategory_id,
            sum(p.amount) AS terpakai
           FROM payables p
          WHERE ((p.source = 'RAB'::text) AND (p.status <> 'void'::text))
          GROUP BY p.category_id, p.subcategory_id
        ), bud AS (
         SELECT bl.category_id,
            bl.subcategory_id,
            sum(bl.amount) AS budget
           FROM budget_lines bl
          GROUP BY bl.category_id, bl.subcategory_id
        )
 SELECT bud.category_id,
    c.name AS category_name,
    bud.subcategory_id,
    s.name AS subcategory_name,
    COALESCE(bud.budget, (0)::numeric) AS budget,
    COALESCE(u.terpakai, (0)::numeric) AS terpakai,
    (COALESCE(bud.budget, (0)::numeric) - COALESCE(u.terpakai, (0)::numeric)) AS sisa
   FROM (((bud
     LEFT JOIN used u ON (((u.category_id = bud.category_id) AND (u.subcategory_id = bud.subcategory_id))))
     LEFT JOIN categories c ON ((c.id = bud.category_id)))
     LEFT JOIN subcategories s ON ((s.id = bud.subcategory_id)))
  ORDER BY (COALESCE(bud.budget, (0)::numeric) - COALESCE(u.terpakai, (0)::numeric)), c.name, s.name;


create or replace view "public"."v_cash_out_monthly" as  WITH base AS (
         SELECT (date_trunc('month'::text, (e.expense_date)::timestamp with time zone))::date AS period_month,
            e.origin,
            sum(e.amount) AS total_amount
           FROM expenses e
          GROUP BY ((date_trunc('month'::text, (e.expense_date)::timestamp with time zone))::date), e.origin
        )
 SELECT period_month,
    COALESCE(sum(
        CASE
            WHEN (origin = 'from_payable'::text) THEN total_amount
            ELSE NULL::numeric
        END), (0)::numeric) AS paid_from_payables,
    COALESCE(sum(
        CASE
            WHEN (origin = 'direct'::text) THEN total_amount
            ELSE NULL::numeric
        END), (0)::numeric) AS direct_expenses,
    COALESCE(sum(total_amount), (0)::numeric) AS total_cash_out
   FROM base
  GROUP BY period_month
  ORDER BY period_month;


create or replace view "public"."v_ci_contributions" as  SELECT c.id,
    c.shareholder_id,
    s.name AS shareholder_name,
    c.transfer_date,
    c.amount,
    c.bank_account_id,
    b.name AS bank_account_name,
    c.deposit_tx_ref,
    c.note,
    c.created_at,
    c.updated_at
   FROM ((capital_contributions c
     LEFT JOIN shareholders s ON ((s.id = c.shareholder_id)))
     LEFT JOIN bank_accounts b ON ((b.id = c.bank_account_id)))
  ORDER BY c.transfer_date DESC, c.id DESC;


create or replace view "public"."v_ci_outstanding" as  SELECT o.id AS obligation_id,
    o.shareholder_id,
    o.capital_injection_id,
    o.obligation_amount,
    COALESCE(sum(c.amount), (0)::numeric) AS paid,
    ((o.obligation_amount)::numeric - COALESCE(sum(c.amount), (0)::numeric)) AS outstanding
   FROM (ci_obligations o
     LEFT JOIN ci_consumptions c ON ((c.obligation_id = o.id)))
  GROUP BY o.id, o.shareholder_id, o.capital_injection_id, o.obligation_amount;


create or replace view "public"."v_ci_overall_summary" as  WITH paid_per_plan AS (
         SELECT o.capital_injection_id,
            (sum(c.amount))::bigint AS total_paid
           FROM (ci_consumptions c
             JOIN ci_obligations o ON ((o.id = c.obligation_id)))
          GROUP BY o.capital_injection_id
        ), plan_totals AS (
         SELECT ci.id,
            ci.target_total,
            COALESCE(p.total_paid, (0)::bigint) AS total_paid,
            GREATEST((ci.target_total - COALESCE(p.total_paid, (0)::bigint)), (0)::bigint) AS outstanding,
            ci.status
           FROM (capital_injections ci
             LEFT JOIN paid_per_plan p ON ((p.capital_injection_id = ci.id)))
        )
 SELECT (COALESCE(sum(target_total), (0)::numeric))::bigint AS grand_target,
    (COALESCE(sum(total_paid), (0)::numeric))::bigint AS grand_paid,
    (COALESCE(sum(outstanding), (0)::numeric))::bigint AS grand_outstanding,
    (sum(
        CASE
            WHEN (status = 'draft'::text) THEN 1
            ELSE 0
        END))::integer AS draft_count,
    (sum(
        CASE
            WHEN (status = 'active'::text) THEN 1
            ELSE 0
        END))::integer AS active_count,
    (sum(
        CASE
            WHEN (status = 'closed'::text) THEN 1
            ELSE 0
        END))::integer AS closed_count,
    (count(*))::integer AS total_periods
   FROM plan_totals;


create or replace view "public"."v_fin_balances_sources" as  WITH pt_in AS (
         SELECT COALESCE(sum(pt_topups.amount), (0)::numeric) AS val
           FROM pt_topups
        ), contrib_in AS (
         SELECT COALESCE(sum(capital_contributions.amount), (0)::numeric) AS val
           FROM capital_contributions
          WHERE (lower(COALESCE(capital_contributions.status, ''::text)) = 'posted'::text)
        ), rab_in AS (
         SELECT COALESCE(sum(rab_allocations.amount), (0)::numeric) AS val
           FROM rab_allocations
        ), petty_tx_in AS (
         SELECT COALESCE(sum(petty_cash_txns.amount), (0)::numeric) AS val
           FROM petty_cash_txns
          WHERE (petty_cash_txns.type = ANY (ARRAY['topup'::text, 'adjust_in'::text]))
        ), petty_tx_out AS (
         SELECT COALESCE(sum(petty_cash_txns.amount), (0)::numeric) AS val
           FROM petty_cash_txns
          WHERE (petty_cash_txns.type = ANY (ARRAY['settlement'::text, 'adjust_out'::text]))
        ), ex_pt_out AS (
         SELECT COALESCE(sum(expenses.amount), (0)::numeric) AS val
           FROM expenses
          WHERE ((expenses.status = 'posted'::text) AND (expenses.source = 'PT'::text) AND (NOT ((expenses.cashbox_id IS NOT NULL) AND (expenses.source = ANY (ARRAY['PT'::text, 'RAB'::text])))))
        ), ex_rab_out AS (
         SELECT COALESCE(sum(expenses.amount), (0)::numeric) AS val
           FROM expenses
          WHERE ((expenses.status = 'posted'::text) AND (expenses.source = 'RAB'::text) AND (NOT ((expenses.cashbox_id IS NOT NULL) AND (expenses.source = ANY (ARRAY['PT'::text, 'RAB'::text])))))
        ), ex_petty_spend AS (
         SELECT COALESCE(sum(expenses.amount), (0)::numeric) AS val
           FROM expenses
          WHERE ((expenses.status = 'posted'::text) AND ((expenses.source = 'PETTY'::text) OR (expenses.source = 'Petty'::text)))
        )
 SELECT 'PT'::text AS source,
    (( SELECT pt_in.val
           FROM pt_in) + ( SELECT contrib_in.val
           FROM contrib_in)) AS in_amount,
    ( SELECT ex_pt_out.val
           FROM ex_pt_out) AS out_amount,
    ((( SELECT pt_in.val
           FROM pt_in) + ( SELECT contrib_in.val
           FROM contrib_in)) - ( SELECT ex_pt_out.val
           FROM ex_pt_out)) AS balance
UNION ALL
 SELECT 'Petty'::text AS source,
    ( SELECT petty_tx_in.val
           FROM petty_tx_in) AS in_amount,
    (( SELECT ex_petty_spend.val
           FROM ex_petty_spend) + ( SELECT petty_tx_out.val
           FROM petty_tx_out)) AS out_amount,
    (( SELECT petty_tx_in.val
           FROM petty_tx_in) - (( SELECT ex_petty_spend.val
           FROM ex_petty_spend) + ( SELECT petty_tx_out.val
           FROM petty_tx_out))) AS balance
UNION ALL
 SELECT 'RAB'::text AS source,
    ( SELECT rab_in.val
           FROM rab_in) AS in_amount,
    ( SELECT ex_rab_out.val
           FROM ex_rab_out) AS out_amount,
    (( SELECT rab_in.val
           FROM rab_in) - ( SELECT ex_rab_out.val
           FROM ex_rab_out)) AS balance;


create or replace view "public"."v_nonpo_payables" as  SELECT id,
    po_id,
    vendor_id,
    vendor_name,
    invoice_no,
    invoice_date,
    due_date,
    term_no,
    term_percent,
    category_id,
    subcategory_id,
    amount,
    status,
    note,
    created_at
   FROM payables p
  WHERE ((po_id IS NULL) AND (status <> 'void'::text));


create or replace view "public"."v_payables_kpi" as  SELECT (COALESCE(sum(amount) FILTER (WHERE (status = 'unpaid'::text)), (0)::numeric))::bigint AS outstanding_amount,
    count(*) FILTER (WHERE (status = 'unpaid'::text)) AS outstanding_count,
    (COALESCE(sum(amount) FILTER (WHERE ((status = 'unpaid'::text) AND (due_date IS NOT NULL) AND (due_date < CURRENT_DATE))), (0)::numeric))::bigint AS overdue_amount,
    count(*) FILTER (WHERE ((status = 'unpaid'::text) AND (due_date IS NOT NULL) AND (due_date < CURRENT_DATE))) AS overdue_count,
    (COALESCE(sum(amount) FILTER (WHERE ((status = 'unpaid'::text) AND (due_date IS NOT NULL) AND (due_date >= CURRENT_DATE) AND (due_date <= (CURRENT_DATE + '7 days'::interval)))), (0)::numeric))::bigint AS due7_amount,
    count(*) FILTER (WHERE ((status = 'unpaid'::text) AND (due_date IS NOT NULL) AND (due_date >= CURRENT_DATE) AND (due_date <= (CURRENT_DATE + '7 days'::interval)))) AS due7_count
   FROM payables;


create or replace view "public"."v_payables_unpaid_flags" as  SELECT id,
    po_id,
    vendor_id,
    vendor_name,
    invoice_no,
    invoice_date,
    due_date,
    term_no,
    term_percent,
    category_id,
    subcategory_id,
    amount,
    status,
    note,
    created_at,
    source,
    dpp_amount,
    ppn_amount,
    tax_invoice_no,
    tax_invoice_date,
    is_ppn_creditable,
    updated_at,
    (status = 'unpaid'::text) AS is_unpaid,
    ((status = 'unpaid'::text) AND (due_date IS NOT NULL) AND (due_date < CURRENT_DATE)) AS is_overdue,
    ((status = 'unpaid'::text) AND (due_date IS NOT NULL) AND (due_date >= CURRENT_DATE) AND (due_date <= (CURRENT_DATE + '7 days'::interval))) AS is_due_soon_7d
   FROM payables p
  WHERE (status = 'unpaid'::text);


create or replace view "public"."v_po_billed" as  SELECT po.id AS po_id,
    po.po_number,
    COALESCE(sum(p.amount), (0)::numeric) AS billed_amount
   FROM (purchase_orders po
     LEFT JOIN payables p ON (((p.po_id = po.id) AND (p.status <> 'void'::text))))
  GROUP BY po.id, po.po_number;


create or replace view "public"."v_shareholder_ci_summary" as  SELECT shareholder_id,
    shareholder_name,
    obligation_total,
    obligation_ytd,
    obligation_mtd,
    allocated_total,
    allocated_ytd,
    allocated_mtd,
    contributions_total,
    contributions_ytd,
    contributions_mtd,
    credit_balance_total,
    outstanding_total,
    net_position_total,
    last_contribution_date,
    last_allocation_at,
    first_uncovered_period
   FROM f_shareholder_ci_summary() f_shareholder_ci_summary(shareholder_id, shareholder_name, obligation_total, obligation_ytd, obligation_mtd, allocated_total, allocated_ytd, allocated_mtd, contributions_total, contributions_ytd, contributions_mtd, credit_balance_total, outstanding_total, net_position_total, last_contribution_date, last_allocation_at, first_uncovered_period);


create or replace view "public"."v_vendor_billed_paid" as  WITH billed AS (
         SELECT payables.vendor_id,
            COALESCE(sum(payables.amount), (0)::numeric) AS billed
           FROM payables
          WHERE (payables.status <> 'void'::text)
          GROUP BY payables.vendor_id
        ), paid AS (
         SELECT p_1.vendor_id,
            COALESCE(sum(e.amount), (0)::numeric) AS paid
           FROM (payables p_1
             JOIN expenses e ON (((e.payable_id = p_1.id) AND (e.origin = 'from_payable'::text))))
          GROUP BY p_1.vendor_id
        )
 SELECT v.id AS vendor_id,
    v.name AS vendor_name,
    COALESCE(b.billed, (0)::numeric) AS billed,
    COALESCE(p.paid, (0)::numeric) AS paid,
    (COALESCE(b.billed, (0)::numeric) - COALESCE(p.paid, (0)::numeric)) AS outstanding
   FROM ((vendors v
     LEFT JOIN billed b ON ((b.vendor_id = v.id)))
     LEFT JOIN paid p ON ((p.vendor_id = v.id)))
  ORDER BY v.name;


CREATE OR REPLACE FUNCTION public.ci_generate_snapshot(p_plan_id bigint)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
declare
  v_target       bigint;
  v_sum_percent  numeric;
  v_last_holder  bigint;
  v_accum        bigint := 0;
  r              record;
begin
  -- ambil target plan
  select target_total
    into v_target
  from public.capital_injections
  where id = p_plan_id;

  if v_target is null then
    raise exception using message = format('Plan %s tidak ditemukan', p_plan_id);
  end if;

  -- idempotent: hapus snapshot lama (kalau ada)
  delete from public.ci_obligations
  where capital_injection_id = p_plan_id;

  -- total % kepemilikan aktif
  select sum(ownership_percent)
    into v_sum_percent
  from public.shareholders
  where active = true;

  if coalesce(v_sum_percent, 0) <= 0 then
    raise exception 'Total persen kepemilikan tidak valid (0).';
  end if;

  -- tentukan "last holder" (untuk balancing sisa pembulatan)
  select id
    into v_last_holder
  from public.shareholders
  where active = true
  order by id desc
  limit 1;

  -- loop semua holder kecuali last holder → hitung proporsional & insert
  for r in
    select id as shareholder_id, ownership_percent
    from public.shareholders
    where active = true and id <> v_last_holder
    order by id
  loop
    declare v_amt bigint;
    begin
      v_amt := round( (r.ownership_percent / v_sum_percent) * v_target )::bigint;

      insert into public.ci_obligations(
        capital_injection_id,
        shareholder_id,
        ownership_percent_snapshot,
        obligation_amount
      )
      values (p_plan_id, r.shareholder_id, r.ownership_percent, v_amt);

      v_accum := v_accum + v_amt;
    end;
  end loop;

  -- last holder terima sisa agar total = target persis
  insert into public.ci_obligations(
    capital_injection_id,
    shareholder_id,
    ownership_percent_snapshot,
    obligation_amount
  )
  select
    p_plan_id,
    s.id,
    s.ownership_percent,
    greatest(v_target - v_accum, 0)
  from public.shareholders s
  where s.id = v_last_holder and s.active = true;

end;
$function$
;

CREATE OR REPLACE FUNCTION public.set_default_pt_bank(p_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- Matikan default lain
  update bank_accounts
     set is_default = false
   where is_default is true
     and id <> p_id;

  -- Jadikan p_id default
  update bank_accounts
     set is_default = true,
         is_active  = true          -- opsional: sekalian aktifkan kalau sempat nonaktif
   where id = p_id;

  if not found then
    raise exception 'Bank account % tidak ditemukan', p_id;
  end if;
end;
$function$
;

create or replace view "public"."v_ci_plan_summary" as  SELECT id,
    period,
    target_total,
    status,
    COALESCE(( SELECT sum(c.amount) AS sum
           FROM (ci_consumptions c
             JOIN ci_obligations o ON ((o.id = c.obligation_id)))
          WHERE (o.capital_injection_id = ci.id)), (0)::numeric) AS total_paid,
    GREATEST(((target_total)::numeric - COALESCE(( SELECT sum(c2.amount) AS sum
           FROM (ci_consumptions c2
             JOIN ci_obligations o2 ON ((o2.id = c2.obligation_id)))
          WHERE (o2.capital_injection_id = ci.id)), (0)::numeric)), (0)::numeric) AS outstanding
   FROM capital_injections ci;


create or replace view "public"."v_ci_shareholder_progress" as  SELECT s.id AS shareholder_id,
    s.name AS shareholder_name,
    COALESCE(sum(o.obligation_amount), (0)::numeric) AS total_due,
    COALESCE(sum(cons.paid_amount), (0)::numeric) AS total_paid,
    (COALESCE(sum(o.obligation_amount), (0)::numeric) - COALESCE(sum(cons.paid_amount), (0)::numeric)) AS outstanding
   FROM ((shareholders s
     LEFT JOIN ci_obligations o ON ((o.shareholder_id = s.id)))
     LEFT JOIN ( SELECT ci_consumptions.obligation_id,
            sum(ci_consumptions.amount) AS paid_amount
           FROM ci_consumptions
          GROUP BY ci_consumptions.obligation_id) cons ON ((cons.obligation_id = o.id)))
  GROUP BY s.id, s.name;


create or replace view "public"."v_po_paid" as  SELECT po.id AS po_id,
    po.po_number,
    COALESCE(sum(e.amount), (0)::numeric) AS paid_amount
   FROM ((purchase_orders po
     LEFT JOIN payables p ON ((p.po_id = po.id)))
     LEFT JOIN expenses e ON (((e.payable_id = p.id) AND (e.origin = 'from_payable'::text))))
  GROUP BY po.id, po.po_number;


create or replace view "public"."v_pt_inflows_list" as  SELECT cc.id,
    cc.transfer_date,
    sh.name AS shareholder_name,
    cc.amount,
    ba.name AS bank_account_name,
    cc.deposit_tx_ref,
    array_remove(array_agg(DISTINCT ci.period) FILTER (WHERE (ci.id IS NOT NULL)), NULL::text) AS related_periods
   FROM (((((capital_contributions cc
     LEFT JOIN ci_consumptions c ON ((c.contribution_id = cc.id)))
     LEFT JOIN ci_obligations o ON ((o.id = c.obligation_id)))
     LEFT JOIN capital_injections ci ON ((ci.id = o.capital_injection_id)))
     LEFT JOIN shareholders sh ON ((sh.id = cc.shareholder_id)))
     LEFT JOIN bank_accounts ba ON ((ba.id = cc.bank_account_id)))
  GROUP BY cc.id, cc.transfer_date, sh.name, cc.amount, ba.name, cc.deposit_tx_ref;


create or replace view "public"."v_po_progress" as  SELECT po.id AS po_id,
    po.po_number,
    (po.total)::numeric AS po_total,
    COALESCE(b.billed_amount, (0)::numeric) AS billed,
    COALESCE(pd.paid_amount, (0)::numeric) AS paid,
    ((po.total)::numeric - COALESCE(pd.paid_amount, (0)::numeric)) AS outstanding
   FROM ((purchase_orders po
     LEFT JOIN v_po_billed b ON ((b.po_id = po.id)))
     LEFT JOIN v_po_paid pd ON ((pd.po_id = po.id)));


grant delete on table "public"."app_user_roles" to "anon";

grant insert on table "public"."app_user_roles" to "anon";

grant references on table "public"."app_user_roles" to "anon";

grant select on table "public"."app_user_roles" to "anon";

grant trigger on table "public"."app_user_roles" to "anon";

grant truncate on table "public"."app_user_roles" to "anon";

grant update on table "public"."app_user_roles" to "anon";

grant delete on table "public"."app_user_roles" to "authenticated";

grant insert on table "public"."app_user_roles" to "authenticated";

grant references on table "public"."app_user_roles" to "authenticated";

grant select on table "public"."app_user_roles" to "authenticated";

grant trigger on table "public"."app_user_roles" to "authenticated";

grant truncate on table "public"."app_user_roles" to "authenticated";

grant update on table "public"."app_user_roles" to "authenticated";

grant delete on table "public"."app_user_roles" to "service_role";

grant insert on table "public"."app_user_roles" to "service_role";

grant references on table "public"."app_user_roles" to "service_role";

grant select on table "public"."app_user_roles" to "service_role";

grant trigger on table "public"."app_user_roles" to "service_role";

grant truncate on table "public"."app_user_roles" to "service_role";

grant update on table "public"."app_user_roles" to "service_role";

grant delete on table "public"."ci_consumptions" to "anon";

grant insert on table "public"."ci_consumptions" to "anon";

grant references on table "public"."ci_consumptions" to "anon";

grant select on table "public"."ci_consumptions" to "anon";

grant trigger on table "public"."ci_consumptions" to "anon";

grant truncate on table "public"."ci_consumptions" to "anon";

grant update on table "public"."ci_consumptions" to "anon";

grant delete on table "public"."ci_consumptions" to "authenticated";

grant insert on table "public"."ci_consumptions" to "authenticated";

grant references on table "public"."ci_consumptions" to "authenticated";

grant select on table "public"."ci_consumptions" to "authenticated";

grant trigger on table "public"."ci_consumptions" to "authenticated";

grant truncate on table "public"."ci_consumptions" to "authenticated";

grant update on table "public"."ci_consumptions" to "authenticated";

grant delete on table "public"."ci_consumptions" to "service_role";

grant insert on table "public"."ci_consumptions" to "service_role";

grant references on table "public"."ci_consumptions" to "service_role";

grant select on table "public"."ci_consumptions" to "service_role";

grant trigger on table "public"."ci_consumptions" to "service_role";

grant truncate on table "public"."ci_consumptions" to "service_role";

grant update on table "public"."ci_consumptions" to "service_role";

grant delete on table "public"."document_types" to "anon";

grant insert on table "public"."document_types" to "anon";

grant references on table "public"."document_types" to "anon";

grant select on table "public"."document_types" to "anon";

grant trigger on table "public"."document_types" to "anon";

grant truncate on table "public"."document_types" to "anon";

grant update on table "public"."document_types" to "anon";

grant delete on table "public"."document_types" to "authenticated";

grant insert on table "public"."document_types" to "authenticated";

grant references on table "public"."document_types" to "authenticated";

grant select on table "public"."document_types" to "authenticated";

grant trigger on table "public"."document_types" to "authenticated";

grant truncate on table "public"."document_types" to "authenticated";

grant update on table "public"."document_types" to "authenticated";

grant delete on table "public"."document_types" to "service_role";

grant insert on table "public"."document_types" to "service_role";

grant references on table "public"."document_types" to "service_role";

grant select on table "public"."document_types" to "service_role";

grant trigger on table "public"."document_types" to "service_role";

grant truncate on table "public"."document_types" to "service_role";

grant update on table "public"."document_types" to "service_role";

grant delete on table "public"."document_versions" to "anon";

grant insert on table "public"."document_versions" to "anon";

grant references on table "public"."document_versions" to "anon";

grant select on table "public"."document_versions" to "anon";

grant trigger on table "public"."document_versions" to "anon";

grant truncate on table "public"."document_versions" to "anon";

grant update on table "public"."document_versions" to "anon";

grant delete on table "public"."document_versions" to "authenticated";

grant insert on table "public"."document_versions" to "authenticated";

grant references on table "public"."document_versions" to "authenticated";

grant select on table "public"."document_versions" to "authenticated";

grant trigger on table "public"."document_versions" to "authenticated";

grant truncate on table "public"."document_versions" to "authenticated";

grant update on table "public"."document_versions" to "authenticated";

grant delete on table "public"."document_versions" to "service_role";

grant insert on table "public"."document_versions" to "service_role";

grant references on table "public"."document_versions" to "service_role";

grant select on table "public"."document_versions" to "service_role";

grant trigger on table "public"."document_versions" to "service_role";

grant truncate on table "public"."document_versions" to "service_role";

grant update on table "public"."document_versions" to "service_role";

grant delete on table "public"."documents" to "anon";

grant insert on table "public"."documents" to "anon";

grant references on table "public"."documents" to "anon";

grant select on table "public"."documents" to "anon";

grant trigger on table "public"."documents" to "anon";

grant truncate on table "public"."documents" to "anon";

grant update on table "public"."documents" to "anon";

grant delete on table "public"."documents" to "authenticated";

grant insert on table "public"."documents" to "authenticated";

grant references on table "public"."documents" to "authenticated";

grant select on table "public"."documents" to "authenticated";

grant trigger on table "public"."documents" to "authenticated";

grant truncate on table "public"."documents" to "authenticated";

grant update on table "public"."documents" to "authenticated";

grant delete on table "public"."documents" to "service_role";

grant insert on table "public"."documents" to "service_role";

grant references on table "public"."documents" to "service_role";

grant select on table "public"."documents" to "service_role";

grant trigger on table "public"."documents" to "service_role";

grant truncate on table "public"."documents" to "service_role";

grant update on table "public"."documents" to "service_role";

grant delete on table "public"."payables" to "anon";

grant insert on table "public"."payables" to "anon";

grant references on table "public"."payables" to "anon";

grant select on table "public"."payables" to "anon";

grant trigger on table "public"."payables" to "anon";

grant truncate on table "public"."payables" to "anon";

grant update on table "public"."payables" to "anon";

grant delete on table "public"."payables" to "authenticated";

grant insert on table "public"."payables" to "authenticated";

grant references on table "public"."payables" to "authenticated";

grant select on table "public"."payables" to "authenticated";

grant trigger on table "public"."payables" to "authenticated";

grant truncate on table "public"."payables" to "authenticated";

grant update on table "public"."payables" to "authenticated";

grant delete on table "public"."payables" to "service_role";

grant insert on table "public"."payables" to "service_role";

grant references on table "public"."payables" to "service_role";

grant select on table "public"."payables" to "service_role";

grant trigger on table "public"."payables" to "service_role";

grant truncate on table "public"."payables" to "service_role";

grant update on table "public"."payables" to "service_role";


  create policy "bank_accounts_select_auth"
  on "public"."bank_accounts"
  as permissive
  for select
  to authenticated
using (true);



  create policy "read_doc_versions_admin"
  on "public"."document_versions"
  as permissive
  for select
  to public
using (has_role_current(auth.uid(), ARRAY['admin'::text, 'superadmin'::text]));



  create policy "update_doc_versions_admin"
  on "public"."document_versions"
  as permissive
  for update
  to public
using (has_role_current(auth.uid(), ARRAY['admin'::text, 'superadmin'::text]));



  create policy "write_doc_versions_admin"
  on "public"."document_versions"
  as permissive
  for insert
  to public
with check (has_role_current(auth.uid(), ARRAY['admin'::text, 'superadmin'::text]));



  create policy "insert_documents_admin"
  on "public"."documents"
  as permissive
  for insert
  to public
with check (has_role_current(auth.uid(), ARRAY['admin'::text, 'superadmin'::text]));



  create policy "read_documents_all"
  on "public"."documents"
  as permissive
  for select
  to public
using (has_role_current(auth.uid(), ARRAY['viewer'::text, 'admin'::text, 'superadmin'::text]));



  create policy "update_documents_admin"
  on "public"."documents"
  as permissive
  for update
  to public
using (has_role_current(auth.uid(), ARRAY['admin'::text, 'superadmin'::text]));



  create policy "payables_select_all"
  on "public"."payables"
  as permissive
  for select
  to public
using (true);


CREATE TRIGGER trg_cc_updated_at BEFORE UPDATE ON public.capital_contributions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER after_insert_expense_mark_paid AFTER INSERT ON public.expenses FOR EACH ROW EXECUTE FUNCTION fn_after_insert_expense_mark_paid();

CREATE TRIGGER after_update_expense_void_reset_payable AFTER UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION fn_after_update_expense_void_reset_payable();

CREATE TRIGGER tr_enforce_expense_origin BEFORE INSERT OR UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION enforce_expense_origin_from_payable();

CREATE TRIGGER trg_expenses_link_payable BEFORE INSERT OR UPDATE OF invoice_no, vendor_id ON public.expenses FOR EACH ROW EXECUTE FUNCTION link_expense_to_payable_trg();

CREATE TRIGGER trg_expenses_recalc AFTER INSERT OR DELETE OR UPDATE OF amount, status, payable_id ON public.expenses FOR EACH ROW EXECUTE FUNCTION after_expense_change_recalc();

CREATE TRIGGER trg_expenses_set_origin BEFORE INSERT OR UPDATE OF payable_id ON public.expenses FOR EACH ROW EXECUTE FUNCTION set_expense_origin();

CREATE TRIGGER trg_link_expense_to_payable BEFORE INSERT OR UPDATE OF vendor_id, invoice_no, payable_id ON public.expenses FOR EACH ROW EXECUTE FUNCTION fn_link_expense_to_payable();

CREATE TRIGGER trg_payables_updated_at BEFORE UPDATE ON public.payables FOR EACH ROW EXECUTE FUNCTION set_updated_at();


