create sequence "public"."bank_accounts_id_seq";

create sequence "public"."budget_lines_id_seq";

create sequence "public"."capital_contributions_id_seq";

create sequence "public"."capital_injections_id_seq";

create sequence "public"."categories_id_seq";

create sequence "public"."ci_obligations_id_seq";

create sequence "public"."expenses_id_seq";

create sequence "public"."grn_items_id_seq";

create sequence "public"."grns_id_seq";

create sequence "public"."petty_cash_boxes_id_seq";

create sequence "public"."petty_cash_txns_id_seq";

create sequence "public"."po_expense_allocations_id_seq";

create sequence "public"."po_items_id_seq";

create sequence "public"."pt_topups_id_seq";

create sequence "public"."purchase_orders_id_seq";

create sequence "public"."rab_allocations_id_seq";

create sequence "public"."roles_id_seq";

create sequence "public"."shareholders_id_seq";

create sequence "public"."subcategories_id_seq";

create sequence "public"."user_roles_id_seq";

create sequence "public"."vendors_id_seq";


  create table "public"."bank_accounts" (
    "id" bigint not null default nextval('bank_accounts_id_seq'::regclass),
    "name" text not null,
    "created_at" timestamp with time zone not null default now(),
    "bank_name" text,
    "account_name" text,
    "account_number" text,
    "is_active" boolean not null default true,
    "is_default" boolean not null default false,
    "note" text
      );


alter table "public"."bank_accounts" enable row level security;


  create table "public"."budget_lines" (
    "id" bigint not null default nextval('budget_lines_id_seq'::regclass),
    "category_id" bigint not null,
    "subcategory_id" bigint not null,
    "description" text,
    "amount" numeric(18,2) not null,
    "created_at" timestamp with time zone default now()
      );



  create table "public"."capital_contributions" (
    "id" bigint not null default nextval('capital_contributions_id_seq'::regclass),
    "capital_injection_id" bigint not null,
    "shareholder_id" bigint not null,
    "amount" bigint not null,
    "transfer_date" date not null,
    "note" text,
    "status" text not null default 'draft'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "bank_account_id" bigint,
    "deposit_tx_ref" text
      );



  create table "public"."capital_injections" (
    "id" bigint not null default nextval('capital_injections_id_seq'::regclass),
    "period" text not null,
    "target_total" bigint not null,
    "note" text,
    "status" text not null default 'draft'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );



  create table "public"."categories" (
    "id" bigint not null default nextval('categories_id_seq'::regclass),
    "name" text not null,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."categories" enable row level security;


  create table "public"."ci_obligations" (
    "id" bigint not null default nextval('ci_obligations_id_seq'::regclass),
    "capital_injection_id" bigint not null,
    "shareholder_id" bigint not null,
    "ownership_percent_snapshot" numeric(5,2) not null,
    "obligation_amount" bigint not null,
    "override_reason" text,
    "created_at" timestamp with time zone not null default now()
      );



  create table "public"."expenses" (
    "id" bigint not null default nextval('expenses_id_seq'::regclass),
    "source" text not null default 'RAB'::text,
    "shareholder_id" bigint,
    "expense_date" date not null,
    "period_month" date generated always as (make_date((EXTRACT(year FROM expense_date))::integer, (EXTRACT(month FROM expense_date))::integer, 1)) stored,
    "amount" bigint not null,
    "vendor_id" bigint not null,
    "vendor_name" text,
    "invoice_no" text,
    "note" text,
    "category_id" bigint not null,
    "subcategory_id" bigint not null,
    "status" text not null default 'draft'::text,
    "account_id" bigint,
    "cashbox_id" bigint,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."expenses" enable row level security;


  create table "public"."grn_items" (
    "id" bigint not null default nextval('grn_items_id_seq'::regclass),
    "grn_id" bigint not null,
    "po_item_id" bigint,
    "description" text,
    "uom" text,
    "qty_input" numeric(18,3) not null,
    "qty_matched" numeric(18,3) not null default 0,
    "qty_overage" numeric(18,3) not null default 0,
    "qty_received" numeric(18,3) generated always as ((qty_matched + qty_overage)) stored,
    "created_at" timestamp with time zone default now(),
    "note" text
      );


alter table "public"."grn_items" enable row level security;


  create table "public"."grns" (
    "id" bigint not null default nextval('grns_id_seq'::regclass),
    "grn_number" text not null,
    "date_received" date not null default CURRENT_DATE,
    "purchase_order_id" bigint,
    "vendor_id" bigint not null,
    "vendor_name" text,
    "ref_no" text,
    "note" text,
    "status" text not null default 'draft'::text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."grns" enable row level security;


  create table "public"."petty_cash_boxes" (
    "id" bigint not null default nextval('petty_cash_boxes_id_seq'::regclass),
    "name" text not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."petty_cash_boxes" enable row level security;


  create table "public"."petty_cash_txns" (
    "id" bigint not null default nextval('petty_cash_txns_id_seq'::regclass),
    "cashbox_id" bigint not null,
    "txn_date" date not null,
    "type" text not null,
    "amount" bigint not null,
    "bank_account_id" bigint,
    "ref_no" text,
    "note" text,
    "created_at" timestamp with time zone not null default now(),
    "expense_id" bigint
      );


alter table "public"."petty_cash_txns" enable row level security;


  create table "public"."po_expense_allocations" (
    "id" bigint not null default nextval('po_expense_allocations_id_seq'::regclass),
    "purchase_order_id" bigint not null,
    "expense_id" bigint not null,
    "amount" numeric not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."po_expense_allocations" enable row level security;


  create table "public"."po_items" (
    "id" bigint not null default nextval('po_items_id_seq'::regclass),
    "purchase_order_id" bigint not null,
    "description" text not null,
    "qty" numeric(18,2) not null default 1,
    "unit" text,
    "unit_price" numeric(18,2) not null default 0,
    "total" numeric(18,2) generated always as ((qty * unit_price)) stored,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "qty_received" numeric not null default 0,
    "qty_remaining" numeric generated always as (GREATEST((qty - qty_received), (0)::numeric)) stored
      );


alter table "public"."po_items" enable row level security;


  create table "public"."pt_topups" (
    "id" bigint not null default nextval('pt_topups_id_seq'::regclass),
    "account_id" bigint not null,
    "topup_date" date not null,
    "amount" bigint not null,
    "inflow_type" text not null default 'other'::text,
    "source_doc" text,
    "counterparty" text,
    "note" text,
    "created_at" timestamp with time zone not null default now()
      );



  create table "public"."purchase_orders" (
    "id" bigint not null default nextval('purchase_orders_id_seq'::regclass),
    "po_number" text not null,
    "vendor_id" bigint,
    "po_date" date not null default CURRENT_DATE,
    "delivery_date" date,
    "status" text not null default 'draft'::text,
    "is_tax_included" boolean not null default true,
    "tax_percent" numeric(5,2) not null default 11.00,
    "total" numeric(18,2) default 0,
    "note" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "term_code" text,
    "term_days" integer,
    "due_date_override" date
      );


alter table "public"."purchase_orders" enable row level security;


  create table "public"."rab_allocations" (
    "id" bigint not null default nextval('rab_allocations_id_seq'::regclass),
    "shareholder_id" bigint not null,
    "alloc_date" date not null,
    "amount" bigint not null,
    "note" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );



  create table "public"."roles" (
    "id" bigint not null default nextval('roles_id_seq'::regclass),
    "code" text not null,
    "name" text not null
      );



  create table "public"."shareholders" (
    "id" bigint not null default nextval('shareholders_id_seq'::regclass),
    "name" text not null,
    "ownership_percent" numeric(5,2) not null,
    "email" text,
    "phone" text,
    "note" text,
    "active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."shareholders" enable row level security;


  create table "public"."subcategories" (
    "id" bigint not null default nextval('subcategories_id_seq'::regclass),
    "category_id" bigint not null,
    "name" text not null,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."subcategories" enable row level security;


  create table "public"."user_profiles" (
    "user_id" uuid not null,
    "full_name" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."user_profiles" enable row level security;


  create table "public"."user_roles" (
    "id" bigint not null default nextval('user_roles_id_seq'::regclass),
    "user_id" uuid not null,
    "is_active" boolean not null default true,
    "created_at" timestamp with time zone not null default now(),
    "role_id" bigint not null
      );


alter table "public"."user_roles" enable row level security;


  create table "public"."vendors" (
    "id" bigint not null default nextval('vendors_id_seq'::regclass),
    "name" text not null,
    "email" text,
    "phone" text,
    "address" text,
    "created_at" timestamp with time zone default now(),
    "npwp" text,
    "payment_type" text not null default 'CBD'::text,
    "term_days" integer,
    "payment_term_label" text,
    "created_by" uuid,
    "updated_by" uuid,
    "updated_at" timestamp with time zone
      );


alter table "public"."vendors" enable row level security;

alter sequence "public"."bank_accounts_id_seq" owned by "public"."bank_accounts"."id";

alter sequence "public"."budget_lines_id_seq" owned by "public"."budget_lines"."id";

alter sequence "public"."capital_contributions_id_seq" owned by "public"."capital_contributions"."id";

alter sequence "public"."capital_injections_id_seq" owned by "public"."capital_injections"."id";

alter sequence "public"."categories_id_seq" owned by "public"."categories"."id";

alter sequence "public"."ci_obligations_id_seq" owned by "public"."ci_obligations"."id";

alter sequence "public"."expenses_id_seq" owned by "public"."expenses"."id";

alter sequence "public"."grn_items_id_seq" owned by "public"."grn_items"."id";

alter sequence "public"."grns_id_seq" owned by "public"."grns"."id";

alter sequence "public"."petty_cash_boxes_id_seq" owned by "public"."petty_cash_boxes"."id";

alter sequence "public"."petty_cash_txns_id_seq" owned by "public"."petty_cash_txns"."id";

alter sequence "public"."po_expense_allocations_id_seq" owned by "public"."po_expense_allocations"."id";

alter sequence "public"."po_items_id_seq" owned by "public"."po_items"."id";

alter sequence "public"."pt_topups_id_seq" owned by "public"."pt_topups"."id";

alter sequence "public"."purchase_orders_id_seq" owned by "public"."purchase_orders"."id";

alter sequence "public"."rab_allocations_id_seq" owned by "public"."rab_allocations"."id";

alter sequence "public"."roles_id_seq" owned by "public"."roles"."id";

alter sequence "public"."shareholders_id_seq" owned by "public"."shareholders"."id";

alter sequence "public"."subcategories_id_seq" owned by "public"."subcategories"."id";

alter sequence "public"."user_roles_id_seq" owned by "public"."user_roles"."id";

alter sequence "public"."vendors_id_seq" owned by "public"."vendors"."id";

CREATE UNIQUE INDEX bank_accounts_pkey ON public.bank_accounts USING btree (id);

CREATE UNIQUE INDEX budget_lines_pkey ON public.budget_lines USING btree (id);

CREATE UNIQUE INDEX capital_contributions_pkey ON public.capital_contributions USING btree (id);

CREATE UNIQUE INDEX capital_injections_pkey ON public.capital_injections USING btree (id);

CREATE UNIQUE INDEX categories_name_key ON public.categories USING btree (name);

CREATE UNIQUE INDEX categories_pkey ON public.categories USING btree (id);

CREATE UNIQUE INDEX ci_obligations_capital_injection_id_shareholder_id_key ON public.ci_obligations USING btree (capital_injection_id, shareholder_id);

CREATE UNIQUE INDEX ci_obligations_pkey ON public.ci_obligations USING btree (id);

CREATE UNIQUE INDEX ci_obligations_unique_plan_holder ON public.ci_obligations USING btree (capital_injection_id, shareholder_id);

CREATE UNIQUE INDEX expenses_pkey ON public.expenses USING btree (id);

CREATE INDEX expenses_rab_idx ON public.expenses USING btree (shareholder_id, source);

CREATE UNIQUE INDEX grn_items_pkey ON public.grn_items USING btree (id);

CREATE UNIQUE INDEX grns_pkey ON public.grns USING btree (id);

CREATE INDEX idx_bl_cat_sub ON public.budget_lines USING btree (category_id, subcategory_id);

CREATE INDEX idx_budget_lines_cat_sub ON public.budget_lines USING btree (category_id, subcategory_id);

CREATE INDEX idx_budget_lines_subcat ON public.budget_lines USING btree (subcategory_id);

CREATE INDEX idx_cc_plan ON public.capital_contributions USING btree (capital_injection_id);

CREATE INDEX idx_cc_shareholder ON public.capital_contributions USING btree (shareholder_id);

CREATE INDEX idx_cc_status ON public.capital_contributions USING btree (status);

CREATE INDEX idx_ci_bank_account ON public.capital_contributions USING btree (bank_account_id);

CREATE INDEX idx_ci_period ON public.capital_injections USING btree (period);

CREATE INDEX idx_exp_src_status ON public.expenses USING btree (source, status);

CREATE INDEX idx_exp_status ON public.expenses USING btree (status);

CREATE INDEX idx_expenses_cat_sub ON public.expenses USING btree (category_id, subcategory_id);

CREATE INDEX idx_expenses_cat_sub_date ON public.expenses USING btree (category_id, subcategory_id, expense_date DESC, id DESC);

CREATE INDEX idx_expenses_date_id_desc ON public.expenses USING btree (expense_date DESC, id DESC);

CREATE INDEX idx_expenses_period ON public.expenses USING btree (period_month);

CREATE INDEX idx_expenses_petty ON public.expenses USING btree (source, status, cashbox_id, expense_date);

CREATE INDEX idx_expenses_sh_month ON public.expenses USING btree (shareholder_id, period_month);

CREATE INDEX idx_expenses_shareholder_date ON public.expenses USING btree (shareholder_id, expense_date DESC, id DESC);

CREATE INDEX idx_expenses_source_date ON public.expenses USING btree (source, expense_date DESC, id DESC);

CREATE INDEX idx_expenses_status ON public.expenses USING btree (status);

CREATE INDEX idx_expenses_status_date ON public.expenses USING btree (status, expense_date DESC, id DESC);

CREATE INDEX idx_expenses_subcat ON public.expenses USING btree (subcategory_id);

CREATE INDEX idx_expenses_vendor ON public.expenses USING btree (vendor_id);

CREATE INDEX idx_expenses_vendor_date ON public.expenses USING btree (vendor_id, expense_date DESC, id DESC);

CREATE INDEX idx_grn_items_grn ON public.grn_items USING btree (grn_id);

CREATE INDEX idx_grn_items_poitem ON public.grn_items USING btree (po_item_id);

CREATE INDEX idx_grns_date ON public.grns USING btree (date_received);

CREATE INDEX idx_grns_po ON public.grns USING btree (purchase_order_id);

CREATE INDEX idx_grns_vendor ON public.grns USING btree (vendor_id);

CREATE INDEX idx_petty_txn_box_date ON public.petty_cash_txns USING btree (cashbox_id, txn_date);

CREATE INDEX idx_po_date ON public.purchase_orders USING btree (po_date);

CREATE INDEX idx_po_items_po_id ON public.po_items USING btree (purchase_order_id);

CREATE INDEX idx_po_status ON public.purchase_orders USING btree (status);

CREATE INDEX idx_po_vendor ON public.purchase_orders USING btree (vendor_id);

CREATE INDEX idx_poea_exp ON public.po_expense_allocations USING btree (expense_id);

CREATE INDEX idx_poea_po ON public.po_expense_allocations USING btree (purchase_order_id);

CREATE INDEX idx_pt_topups_account ON public.pt_topups USING btree (account_id);

CREATE INDEX idx_pt_topups_date ON public.pt_topups USING btree (topup_date);

CREATE INDEX idx_rab_alloc_month ON public.rab_allocations USING btree (alloc_date);

CREATE INDEX idx_rab_alloc_sh_month ON public.rab_allocations USING btree (shareholder_id, alloc_date);

CREATE INDEX idx_shareholders_active_name ON public.shareholders USING btree (active, name);

CREATE INDEX idx_user_roles_user ON public.user_roles USING btree (user_id);

CREATE INDEX idx_vendors_name ON public.vendors USING btree (name);

CREATE UNIQUE INDEX petty_cash_boxes_pkey ON public.petty_cash_boxes USING btree (id);

CREATE UNIQUE INDEX petty_cash_txns_pkey ON public.petty_cash_txns USING btree (id);

CREATE UNIQUE INDEX po_expense_allocations_pkey ON public.po_expense_allocations USING btree (id);

CREATE UNIQUE INDEX po_items_pkey ON public.po_items USING btree (id);

CREATE UNIQUE INDEX pt_topups_pkey ON public.pt_topups USING btree (id);

CREATE UNIQUE INDEX purchase_orders_pkey ON public.purchase_orders USING btree (id);

CREATE UNIQUE INDEX purchase_orders_po_number_key ON public.purchase_orders USING btree (po_number);

CREATE UNIQUE INDEX purchase_orders_vendor_id_unique ON public.purchase_orders USING btree (vendor_id);

CREATE UNIQUE INDEX rab_allocations_pkey ON public.rab_allocations USING btree (id);

CREATE UNIQUE INDEX rab_allocations_shareholder_id_alloc_date_key ON public.rab_allocations USING btree (shareholder_id, alloc_date);

CREATE INDEX rab_allocations_shareholder_idx ON public.rab_allocations USING btree (shareholder_id);

CREATE UNIQUE INDEX roles_code_key ON public.roles USING btree (code);

CREATE UNIQUE INDEX roles_pkey ON public.roles USING btree (id);

CREATE UNIQUE INDEX shareholders_email_key ON public.shareholders USING btree (email);

CREATE UNIQUE INDEX shareholders_pkey ON public.shareholders USING btree (id);

CREATE UNIQUE INDEX subcategories_category_id_name_key ON public.subcategories USING btree (category_id, name);

CREATE UNIQUE INDEX subcategories_pkey ON public.subcategories USING btree (id);

CREATE UNIQUE INDEX uq_bank_accounts_default_true ON public.bank_accounts USING btree ((
CASE
    WHEN is_default THEN 1
    ELSE NULL::integer
END));

CREATE UNIQUE INDEX user_profiles_pkey ON public.user_profiles USING btree (user_id);

CREATE UNIQUE INDEX user_roles_pkey ON public.user_roles USING btree (id);

CREATE UNIQUE INDEX user_roles_user_role_unique ON public.user_roles USING btree (user_id, role_id);

CREATE UNIQUE INDEX vendors_name_key ON public.vendors USING btree (name);

CREATE UNIQUE INDEX vendors_pkey ON public.vendors USING btree (id);

alter table "public"."bank_accounts" add constraint "bank_accounts_pkey" PRIMARY KEY using index "bank_accounts_pkey";

alter table "public"."budget_lines" add constraint "budget_lines_pkey" PRIMARY KEY using index "budget_lines_pkey";

alter table "public"."capital_contributions" add constraint "capital_contributions_pkey" PRIMARY KEY using index "capital_contributions_pkey";

alter table "public"."capital_injections" add constraint "capital_injections_pkey" PRIMARY KEY using index "capital_injections_pkey";

alter table "public"."categories" add constraint "categories_pkey" PRIMARY KEY using index "categories_pkey";

alter table "public"."ci_obligations" add constraint "ci_obligations_pkey" PRIMARY KEY using index "ci_obligations_pkey";

alter table "public"."expenses" add constraint "expenses_pkey" PRIMARY KEY using index "expenses_pkey";

alter table "public"."grn_items" add constraint "grn_items_pkey" PRIMARY KEY using index "grn_items_pkey";

alter table "public"."grns" add constraint "grns_pkey" PRIMARY KEY using index "grns_pkey";

alter table "public"."petty_cash_boxes" add constraint "petty_cash_boxes_pkey" PRIMARY KEY using index "petty_cash_boxes_pkey";

alter table "public"."petty_cash_txns" add constraint "petty_cash_txns_pkey" PRIMARY KEY using index "petty_cash_txns_pkey";

alter table "public"."po_expense_allocations" add constraint "po_expense_allocations_pkey" PRIMARY KEY using index "po_expense_allocations_pkey";

alter table "public"."po_items" add constraint "po_items_pkey" PRIMARY KEY using index "po_items_pkey";

alter table "public"."pt_topups" add constraint "pt_topups_pkey" PRIMARY KEY using index "pt_topups_pkey";

alter table "public"."purchase_orders" add constraint "purchase_orders_pkey" PRIMARY KEY using index "purchase_orders_pkey";

alter table "public"."rab_allocations" add constraint "rab_allocations_pkey" PRIMARY KEY using index "rab_allocations_pkey";

alter table "public"."roles" add constraint "roles_pkey" PRIMARY KEY using index "roles_pkey";

alter table "public"."shareholders" add constraint "shareholders_pkey" PRIMARY KEY using index "shareholders_pkey";

alter table "public"."subcategories" add constraint "subcategories_pkey" PRIMARY KEY using index "subcategories_pkey";

alter table "public"."user_profiles" add constraint "user_profiles_pkey" PRIMARY KEY using index "user_profiles_pkey";

alter table "public"."user_roles" add constraint "user_roles_pkey" PRIMARY KEY using index "user_roles_pkey";

alter table "public"."vendors" add constraint "vendors_pkey" PRIMARY KEY using index "vendors_pkey";

alter table "public"."budget_lines" add constraint "budget_lines_amount_check" CHECK ((amount >= (0)::numeric)) not valid;

alter table "public"."budget_lines" validate constraint "budget_lines_amount_check";

alter table "public"."budget_lines" add constraint "budget_lines_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT not valid;

alter table "public"."budget_lines" validate constraint "budget_lines_category_id_fkey";

alter table "public"."budget_lines" add constraint "budget_lines_subcategory_id_fkey" FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE RESTRICT not valid;

alter table "public"."budget_lines" validate constraint "budget_lines_subcategory_id_fkey";

alter table "public"."capital_contributions" add constraint "capital_contributions_amount_check" CHECK ((amount > 0)) not valid;

alter table "public"."capital_contributions" validate constraint "capital_contributions_amount_check";

alter table "public"."capital_contributions" add constraint "capital_contributions_bank_account_id_fkey" FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) not valid;

alter table "public"."capital_contributions" validate constraint "capital_contributions_bank_account_id_fkey";

alter table "public"."capital_contributions" add constraint "capital_contributions_capital_injection_id_fkey" FOREIGN KEY (capital_injection_id) REFERENCES capital_injections(id) ON DELETE CASCADE not valid;

alter table "public"."capital_contributions" validate constraint "capital_contributions_capital_injection_id_fkey";

alter table "public"."capital_contributions" add constraint "capital_contributions_posted_need_bank" CHECK (((status <> 'posted'::text) OR (bank_account_id IS NOT NULL))) not valid;

alter table "public"."capital_contributions" validate constraint "capital_contributions_posted_need_bank";

alter table "public"."capital_contributions" add constraint "capital_contributions_shareholder_id_fkey" FOREIGN KEY (shareholder_id) REFERENCES shareholders(id) ON DELETE RESTRICT not valid;

alter table "public"."capital_contributions" validate constraint "capital_contributions_shareholder_id_fkey";

alter table "public"."capital_injections" add constraint "capital_injections_target_total_check" CHECK ((target_total >= 0)) not valid;

alter table "public"."capital_injections" validate constraint "capital_injections_target_total_check";

alter table "public"."categories" add constraint "categories_name_key" UNIQUE using index "categories_name_key";

alter table "public"."ci_obligations" add constraint "ci_obligations_capital_injection_id_fkey" FOREIGN KEY (capital_injection_id) REFERENCES capital_injections(id) ON DELETE CASCADE not valid;

alter table "public"."ci_obligations" validate constraint "ci_obligations_capital_injection_id_fkey";

alter table "public"."ci_obligations" add constraint "ci_obligations_capital_injection_id_shareholder_id_key" UNIQUE using index "ci_obligations_capital_injection_id_shareholder_id_key";

alter table "public"."ci_obligations" add constraint "ci_obligations_shareholder_id_fkey" FOREIGN KEY (shareholder_id) REFERENCES shareholders(id) not valid;

alter table "public"."ci_obligations" validate constraint "ci_obligations_shareholder_id_fkey";

alter table "public"."ci_obligations" add constraint "ci_obligations_unique_plan_holder" UNIQUE using index "ci_obligations_unique_plan_holder";

alter table "public"."expenses" add constraint "expenses_account_id_fkey" FOREIGN KEY (account_id) REFERENCES bank_accounts(id) ON DELETE RESTRICT not valid;

alter table "public"."expenses" validate constraint "expenses_account_id_fkey";

alter table "public"."expenses" add constraint "expenses_amount_check" CHECK ((amount > 0)) not valid;

alter table "public"."expenses" validate constraint "expenses_amount_check";

alter table "public"."expenses" add constraint "expenses_cashbox_id_fkey" FOREIGN KEY (cashbox_id) REFERENCES petty_cash_boxes(id) ON DELETE RESTRICT not valid;

alter table "public"."expenses" validate constraint "expenses_cashbox_id_fkey";

alter table "public"."expenses" add constraint "expenses_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT not valid;

alter table "public"."expenses" validate constraint "expenses_category_id_fkey";

alter table "public"."expenses" add constraint "expenses_shareholder_id_fkey" FOREIGN KEY (shareholder_id) REFERENCES shareholders(id) ON DELETE RESTRICT not valid;

alter table "public"."expenses" validate constraint "expenses_shareholder_id_fkey";

alter table "public"."expenses" add constraint "expenses_source_check" CHECK ((source = ANY (ARRAY['RAB'::text, 'PT'::text, 'PETTY'::text]))) not valid;

alter table "public"."expenses" validate constraint "expenses_source_check";

alter table "public"."expenses" add constraint "expenses_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'posted'::text, 'void'::text]))) not valid;

alter table "public"."expenses" validate constraint "expenses_status_check";

alter table "public"."expenses" add constraint "expenses_subcategory_id_fkey" FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE RESTRICT not valid;

alter table "public"."expenses" validate constraint "expenses_subcategory_id_fkey";

alter table "public"."expenses" add constraint "expenses_vendor_id_fkey" FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT not valid;

alter table "public"."expenses" validate constraint "expenses_vendor_id_fkey";

alter table "public"."grn_items" add constraint "grn_items_grn_id_fkey" FOREIGN KEY (grn_id) REFERENCES grns(id) ON DELETE CASCADE not valid;

alter table "public"."grn_items" validate constraint "grn_items_grn_id_fkey";

alter table "public"."grn_items" add constraint "grn_items_po_item_id_fkey" FOREIGN KEY (po_item_id) REFERENCES po_items(id) ON DELETE RESTRICT not valid;

alter table "public"."grn_items" validate constraint "grn_items_po_item_id_fkey";

alter table "public"."grn_items" add constraint "grn_items_qty_input_check" CHECK ((qty_input >= (0)::numeric)) not valid;

alter table "public"."grn_items" validate constraint "grn_items_qty_input_check";

alter table "public"."grn_items" add constraint "grn_items_qty_matched_check" CHECK ((qty_matched >= (0)::numeric)) not valid;

alter table "public"."grn_items" validate constraint "grn_items_qty_matched_check";

alter table "public"."grn_items" add constraint "grn_items_qty_overage_check" CHECK ((qty_overage >= (0)::numeric)) not valid;

alter table "public"."grn_items" validate constraint "grn_items_qty_overage_check";

alter table "public"."grns" add constraint "grns_purchase_order_id_fkey" FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE SET NULL not valid;

alter table "public"."grns" validate constraint "grns_purchase_order_id_fkey";

alter table "public"."grns" add constraint "grns_vendor_id_fkey" FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE RESTRICT not valid;

alter table "public"."grns" validate constraint "grns_vendor_id_fkey";

alter table "public"."petty_cash_txns" add constraint "petty_cash_txns_amount_check" CHECK ((amount >= 0)) not valid;

alter table "public"."petty_cash_txns" validate constraint "petty_cash_txns_amount_check";

alter table "public"."petty_cash_txns" add constraint "petty_cash_txns_bank_account_id_fkey" FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) not valid;

alter table "public"."petty_cash_txns" validate constraint "petty_cash_txns_bank_account_id_fkey";

alter table "public"."petty_cash_txns" add constraint "petty_cash_txns_cashbox_id_fkey" FOREIGN KEY (cashbox_id) REFERENCES petty_cash_boxes(id) ON DELETE CASCADE not valid;

alter table "public"."petty_cash_txns" validate constraint "petty_cash_txns_cashbox_id_fkey";

alter table "public"."petty_cash_txns" add constraint "petty_cash_txns_expense_id_fkey" FOREIGN KEY (expense_id) REFERENCES expenses(id) not valid;

alter table "public"."petty_cash_txns" validate constraint "petty_cash_txns_expense_id_fkey";

alter table "public"."petty_cash_txns" add constraint "petty_cash_txns_type_check" CHECK ((type = ANY (ARRAY['topup'::text, 'settlement'::text, 'adjust_in'::text, 'adjust_out'::text]))) not valid;

alter table "public"."petty_cash_txns" validate constraint "petty_cash_txns_type_check";

alter table "public"."po_expense_allocations" add constraint "po_expense_allocations_amount_check" CHECK ((amount > (0)::numeric)) not valid;

alter table "public"."po_expense_allocations" validate constraint "po_expense_allocations_amount_check";

alter table "public"."po_expense_allocations" add constraint "po_expense_allocations_expense_id_fkey" FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE not valid;

alter table "public"."po_expense_allocations" validate constraint "po_expense_allocations_expense_id_fkey";

alter table "public"."po_expense_allocations" add constraint "po_expense_allocations_purchase_order_id_fkey" FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE not valid;

alter table "public"."po_expense_allocations" validate constraint "po_expense_allocations_purchase_order_id_fkey";

alter table "public"."po_items" add constraint "po_items_purchase_order_id_fkey" FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE not valid;

alter table "public"."po_items" validate constraint "po_items_purchase_order_id_fkey";

alter table "public"."pt_topups" add constraint "pt_topups_account_id_fkey" FOREIGN KEY (account_id) REFERENCES bank_accounts(id) ON DELETE RESTRICT not valid;

alter table "public"."pt_topups" validate constraint "pt_topups_account_id_fkey";

alter table "public"."pt_topups" add constraint "pt_topups_amount_check" CHECK ((amount >= 0)) not valid;

alter table "public"."pt_topups" validate constraint "pt_topups_amount_check";

alter table "public"."pt_topups" add constraint "pt_topups_inflow_type_check" CHECK ((inflow_type = ANY (ARRAY['loan'::text, 'revenue'::text, 'transfer'::text, 'other'::text]))) not valid;

alter table "public"."pt_topups" validate constraint "pt_topups_inflow_type_check";

alter table "public"."purchase_orders" add constraint "purchase_orders_po_number_key" UNIQUE using index "purchase_orders_po_number_key";

alter table "public"."purchase_orders" add constraint "purchase_orders_vendor_id_fkey" FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL not valid;

alter table "public"."purchase_orders" validate constraint "purchase_orders_vendor_id_fkey";

alter table "public"."purchase_orders" add constraint "purchase_orders_vendor_id_unique" UNIQUE using index "purchase_orders_vendor_id_unique";

alter table "public"."rab_allocations" add constraint "rab_allocations_amount_check" CHECK ((amount >= 0)) not valid;

alter table "public"."rab_allocations" validate constraint "rab_allocations_amount_check";

alter table "public"."rab_allocations" add constraint "rab_allocations_shareholder_id_alloc_date_key" UNIQUE using index "rab_allocations_shareholder_id_alloc_date_key";

alter table "public"."rab_allocations" add constraint "rab_allocations_shareholder_id_fkey" FOREIGN KEY (shareholder_id) REFERENCES shareholders(id) ON DELETE RESTRICT not valid;

alter table "public"."rab_allocations" validate constraint "rab_allocations_shareholder_id_fkey";

alter table "public"."roles" add constraint "roles_code_key" UNIQUE using index "roles_code_key";

alter table "public"."shareholders" add constraint "shareholders_email_key" UNIQUE using index "shareholders_email_key";

alter table "public"."shareholders" add constraint "shareholders_ownership_percent_check" CHECK (((ownership_percent >= (0)::numeric) AND (ownership_percent <= (100)::numeric))) not valid;

alter table "public"."shareholders" validate constraint "shareholders_ownership_percent_check";

alter table "public"."subcategories" add constraint "subcategories_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT not valid;

alter table "public"."subcategories" validate constraint "subcategories_category_id_fkey";

alter table "public"."subcategories" add constraint "subcategories_category_id_name_key" UNIQUE using index "subcategories_category_id_name_key";

alter table "public"."user_profiles" add constraint "user_profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_profiles" validate constraint "user_profiles_user_id_fkey";

alter table "public"."user_roles" add constraint "user_roles_role_id_fkey" FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE not valid;

alter table "public"."user_roles" validate constraint "user_roles_role_id_fkey";

alter table "public"."user_roles" add constraint "user_roles_user_id_auth_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_roles" validate constraint "user_roles_user_id_auth_fkey";

alter table "public"."user_roles" add constraint "user_roles_user_role_unique" UNIQUE using index "user_roles_user_role_unique";

alter table "public"."vendors" add constraint "vendors_name_key" UNIQUE using index "vendors_name_key";

alter table "public"."vendors" add constraint "vendors_payment_type_chk" CHECK ((payment_type = ANY (ARRAY['CBD'::text, 'COD'::text, 'NET'::text]))) not valid;

alter table "public"."vendors" validate constraint "vendors_payment_type_chk";

alter table "public"."vendors" add constraint "vendors_term_days_check" CHECK ((term_days >= 0)) not valid;

alter table "public"."vendors" validate constraint "vendors_term_days_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.activate_capital_injection(p_plan_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_has_snapshot boolean;
begin
  update capital_injections
    set status = 'active',
        updated_at = now()
  where id = p_plan_id;

  -- buat snapshot sekali kalau belum ada
  select exists(select 1 from ci_obligations where capital_injection_id = p_plan_id)
    into v_has_snapshot;

  if not v_has_snapshot then
    perform ci_snapshot_obligations(p_plan_id, false);
  end if;
end
$function$
;

CREATE OR REPLACE FUNCTION public.activate_ci_plan(plan_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update public.capital_injections
  set status = 'active'
  where id = plan_id;

  perform public.ci_generate_snapshot(plan_id);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.allocate_expense_to_po(p_expense_id bigint, p_po_id bigint, p_amount numeric)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_status text;
  v_exp_amount numeric;
  v_allocated  numeric;
  v_total_po numeric;
  v_paid_po  numeric;
  v_alloc_id bigint;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount harus > 0';
  END IF;

  SELECT status, amount INTO v_status, v_exp_amount
  FROM public.expenses
  WHERE id = p_expense_id;

  IF v_exp_amount IS NULL THEN
    RAISE EXCEPTION 'Expense % tidak ditemukan', p_expense_id;
  END IF;

  -- sisa alokasi di expense
  SELECT COALESCE(SUM(amount),0) INTO v_allocated
  FROM public.po_expense_allocations
  WHERE expense_id = p_expense_id;

  IF (v_allocated + p_amount) > v_exp_amount THEN
    RAISE EXCEPTION 'Jumlah alokasi (%, termasuk baru) melebihi nilai expense %',
      (v_allocated + p_amount), v_exp_amount;
  END IF;

  -- Jika expense sudah POSTED, cek outstanding PO saat ini
  IF v_status = 'posted' THEN
    SELECT total INTO v_total_po FROM public.purchase_orders WHERE id = p_po_id;
    IF v_total_po IS NULL THEN
      RAISE EXCEPTION 'PO % tidak ditemukan', p_po_id;
    END IF;

    SELECT COALESCE(SUM(a.amount),0) INTO v_paid_po
    FROM public.po_expense_allocations a
    JOIN public.expenses e ON e.id = a.expense_id AND e.status = 'posted'
    WHERE a.purchase_order_id = p_po_id;

    IF (v_paid_po + p_amount) > v_total_po THEN
      RAISE EXCEPTION 'Alokasi melebihi outstanding PO. Paid: %, alokasi baru: %, total: %',
        v_paid_po, p_amount, v_total_po;
    END IF;
  END IF;

  INSERT INTO public.po_expense_allocations (purchase_order_id, expense_id, amount)
  VALUES (p_po_id, p_expense_id, p_amount)
  RETURNING id INTO v_alloc_id;

  RETURN v_alloc_id;
END $function$
;

CREATE OR REPLACE FUNCTION public.app_has_any_role(p_roles text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from user_roles ur
    join roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.code = any(p_roles)
  );
$function$
;

CREATE OR REPLACE FUNCTION public.app_role_code(p_user_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select r.code
  from user_roles ur
  join roles r on r.id = ur.role_id
  where ur.user_id = p_user_id
  limit 1
$function$
;

CREATE OR REPLACE FUNCTION public.apply_grn_form(p_grn_id bigint, p_ref_no text, p_items jsonb)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_grn grns%rowtype;
begin
  -- lock GRN + items
  select * into v_grn from grns where id = p_grn_id for update;
  if not found then raise exception 'GRN % tidak ditemukan', p_grn_id; end if;

  perform 1 from grn_items where grn_id = p_grn_id for update;

  -- simpan header (ref_no)
  update grns set ref_no = nullif(p_ref_no,'') where id = p_grn_id;

  -- simpan qty_input & note per item
  update grn_items gi
     set qty_input = j.qty_input,
         note = j.note
    from (
      select (x->>'id')::bigint as id,
             coalesce((x->>'qty_input')::numeric,0) as qty_input,
             nullif(x->>'note','') as note
      from jsonb_array_elements(coalesce(p_items,'[]'::jsonb)) x
    ) j
   where gi.id = j.id
     and gi.grn_id = p_grn_id;

  -- hitung ulang matched/overage terhadap sisa PO
  with base as (
    select po.id as po_item_id,
           po.qty as qty_ordered,
           greatest(coalesce(po.qty_received,0),0) as received_before
    from po_items po
  )
  update grn_items gi
     set qty_matched = case
           when gi.po_item_id is null then coalesce(gi.qty_input,0)
           else least(coalesce(gi.qty_input,0),
                      greatest(b.qty_ordered - b.received_before,0))
         end,
         qty_overage = greatest(
           coalesce(gi.qty_input,0) - case
             when gi.po_item_id is null then coalesce(gi.qty_input,0)
             else least(coalesce(gi.qty_input,0),
                        greatest(b.qty_ordered - b.received_before,0))
           end, 0)
    from base b
   where gi.grn_id = p_grn_id
     and (gi.po_item_id is null or gi.po_item_id = b.po_item_id);

  return json_build_object('grn_id', p_grn_id, 'ok', true);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.assign_role_by_email(p_email text, p_code text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_uid uuid;
  v_role_id int;
begin
  select id into v_uid from auth.users where email = p_email;
  if v_uid is null then
    raise exception 'User not found: %', p_email;
  end if;

  select id into v_role_id from public.roles where code = p_code;
  if v_role_id is null then
    raise exception 'Role not found: %', p_code;
  end if;

  insert into public.user_roles(user_id, role_id)
  values (v_uid, v_role_id)
  on conflict (user_id, role_id) do nothing;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.check_alloc_not_exceed_expense()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_sum numeric;
  v_exp_amount numeric;
BEGIN
  SELECT amount
    INTO v_exp_amount
  FROM public.expenses
  WHERE id = COALESCE(NEW.expense_id, OLD.expense_id);

  IF v_exp_amount IS NULL THEN
    RAISE EXCEPTION 'Expense % tidak ditemukan', COALESCE(NEW.expense_id, OLD.expense_id);
  END IF;

  SELECT COALESCE(SUM(amount),0)
    INTO v_sum
  FROM public.po_expense_allocations
  WHERE expense_id = COALESCE(NEW.expense_id, OLD.expense_id)
    AND id <> COALESCE(NEW.id, -1);

  IF (v_sum + COALESCE(NEW.amount,0)) > v_exp_amount THEN
    RAISE EXCEPTION 'Jumlah alokasi (%, termasuk baru) melebihi nilai expense %', (v_sum + COALESCE(NEW.amount,0)), v_exp_amount;
  END IF;

  RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.check_po_allocation_not_exceed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_total      numeric := 0;
  v_allocated  numeric := 0;
  v_status     text;
begin
  -- total efektif PO dari view
  select coalesce(total_amount,0)
  into v_total
  from public.v_po_with_terms
  where id = new.purchase_order_id;

  -- status expense yang sedang dialokasikan
  select status into v_status
  from public.expenses
  where id = new.expense_id;

  -- jumlah alokasi yg SUDAH posted (kecuali baris ini)
  select coalesce(sum(a.amount),0)
  into v_allocated
  from public.po_expense_allocations a
  join public.expenses e on e.id = a.expense_id and e.status = 'posted'
  where a.purchase_order_id = new.purchase_order_id
    and a.id <> coalesce(new.id, -1);

  if v_status = 'posted' and (v_allocated + new.amount) > v_total then
    raise exception
      'Alokasi ini akan melebihi total PO. Paid lain: %, alokasi baru: %, total PO: %',
      v_allocated, new.amount, v_total;
  end if;

  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.check_po_paid_on_expense_post()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  r record;
  v_total numeric;
  v_paid  numeric;
BEGIN
  IF NEW.status = 'posted' AND COALESCE(OLD.status,'') <> 'posted' THEN
    FOR r IN
      SELECT purchase_order_id, amount
      FROM public.po_expense_allocations
      WHERE expense_id = NEW.id
    LOOP
      SELECT total INTO v_total FROM public.purchase_orders WHERE id = r.purchase_order_id;

      SELECT COALESCE(SUM(a.amount),0) INTO v_paid
      FROM public.po_expense_allocations a
      JOIN public.expenses e ON e.id = a.expense_id AND e.status = 'posted'
      WHERE a.purchase_order_id = r.purchase_order_id
        AND a.expense_id <> NEW.id;

      IF (v_paid + r.amount) > v_total THEN
        RAISE EXCEPTION 'Posting expense % melebihi total PO %. Paid lain: %, alokasi expense ini: %, total: %',
          NEW.id, r.purchase_order_id, v_paid, r.amount, v_total;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.ci_activate_plan(p_plan_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_target bigint;
begin
  -- wajib draft
  if not exists (select 1 from capital_injections where id=p_plan_id and status='draft') then
    raise exception 'Plan must be in DRAFT status';
  end if;

  select target_total into v_target from capital_injections where id=p_plan_id;

  insert into ci_obligations (capital_injection_id, shareholder_id, ownership_percent_snapshot, obligation_amount)
  select
    p_plan_id, sh.id, sh.ownership_percent,
    round( (v_target * sh.ownership_percent) / 100.0 )::bigint
  from shareholders sh
  where sh.active = true
  on conflict (capital_injection_id, shareholder_id) do nothing;

  update capital_injections set status='active' where id=p_plan_id;
end
$function$
;

CREATE OR REPLACE FUNCTION public.ci_generate_snapshot(p_plan_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_target numeric;
begin
  select target_total into v_target
  from public.capital_injections p
  where p.id = p_plan_id;

  if v_target is null then
    raise exception 'Capital injection % tidak ditemukan', p_plan_id;
  end if;

  delete from public.ci_obligations o
  where o.capital_injection_id = p_plan_id;

  insert into public.ci_obligations
    (capital_injection_id, shareholder_id, ownership_percent_snapshot, obligation_amount)
  select
    p_plan_id,
    s.id,
    coalesce(s.ownership_percent, 0),
    (v_target * coalesce(s.ownership_percent,0) / 100.0)::bigint
  from public.shareholders s;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.ci_snapshot_obligations(p_plan_id bigint, p_replace boolean DEFAULT false)
 RETURNS TABLE(shareholder_id bigint, ownership_percent_snapshot numeric, obligation_amount bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_target bigint;
  v_exists boolean;
  v_remainder bigint;
begin
  -- Ambil target_total plan
  select target_total
    into v_target
  from capital_injections
  where id = p_plan_id;

  if v_target is null then
    raise exception 'capital_injection % not found', p_plan_id;
  end if;

  -- Kalau sudah ada snapshot dan tidak diminta replace, kembalikan yang ada
  select exists(select 1 from ci_obligations where capital_injection_id = p_plan_id)
    into v_exists;

  if v_exists and not p_replace then
    return query
      select shareholder_id, ownership_percent_snapshot, obligation_amount
      from ci_obligations
      where capital_injection_id = p_plan_id
      order by shareholder_id;
    return;
  end if;

  -- Bersihkan snapshot lama jika diminta
  if p_replace then
    delete from ci_obligations where capital_injection_id = p_plan_id;
  end if;

  -- Hitung kewajiban per shareholder (pakai floor) + distribusi sisa (remainder) ke frac terbesar
  create temporary table _dist (
    shareholder_id bigint primary key,
    pct numeric,
    raw_amt numeric,
    amt_floor bigint,
    frac numeric
  ) on commit drop;

  insert into _dist (shareholder_id, pct, raw_amt, amt_floor, frac)
  select
    s.id,
    s.ownership_percent::numeric as pct,
    (v_target * (s.ownership_percent::numeric / 100.0)) as raw_amt,
    floor(v_target * (s.ownership_percent::numeric / 100.0))::bigint as amt_floor,
    (v_target * (s.ownership_percent::numeric / 100.0)) - floor(v_target * (s.ownership_percent::numeric / 100.0))
  from shareholders s
  where coalesce(s.active, true) = true
  order by s.id;

  -- sisa akibat pembulatan ke bawah
  select v_target - coalesce(sum(amt_floor),0) into v_remainder from _dist;

  -- Distribusikan +1 ke baris dengan fraksi terbesar hingga sisa habis
  update _dist d
  set amt_floor = d.amt_floor + 1
  from (
    select shareholder_id
    from _dist
    order by frac desc, shareholder_id
    limit greatest(v_remainder, 0)
  ) q
  where q.shareholder_id = d.shareholder_id;

  -- Simpan snapshot
  insert into ci_obligations (
    capital_injection_id, shareholder_id, ownership_percent_snapshot, obligation_amount, created_at
  )
  select p_plan_id, shareholder_id, pct, amt_floor, now()
  from _dist
  order by shareholder_id;

  -- Kembalikan hasilnya
  return query
  select shareholder_id, pct, amt_floor
  from _dist
  order by shareholder_id;
end
$function$
;

CREATE OR REPLACE FUNCTION public.compute_due_date(p_po_date date, p_delivery_date date, p_term_code text, p_term_days integer)
 RETURNS date
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case upper(coalesce(p_term_code,'NET'))
           when 'COD' then coalesce(p_delivery_date, p_po_date)       -- bayar saat terima barang
           when 'CBD' then p_po_date                                  -- bayar sebelum kirim
           else        p_po_date + coalesce(p_term_days,0)            -- NET N
         end;
$function$
;

CREATE OR REPLACE FUNCTION public.ensure_one_default()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF (TG_OP = 'UPDATE') THEN
    IF OLD.is_default = true AND NEW.is_active = false THEN
      -- matikan default lama
      UPDATE public.bank_accounts SET is_default=false WHERE id = NEW.id;
      -- set default ke rekening aktif paling lama
      UPDATE public.bank_accounts
      SET is_default=true
      WHERE id = (
        SELECT id FROM public.bank_accounts
        WHERE is_active = true AND id <> NEW.id
        ORDER BY created_at ASC LIMIT 1
      );
    END IF;
  END IF;
  RETURN NEW;
END; $function$
;

CREATE OR REPLACE FUNCTION public.ensure_viewer_for_me()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_role_id bigint;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;

  select id into v_role_id from public.roles where code='viewer';
  if v_role_id is null then
    insert into public.roles(code,name) values ('viewer','Viewer (Read-only)')
    on conflict (code) do nothing;
    select id into v_role_id from public.roles where code='viewer';
  end if;

  insert into public.user_roles(user_id, role_id)
  values (v_uid, v_role_id)
  on conflict (user_id, role_id) do nothing;
end $function$
;

CREATE OR REPLACE FUNCTION public.exp_validate_subcat()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare v_cat bigint;
begin
  select category_id into v_cat from public.subcategories where id = new.subcategory_id;
  if v_cat is null then
    raise exception 'Subcategory % tidak ditemukan', new.subcategory_id;
  end if;
  if new.category_id is distinct from v_cat then
    raise exception 'Subcategory bukan milik Category yang dipilih';
  end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.fn_rab_allocated_until(p_shareholder_id bigint, p_cutoff date)
 RETURNS bigint
 LANGUAGE sql
 STABLE
AS $function$
  SELECT COALESCE(SUM(a.amount),0)::bigint
  FROM public.rab_allocations a
  WHERE a.shareholder_id = p_shareholder_id
    AND a.alloc_date <= date_trunc('month', p_cutoff)::date
$function$
;

CREATE OR REPLACE FUNCTION public.fn_rab_spent_until(p_shareholder_id bigint, p_cutoff date, p_exclude_id bigint)
 RETURNS bigint
 LANGUAGE sql
 STABLE
AS $function$
  SELECT COALESCE(SUM(e.amount),0)::bigint
  FROM public.expenses e
  WHERE e.source='RAB' AND e.status='posted'
    AND e.shareholder_id = p_shareholder_id
    AND e.expense_date <= p_cutoff
    AND (p_exclude_id IS NULL OR e.id <> p_exclude_id)
$function$
;

CREATE OR REPLACE FUNCTION public.has_any_role_current(p_codes text[])
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_role_schema text;
  v_role_table  text;
  v_code_col    text;
  v_sql         text;
  v_exists      boolean;
  v_has_is_active boolean := false;
begin
  select ccu.table_schema, ccu.table_name
    into v_role_schema, v_role_table
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
   and tc.table_schema   = kcu.table_schema
  join information_schema.constraint_column_usage ccu
    on ccu.constraint_name = tc.constraint_name
   and ccu.table_schema   = tc.table_schema
  where tc.constraint_type = 'FOREIGN KEY'
    and tc.table_schema = 'public'
    and tc.table_name   = 'user_roles'
    and kcu.column_name = 'role_id'
  limit 1;

  if v_role_table is null then
    v_role_schema := 'public';
    v_role_table  := 'roles';
  end if;

  select column_name
    into v_code_col
  from information_schema.columns
  where table_schema = v_role_schema
    and table_name   = v_role_table
    and column_name in ('code','role_code','name','slug')
  limit 1;

  if v_code_col is null then
    raise exception 'Tidak menemukan kolom kode role (code/role_code/name/slug) pada %.%', v_role_schema, v_role_table;
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='user_roles' and column_name='is_active'
  ) into v_has_is_active;

  v_sql := format($f$
    select exists (
      select 1
      from public.user_roles ur
      join %I.%I r on r.id = ur.role_id
      where ur.user_id = auth.uid()
        %s
        and lower(r.%I) = any (select lower(unnest($1)))
    )$f$,
    v_role_schema, v_role_table,
    case when v_has_is_active then 'and coalesce(ur.is_active,true) = true' else '' end,
    v_code_col
  );

  execute v_sql into v_exists using p_codes;
  return coalesce(v_exists,false);
end
$function$
;

CREATE OR REPLACE FUNCTION public.has_role(p_role text)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists(
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.code = p_role
  );
$function$
;

CREATE OR REPLACE FUNCTION public.has_role(p_user uuid, p_role text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select exists(
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = p_user and r.code = p_role
  );
$function$
;

CREATE OR REPLACE FUNCTION public.has_role_current(p_code text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_role_schema text;
  v_role_table  text;
  v_code_col    text;
  v_sql         text;
  v_exists      boolean;
  v_has_is_active boolean := false;
begin
  -- cari FK user_roles.role_id -> roles(id)
  select ccu.table_schema, ccu.table_name
    into v_role_schema, v_role_table
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
   and tc.table_schema   = kcu.table_schema
  join information_schema.constraint_column_usage ccu
    on ccu.constraint_name = tc.constraint_name
   and ccu.table_schema   = tc.table_schema
  where tc.constraint_type = 'FOREIGN KEY'
    and tc.table_schema = 'public'
    and tc.table_name   = 'user_roles'
    and kcu.column_name = 'role_id'
  limit 1;

  if v_role_table is null then
    -- fallback: tebak nama tabel roles di schema public
    v_role_schema := 'public';
    v_role_table  := 'roles';
  end if;

  -- deteksi kolom kode di tabel roles
  select column_name
    into v_code_col
  from information_schema.columns
  where table_schema = v_role_schema
    and table_name   = v_role_table
    and column_name in ('code','role_code','name','slug')
  limit 1;

  if v_code_col is null then
    raise exception 'Tidak menemukan kolom kode role (code/role_code/name/slug) pada %.%', v_role_schema, v_role_table;
  end if;

  -- cek apakah user_roles punya kolom is_active
  select exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='user_roles' and column_name='is_active'
  ) into v_has_is_active;

  -- build SQL dinamis
  v_sql := format($f$
    select exists (
      select 1
      from public.user_roles ur
      join %I.%I r on r.id = ur.role_id
      where ur.user_id = auth.uid()
        %s
        and lower(r.%I) = lower($1)
    )$f$,
    v_role_schema, v_role_table,
    case when v_has_is_active then 'and coalesce(ur.is_active,true) = true' else '' end,
    v_code_col
  );

  execute v_sql into v_exists using p_code;
  return coalesce(v_exists,false);
end
$function$
;

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select exists(
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.code = 'admin'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_super_admin()
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select public.has_role_current('superadmin');
$function$
;

CREATE OR REPLACE FUNCTION public.is_viewer_or_admin()
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and r.code in ('viewer','admin','super_admin')
  );
$function$
;

CREATE OR REPLACE FUNCTION public.list_expenses_rpc(p_month text, p_date_from date, p_date_to date, p_source text, p_status text, p_category_id bigint, p_subcategory_id bigint, p_shareholder_id bigint, p_q text, p_page integer, p_page_size integer, p_order_by text, p_order_dir text)
 RETURNS SETOF record
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with base as (
    select
      e.id,
      e.expense_date,
      to_char(e.period_month,'YYYY-MM') as period_month,
      e.source,
      e.status,
      e.amount,
      e.category_id,
      e.subcategory_id,
      c.name  as category_name,
      sc.name as subcategory_name,
      e.shareholder_id,
      sh.name as shareholder_name,
      e.vendor_id,
      v.name  as vendor_name,
      e.invoice_no,
      e.note,
      e.created_at,
      e.updated_at,
      (
        select coalesce(array_agg(po.po_number::text order by po.po_number), '{}')
        from po_expense_allocations pea
        join purchase_orders po on po.id = pea.purchase_order_id
        where pea.expense_id = e.id
      ) as po_refs
    from expenses e
    left join categories    c  on c.id  = e.category_id
    left join subcategories sc on sc.id = e.subcategory_id
    left join shareholders  sh on sh.id = e.shareholder_id
    left join vendors       v  on v.id  = e.vendor_id
    where
      (p_source        is null or e.source = p_source) and
      (p_status        is null or e.status = p_status) and
      (p_category_id   is null or e.category_id = p_category_id) and
      (p_subcategory_id is null or e.subcategory_id = p_subcategory_id) and
      (p_shareholder_id is null or e.shareholder_id = p_shareholder_id) and
      (p_month         is null or to_char(e.period_month,'YYYY-MM') = p_month) and
      (p_date_from     is null or e.expense_date >= p_date_from) and
      (p_date_to       is null or e.expense_date <  p_date_to) and
      (p_q is null or
        e.invoice_no ilike '%'||p_q||'%' or
        coalesce(v.name,'') ilike '%'||p_q||'%' or
        coalesce(c.name,'') ilike '%'||p_q||'%' or
        coalesce(sc.name,'') ilike '%'||p_q||'%')
  )
  select * from base
  order by
    case when coalesce(nullif(p_order_by,''),'expense_date') = 'expense_date'
         and lower(coalesce(p_order_dir,'desc')) = 'asc'  then expense_date end asc,
    case when coalesce(nullif(p_order_by,''),'expense_date') = 'expense_date'
         and lower(coalesce(p_order_dir,'desc')) = 'desc' then expense_date end desc,
    id desc
  offset greatest(0, (coalesce(p_page,1)-1) * coalesce(p_page_size,20))
  limit  coalesce(p_page_size,20);
$function$
;

CREATE OR REPLACE FUNCTION public.pay_po(p_po_id bigint, p_source text, p_expense_date date, p_amount numeric, p_vendor_id bigint, p_category_id bigint, p_subcategory_id bigint, p_status text DEFAULT 'posted'::text, p_shareholder_id bigint DEFAULT NULL::bigint, p_cashbox_id bigint DEFAULT NULL::bigint, p_invoice_no text DEFAULT NULL::text, p_note text DEFAULT NULL::text)
 RETURNS TABLE(expense_id bigint, allocation_id bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
    declare
      v_total numeric;
      v_paid numeric;
      v_outstanding numeric;
      v_bank_id bigint;
    begin
      -- 🔒 hanya admin
      if not public.has_role('admin') then
        raise exception 'Only admin can record payments';
      end if;

      if p_amount is null or p_amount <= 0 then
        raise exception 'Amount harus > 0';
      end if;
      if p_source not in ('PT','RAB','PETTY') then
        raise exception 'Source tidak valid. Gunakan PT/RAB/PETTY';
      end if;

      -- Ringkasan PO
      select total into v_total from public.purchase_orders where id = p_po_id;
      if v_total is null then
        raise exception 'PO % tidak ditemukan', p_po_id;
      end if;

      select coalesce(sum(a.amount),0) into v_paid
      from public.po_expense_allocations a
      join public.expenses e on e.id = a.expense_id and e.status = 'posted'
      where a.purchase_order_id = p_po_id;

      v_outstanding := v_total - v_paid;

      if p_status = 'posted' and p_amount > v_outstanding then
        raise exception 'Pembayaran melebihi outstanding (tersisa %)', v_outstanding;
      end if;

      -- Bank default PT saat posted
      if p_source = 'PT' and p_status = 'posted' then
        select id into v_bank_id
        from public.bank_accounts
        where is_active and is_default
        limit 1;
        if v_bank_id is null then
          raise exception 'Default bank PT belum diset';
        end if;
      end if;

      -- Insert expense
      insert into public.expenses (
        source, shareholder_id, cashbox_id, expense_date, amount,
        vendor_id, invoice_no, note, category_id, subcategory_id, status, account_id
      )
      values (
        p_source,
        case when p_source='RAB'   then p_shareholder_id else null end,
        case when p_source='PETTY' then p_cashbox_id     else null end,
        p_expense_date, p_amount,
        p_vendor_id, p_invoice_no, p_note, p_category_id, p_subcategory_id,
        p_status,
        case when p_source='PT' and p_status='posted' then v_bank_id else null end
      )
      returning id into expense_id;

      -- Alokasi ke PO
      insert into public.po_expense_allocations (purchase_order_id, expense_id, amount)
      values (p_po_id, expense_id, p_amount)
      returning id into allocation_id;

      return;
    end $function$
;

CREATE OR REPLACE FUNCTION public.post_grn(p_grn_id bigint)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_grn record;
  v_po_id bigint;
  v_po_status text;
begin
  -- lock GRN
  select * into v_grn from grns where id = p_grn_id for update;
  if not found then raise exception 'GRN % tidak ditemukan', p_grn_id; end if;
  if v_grn.status <> 'draft' then raise exception 'GRN % sudah %', p_grn_id, v_grn.status; end if;

  -- lock items
  perform 1 from grn_items where grn_id = p_grn_id for update;

  -- tambahkan qty_matched ke received_qty PO items (overage tidak menambah pemenuhan PO)
  update po_items pi
  set received_qty = coalesce(pi.received_qty,0) + gi.matched
  from (
    select po_item_id, sum(qty_matched) as matched
    from grn_items
    where grn_id = p_grn_id
    group by po_item_id
  ) gi
  where pi.id = gi.po_item_id;

  -- mark GRN posted
  update grns set status = 'posted', posted_at = now()
  where id = p_grn_id;

  -- update status PO bila ada
  if v_grn.purchase_order_id is not null then
    v_po_id := v_grn.purchase_order_id;

    update purchase_orders po
    set status = case
      when not exists (
        select 1 from po_items
        where purchase_order_id = v_po_id
          and coalesce(received_qty,0) < qty_ordered
      ) then 'delivered'
      when exists (
        select 1 from po_items
        where purchase_order_id = v_po_id
          and coalesce(received_qty,0) > 0
      ) then 'partially_received'
      else po.status
    end
    where po.id = v_po_id
    returning status into v_po_status;
  end if;

  return json_build_object(
    'grn_id', p_grn_id,
    'grn_status', 'posted',
    'po_id', v_po_id,
    'po_status', v_po_status
  );
end $function$
;

CREATE OR REPLACE FUNCTION public.post_grn_if_matched(p_grn_id bigint)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_grn grns%rowtype;
  v_po_id bigint;
  v_po_status text;
  v_over_cnt int;
begin
  -- lock GRN + items
  select * into v_grn from grns where id = p_grn_id for update;
  if not found then
    raise exception 'GRN % tidak ditemukan', p_grn_id;
  end if;
  if v_grn.status <> 'draft' then
    raise exception 'Hanya GRN draft yang bisa di-post (saat ini: %)', v_grn.status;
  end if;

  perform 1 from grn_items where grn_id = p_grn_id for update;

  -- Hitung ulang matched/overage terhadap sisa PO
  -- (TIDAK menyentuh grn_items.qty_received agar aman jika kolom itu generated)
  with base as (
    select po.id as po_item_id,
           po.qty as qty_ordered,
           greatest(coalesce(po.qty_received,0),0) as received_before
    from po_items po
  )
  update grn_items gi
     set qty_matched = case
           when gi.po_item_id is null then coalesce(gi.qty_input,0)
           else least(coalesce(gi.qty_input,0),
                      greatest(b.qty_ordered - b.received_before,0))
         end,
         qty_overage = greatest(
           coalesce(gi.qty_input,0) - case
             when gi.po_item_id is null then coalesce(gi.qty_input,0)
             else least(coalesce(gi.qty_input,0),
                        greatest(b.qty_ordered - b.received_before,0))
           end, 0)
    from base b
   where gi.grn_id = p_grn_id
     and (gi.po_item_id is null or gi.po_item_id = b.po_item_id);

  -- Validasi: tidak boleh ada overage untuk item yang terkait PO
  select count(*) into v_over_cnt
  from grn_items
  where grn_id = p_grn_id
    and po_item_id is not null
    and coalesce(qty_overage,0) > 0;

  if v_over_cnt > 0 then
    raise exception 'Tidak bisa POST: masih ada overage pada % baris.', v_over_cnt;
  end if;

  -- Update po_items.qty_received (tambah matched dari GRN ini)
  with m as (
    select po_item_id, sum(coalesce(qty_matched,0)) as matched
    from grn_items
    where grn_id = p_grn_id and po_item_id is not null
    group by po_item_id
  )
  update po_items po
     set qty_received = least(po.qty, coalesce(po.qty_received,0) + coalesce(m.matched,0))
    from m
   where po.id = m.po_item_id;

  -- Mark GRN posted
  update grns
     set status = 'posted'
         -- , posted_at = now()  -- aktifkan kalau kolomnya ada
   where id = p_grn_id;

  -- Update status PO bila ada
  if v_grn.purchase_order_id is not null then
    v_po_id := v_grn.purchase_order_id;

    update purchase_orders po
       set status = case
         when not exists (
           select 1 from po_items
           where purchase_order_id = v_po_id
             and coalesce(qty_received,0) < qty
         ) then 'delivered'
         when exists (
           select 1 from po_items
           where purchase_order_id = v_po_id
             and coalesce(qty_received,0) > 0
         ) then 'partially_received'
         else po.status
       end
     where po.id = v_po_id
     returning status into v_po_status;
  end if;

  return json_build_object(
    'grn_id', p_grn_id,
    'grn_status', 'posted',
    'po_id', v_po_id,
    'po_status', v_po_status
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION public.pt_to_petty_topup(p_amount bigint, p_cashbox_id bigint, p_transfer_subcategory_id bigint, p_txn_date date, p_note text DEFAULT NULL::text)
 RETURNS TABLE(topup_txn_id bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.petty_cash_txns
    (cashbox_id, txn_date, type, amount, bank_account_id, ref_no, note)
  VALUES
    (p_cashbox_id, p_txn_date, 'topup', p_amount, NULL, NULL, p_note)
  RETURNING id INTO topup_txn_id;

  RETURN;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.pt_to_petty_topup_api(p_amount bigint, p_cashbox_id bigint, p_txn_date date, p_note text DEFAULT NULL::text)
 RETURNS TABLE(topup_txn_id bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_id bigint;
BEGIN
  INSERT INTO petty_cash_txns (cashbox_id, txn_date, type, amount, note)
  VALUES (p_cashbox_id, p_txn_date, 'topup', p_amount, p_note)
  RETURNING id INTO v_id;

  RETURN QUERY SELECT v_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.rab_allocate_by_ownership(p_period_month date, p_total bigint, p_note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_month date := date_trunc('month', p_period_month)::date;
  v_total bigint := p_total;
  v_cnt int;
begin
  if v_total is null or v_total <= 0 then
    raise exception 'Total must be > 0';
  end if;

  select count(*) into v_cnt from public.shareholders where active = true;
  if v_cnt = 0 then
    raise exception 'No active shareholders to distribute to';
  end if;

  with sh as (
    select id as shareholder_id, ownership_percent
    from public.shareholders
    where active = true
  ), base as (
    select shareholder_id,
           (v_total * ownership_percent / 100.0)::numeric as exact_share,
           ownership_percent
    from sh
  ), rounded as (
    select shareholder_id,
           floor(exact_share)::bigint as floor_amt,
           (exact_share - floor(exact_share)) as frac,
           ownership_percent
    from base
  ), sum_floor as (
    select sum(floor_amt) as total_floor from rounded
  ), residual as (
    select (v_total - total_floor)::bigint as rem from sum_floor
  ), ranked as (
    select r.*, row_number() over (order by frac desc, ownership_percent desc, shareholder_id asc) as rn
    from rounded r
  ), final as (
    select shareholder_id,
           floor_amt + case when rn <= (select rem from residual) then 1 else 0 end as amount
    from ranked
  )
  insert into public.rab_allocations (shareholder_id, alloc_date, amount, note)
  select f.shareholder_id, v_month, f.amount, p_note
  from final f
  on conflict (shareholder_id, alloc_date)
  do update set amount = excluded.amount, note = excluded.note, updated_at = now();
end
$function$
;

CREATE OR REPLACE FUNCTION public.rab_to_petty_topup(p_shareholder_id bigint, p_amount bigint, p_cashbox_id bigint, p_transfer_subcategory_id bigint, p_txn_date date DEFAULT CURRENT_DATE, p_note text DEFAULT NULL::text, p_internal_vendor_name text DEFAULT 'INTERNAL TRANSFER'::text)
 RETURNS TABLE(topup_txn_id bigint, expense_id bigint, new_rab_balance bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_alloc bigint;
  v_spent bigint;
  v_avail bigint;
  v_vendor_id bigint;
  v_category_id bigint;
begin
  if p_amount <= 0 then
    raise exception 'amount must be > 0';
  end if;

  -- saldo RAB = alokasi - semua pengeluaran RAB
  select coalesce(sum(amount),0) into v_alloc
    from public.rab_allocations
   where shareholder_id = p_shareholder_id;

  select coalesce(sum(amount),0) into v_spent
    from public.expenses
   where source = 'RAB'
     and shareholder_id = p_shareholder_id;

  v_avail := v_alloc - v_spent;
  if v_avail < p_amount then
    raise exception 'Saldo RAB tidak cukup. Sisa: %, diminta: %', v_avail, p_amount;
  end if;

  -- pastikan vendor internal ada (wajib karena expenses.vendor_id NOT NULL)
  insert into public.vendors(name, payment_type)
  values (p_internal_vendor_name, 'CBD')
  on conflict (name) do update
    set payment_type = excluded.payment_type
  returning id into v_vendor_id;

  -- ambil category dari subcategory transfer
  select category_id into v_category_id
    from public.subcategories
   where id = p_transfer_subcategory_id;

  if v_category_id is null then
    raise exception 'Subcategory transfer % tidak valid', p_transfer_subcategory_id;
  end if;

  -- catat pengurangan RAB (transfer internal) → ditandai cashbox_id
  insert into public.expenses(
    source, shareholder_id, expense_date, period_month, amount,
    vendor_id, vendor_name, note, category_id, subcategory_id, status, cashbox_id
  )
  values (
    'RAB', p_shareholder_id, p_txn_date, date_trunc('month', p_txn_date)::date, p_amount,
    v_vendor_id, p_internal_vendor_name, coalesce(p_note, 'Top-up Kas Kecil'),
    v_category_id, p_transfer_subcategory_id, 'posted', p_cashbox_id
  )
  returning id into expense_id;

  -- ledger kas kecil (saldo naik)
  insert into public.petty_cash_txns (cashbox_id, txn_date, type, amount, note, expense_id)
  values (p_cashbox_id, p_txn_date, 'topup', p_amount, p_note, expense_id)
  returning id into topup_txn_id;

  new_rab_balance := v_avail - p_amount;
  return;
end $function$
;

CREATE OR REPLACE FUNCTION public.rab_to_petty_topup(p_shareholder_id bigint, p_amount bigint, p_txn_date date DEFAULT CURRENT_DATE, p_note text DEFAULT NULL::text)
 RETURNS TABLE(topup_txn_id bigint, expense_id bigint, new_rab_balance bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_alloc bigint;
  v_spent bigint;
  v_available bigint;
begin
  if p_amount <= 0 then raise exception 'amount must be > 0'; end if;

  select coalesce(sum(amount),0) into v_alloc
  from public.rab_allocations where shareholder_id = p_shareholder_id;

  select coalesce(sum(amount),0) into v_spent
  from public.expenses where source='RAB' and shareholder_id=p_shareholder_id;

  v_available := v_alloc - v_spent;
  if v_available < p_amount then
    raise exception 'Saldo RAB tidak cukup. Sisa: %, diminta: %', v_available, p_amount;
  end if;

  insert into public.expenses(expense_date, period_month, amount, source, shareholder_id, subcategory_id, note)
  values (p_txn_date, date_trunc('month', p_txn_date)::date, p_amount, 'RAB', p_shareholder_id, null, coalesce(p_note,'Top-up Kas Kecil'))
  returning id into expense_id;

  insert into public.petty_cash_txns(txn_date, txn_type, amount, note, expense_id)
  values (p_txn_date, 'TOPUP', p_amount, p_note, expense_id)
  returning id into topup_txn_id;

  new_rab_balance := v_available - p_amount;
  return;
end $function$
;

CREATE OR REPLACE FUNCTION public.rab_to_petty_topup_api(p_shareholder_id bigint, p_amount bigint, p_cashbox_id bigint, p_transfer_subcategory_id bigint, p_txn_date date, p_note text DEFAULT NULL::text)
 RETURNS TABLE(topup_txn_id bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_json jsonb;
  v_id   bigint;
begin
  -- Coba varian yang punya p_note
  begin
    select to_jsonb(public.rab_to_petty_topup(
      p_shareholder_id           => p_shareholder_id,
      p_amount                   => p_amount,
      p_cashbox_id               => p_cashbox_id,
      p_transfer_subcategory_id  => p_transfer_subcategory_id,
      p_txn_date                 => p_txn_date,
      p_note                     => p_note
    )) into v_json;
  exception when undefined_function then
    -- Fallback ke varian lama (mis. p_internal_vendor_name)
    select to_jsonb(public.rab_to_petty_topup(
      p_shareholder_id           => p_shareholder_id,
      p_amount                   => p_amount,
      p_cashbox_id               => p_cashbox_id,
      p_transfer_subcategory_id  => p_transfer_subcategory_id,
      p_txn_date                 => p_txn_date,
      p_internal_vendor_name     => null::text
    )) into v_json;
  end;

  -- Normalisasi hasil: bisa object {topup_txn_id:...} / {id:...} atau scalar number
  v_id := coalesce(
            (v_json ->> 'topup_txn_id')::bigint,
            (v_json ->> 'id')::bigint,
            null
          );

  if v_id is null then
    -- kalau scalar number/string di jsonb, ambil nilainya (#>> '{}' = text dari root)
    begin
      v_id := (v_json #>> '{}')::bigint;
    exception when others then
      null;
    end;
  end if;

  if v_id is null then
    raise exception 'Tidak bisa membaca id dari hasil fungsi rab_to_petty_topup: %', v_json;
  end if;

  return query select v_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rab_to_petty_topup_api(p_shareholder_id bigint, p_amount bigint, p_cashbox_id bigint, p_txn_date date, p_note text DEFAULT NULL::text)
 RETURNS TABLE(topup_txn_id bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_id bigint;
BEGIN
  INSERT INTO petty_cash_txns (cashbox_id, txn_date, type, amount, note)
  VALUES (p_cashbox_id, p_txn_date, 'topup', p_amount, p_note)
  RETURNING id INTO v_id;

  RETURN QUERY SELECT v_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.rab_to_petty_topup_legacy(p_shareholder_id bigint, p_amount bigint, p_cashbox_id bigint, p_transfer_subcategory_id bigint, p_txn_date date, p_note text DEFAULT NULL::text)
 RETURNS TABLE(topup_txn_id bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- catat topup ke petty (bank_account_id NULL untuk RAB)
  INSERT INTO public.petty_cash_txns
    (cashbox_id, txn_date, type, amount, bank_account_id, ref_no, note)
  VALUES
    (p_cashbox_id, p_txn_date, 'topup', p_amount, NULL, NULL, p_note)
  RETURNING id INTO topup_txn_id;

  RETURN;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.regenerate_ci_snapshot(p_plan_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_target numeric;
begin
  select c.target_total
    into v_target
  from public.capital_injections c
  where c.id = p_plan_id;

  if v_target is null then
    raise exception 'Plan % tidak ditemukan', p_plan_id;
  end if;

  -- hapus snapshot lama
  delete from public.capital_injection_obligations o
  where o.capital_injection_id = p_plan_id;

  -- isi ulang snapshot: WAJIB pakai alias tabel yang jelas
  insert into public.capital_injection_obligations
    (capital_injection_id, shareholder_id, ownership_percent_snapshot, obligation_amount)
  select
    p_plan_id                          as capital_injection_id,
    s.id                               as shareholder_id,
    coalesce(s.ownership_percent, 0)   as ownership_percent_snapshot,
    round( (v_target * coalesce(s.ownership_percent,0)) / 100.0 )::bigint
  from public.shareholders s
  where coalesce(s.ownership_percent,0) > 0;
end
$function$
;

CREATE OR REPLACE FUNCTION public.set_default_pt_bank(p_id bigint)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE public.bank_accounts SET is_default = false WHERE is_default = true AND id <> p_id;
  UPDATE public.bank_accounts SET is_default = true  WHERE id = p_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.tg_set_vendor_audit()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(new.created_by, auth.uid());
    new.updated_by := auth.uid();
    new.updated_at := now();
  elsif tg_op = 'UPDATE' then
    new.updated_by := auth.uid();
    new.updated_at := now();
  end if;
  return new;
end$function$
;

CREATE OR REPLACE FUNCTION public.trg_ci_require_account()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.status = 'posted' AND NEW.bank_account_id IS NULL THEN
    RAISE EXCEPTION 'bank_account_id is required when posting a contribution';
  END IF;
  RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.trg_expenses_guard_overspend()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_alloc bigint;
  v_used  bigint;
  v_old_posted boolean := (TG_OP='UPDATE' AND OLD.status='posted');
BEGIN
  IF NEW.source='RAB' AND NEW.status='posted' THEN
    IF NEW.shareholder_id IS NULL THEN
      RAISE EXCEPTION 'RAB expense requires shareholder_id';
    END IF;

    v_alloc := public.fn_rab_allocated_until(NEW.shareholder_id, NEW.expense_date);
    v_used  := public.fn_rab_spent_until(NEW.shareholder_id, NEW.expense_date,
                 CASE WHEN v_old_posted THEN OLD.id ELSE NULL END);

    IF (v_used + COALESCE(NEW.amount,0)) > v_alloc THEN
      RAISE EXCEPTION 'Insufficient RAB balance: used % + new % > allocated % up to %',
        v_used, NEW.amount, v_alloc, NEW.expense_date;
    END IF;
  END IF;
  RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION public.trg_grn_item_split_overreceive()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare
  v_order_qty numeric(18,3);
  v_received_matched_other numeric(18,3);
  v_existing_matched numeric(18,3);
  v_allowed numeric(18,3);
begin
  -- Non-PO: semua masuk overage
  if new.po_item_id is null then
    new.qty_matched := 0;
    new.qty_overage := greatest(coalesce(new.qty_input,0), 0);
    return new;
  end if;

  v_existing_matched := case
    when tg_op = 'UPDATE' then coalesce((select qty_matched from public.grn_items where id = old.id), 0)
    else 0
  end;

  select qty::numeric into v_order_qty
  from public.po_items
  where id = new.po_item_id;

  if v_order_qty is null then
    raise exception 'PO item % tidak ditemukan', new.po_item_id;
  end if;

  select coalesce(sum(qty_matched),0) into v_received_matched_other
  from public.grn_items
  where po_item_id = new.po_item_id
    and (tg_op <> 'UPDATE' or id <> old.id);

  v_allowed := v_order_qty - v_received_matched_other + v_existing_matched;
  if v_allowed < 0 then v_allowed := 0; end if;

  new.qty_matched := least(coalesce(new.qty_input,0), v_allowed);
  new.qty_overage := greatest(coalesce(new.qty_input,0) - new.qty_matched, 0);

  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.trg_normalize_month_date()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.alloc_date is not null then
    new.alloc_date := date_trunc('month', new.alloc_date)::date;
  end if;
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.trg_set_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$ begin new.updated_at = now(); return new; end $function$
;

CREATE OR REPLACE FUNCTION public.upsert_profile_by_email(p_email text, p_full_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_uid uuid;
begin
  select id into v_uid from auth.users where email = p_email;
  if v_uid is null then
    raise exception 'User not found: %', p_email;
  end if;

  insert into public.user_profiles(user_id, full_name)
  values (v_uid, p_full_name)
  on conflict (user_id) do update set full_name = excluded.full_name;
end;
$function$
;

create or replace view "public"."v_budget_by_cat_sub" as  WITH allocated AS (
         SELECT bl.subcategory_id,
            (sum(bl.amount))::bigint AS allocated
           FROM budget_lines bl
          GROUP BY bl.subcategory_id
        ), actual AS (
         SELECT e.subcategory_id,
            (sum(e.amount))::bigint AS actual
           FROM expenses e
          GROUP BY e.subcategory_id
        )
 SELECT c.id AS category_id,
    c.name AS category_name,
    s.id AS subcategory_id,
    s.name AS subcategory_name,
    COALESCE(a.allocated, (0)::bigint) AS allocated,
    COALESCE(x.actual, (0)::bigint) AS actual,
    (COALESCE(a.allocated, (0)::bigint) - COALESCE(x.actual, (0)::bigint)) AS available
   FROM (((subcategories s
     JOIN categories c ON ((c.id = s.category_id)))
     LEFT JOIN allocated a ON ((a.subcategory_id = s.id)))
     LEFT JOIN actual x ON ((x.subcategory_id = s.id)));


create or replace view "public"."v_budget_by_line" as  WITH subcat_alloc AS (
         SELECT bl.subcategory_id,
            sum(bl.amount) AS allocated_subcat
           FROM budget_lines bl
          GROUP BY bl.subcategory_id
        ), subcat_actual AS (
         SELECT e.subcategory_id,
            sum(e.amount) AS actual_subcat
           FROM expenses e
          GROUP BY e.subcategory_id
        ), lines AS (
         SELECT bl.id AS line_id,
            bl.description AS line_description,
            bl.subcategory_id,
            (bl.amount)::numeric AS allocated_line
           FROM budget_lines bl
        ), joined AS (
         SELECT l.line_id,
            l.line_description,
            l.subcategory_id,
            l.allocated_line,
            COALESCE(sa.allocated_subcat, (0)::numeric) AS allocated_subcat,
            COALESCE(ax.actual_subcat, (0)::numeric) AS actual_subcat,
                CASE
                    WHEN (COALESCE(sa.allocated_subcat, (0)::numeric) > (0)::numeric) THEN ((l.allocated_line / sa.allocated_subcat) * COALESCE(ax.actual_subcat, (0)::numeric))
                    ELSE (0)::numeric
                END AS actual_line
           FROM ((lines l
             LEFT JOIN subcat_alloc sa ON ((sa.subcategory_id = l.subcategory_id)))
             LEFT JOIN subcat_actual ax ON ((ax.subcategory_id = l.subcategory_id)))
        )
 SELECT c.id AS category_id,
    c.name AS category_name,
    s.id AS subcategory_id,
    s.name AS subcategory_name,
    j.line_id AS id,
    j.line_description AS description,
    (round(j.allocated_line))::bigint AS allocated,
    (round(j.actual_line))::bigint AS actual,
    (round((j.allocated_line - j.actual_line)))::bigint AS available
   FROM ((joined j
     JOIN subcategories s ON ((s.id = j.subcategory_id)))
     JOIN categories c ON ((c.id = s.category_id)))
  ORDER BY c.name, s.name, j.line_id;


create or replace view "public"."v_budget_progress_monthly" as  WITH keys AS (
         SELECT DISTINCT budget_lines.category_id,
            budget_lines.subcategory_id
           FROM budget_lines
        UNION
         SELECT DISTINCT expenses.category_id,
            expenses.subcategory_id
           FROM expenses
        ), months AS (
         SELECT DISTINCT expenses.period_month
           FROM expenses
        ), grid AS (
         SELECT m_1.period_month,
            k.category_id,
            k.subcategory_id
           FROM (months m_1
             CROSS JOIN keys k)
        ), b AS (
         SELECT budget_lines.category_id,
            budget_lines.subcategory_id,
            sum(budget_lines.amount) AS budget_amount
           FROM budget_lines
          GROUP BY budget_lines.category_id, budget_lines.subcategory_id
        ), mreal AS (
         SELECT expenses.period_month,
            expenses.category_id,
            expenses.subcategory_id,
            sum(expenses.amount) AS realised_monthly
           FROM expenses
          WHERE (expenses.status = 'posted'::text)
          GROUP BY expenses.period_month, expenses.category_id, expenses.subcategory_id
        )
 SELECT g.period_month,
    g.category_id,
    g.subcategory_id,
    COALESCE(b.budget_amount, (0)::numeric) AS budget_amount,
    COALESCE(m.realised_monthly, (0)::numeric) AS realised_monthly,
    sum(COALESCE(m.realised_monthly, (0)::numeric)) OVER (PARTITION BY g.category_id, g.subcategory_id ORDER BY g.period_month ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS realised_cumulative,
    (COALESCE(b.budget_amount, (0)::numeric) - sum(COALESCE(m.realised_monthly, (0)::numeric)) OVER (PARTITION BY g.category_id, g.subcategory_id ORDER BY g.period_month ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)) AS remaining,
        CASE
            WHEN (COALESCE(b.budget_amount, (0)::numeric) = (0)::numeric) THEN NULL::numeric
            ELSE round(((100.0 * sum(COALESCE(m.realised_monthly, (0)::numeric)) OVER (PARTITION BY g.category_id, g.subcategory_id ORDER BY g.period_month ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)) / NULLIF(b.budget_amount, (0)::numeric)), 2)
        END AS realisation_pct
   FROM ((grid g
     LEFT JOIN b ON (((b.category_id = g.category_id) AND (b.subcategory_id = g.subcategory_id))))
     LEFT JOIN mreal m ON (((m.period_month = g.period_month) AND (m.category_id = g.category_id) AND (m.subcategory_id = g.subcategory_id))))
  ORDER BY g.period_month DESC, g.category_id, g.subcategory_id;


create or replace view "public"."v_budget_vs_realisation_total" as  WITH keys AS (
         SELECT DISTINCT budget_lines.category_id,
            budget_lines.subcategory_id
           FROM budget_lines
        UNION
         SELECT DISTINCT expenses.category_id,
            expenses.subcategory_id
           FROM expenses
        ), b AS (
         SELECT budget_lines.category_id,
            budget_lines.subcategory_id,
            sum(budget_lines.amount) AS budget_amount
           FROM budget_lines
          GROUP BY budget_lines.category_id, budget_lines.subcategory_id
        ), r AS (
         SELECT expenses.category_id,
            expenses.subcategory_id,
            sum(expenses.amount) AS realised_amount
           FROM expenses
          WHERE (expenses.status = 'posted'::text)
          GROUP BY expenses.category_id, expenses.subcategory_id
        )
 SELECT k.category_id,
    k.subcategory_id,
    COALESCE(b.budget_amount, (0)::numeric) AS budget_amount,
    COALESCE(r.realised_amount, (0)::numeric) AS realised_amount,
    (COALESCE(r.realised_amount, (0)::numeric) - COALESCE(b.budget_amount, (0)::numeric)) AS variance,
        CASE
            WHEN (COALESCE(b.budget_amount, (0)::numeric) = (0)::numeric) THEN NULL::numeric
            ELSE round(((100.0 * COALESCE(r.realised_amount, (0)::numeric)) / NULLIF(b.budget_amount, (0)::numeric)), 2)
        END AS realisation_pct
   FROM ((keys k
     LEFT JOIN b ON (((b.category_id = k.category_id) AND (b.subcategory_id = k.subcategory_id))))
     LEFT JOIN r ON (((r.category_id = k.category_id) AND (r.subcategory_id = k.subcategory_id))))
  ORDER BY k.category_id, k.subcategory_id;


create or replace view "public"."v_ci_plan_summary" as  WITH posted AS (
         SELECT capital_contributions.capital_injection_id,
            (COALESCE(sum(capital_contributions.amount) FILTER (WHERE (capital_contributions.status = 'posted'::text)), (0)::numeric))::bigint AS posted_total
           FROM capital_contributions
          GROUP BY capital_contributions.capital_injection_id
        )
 SELECT ci.id,
    ci.period,
    ci.target_total,
    ci.status,
    COALESCE(p.posted_total, (0)::bigint) AS posted_total,
        CASE
            WHEN (ci.target_total = 0) THEN 0
            ELSE (round((((COALESCE(p.posted_total, (0)::bigint))::numeric * 100.0) / (ci.target_total)::numeric)))::integer
        END AS progress_percent,
    ci.created_at
   FROM (capital_injections ci
     LEFT JOIN posted p ON ((p.capital_injection_id = ci.id)));


create or replace view "public"."v_ci_shareholder_progress" as  SELECT o.capital_injection_id,
    s.id AS shareholder_id,
    s.name AS shareholder_name,
    o.ownership_percent_snapshot AS ownership_percent,
    o.obligation_amount AS obligation,
    COALESCE((sum(
        CASE
            WHEN (c.status = 'posted'::text) THEN c.amount
            ELSE (0)::bigint
        END))::bigint, (0)::bigint) AS paid,
    (o.obligation_amount - COALESCE((sum(
        CASE
            WHEN (c.status = 'posted'::text) THEN c.amount
            ELSE (0)::bigint
        END))::bigint, (0)::bigint)) AS remaining
   FROM ((ci_obligations o
     JOIN shareholders s ON ((s.id = o.shareholder_id)))
     LEFT JOIN capital_contributions c ON (((c.capital_injection_id = o.capital_injection_id) AND (c.shareholder_id = o.shareholder_id))))
  GROUP BY o.capital_injection_id, s.id, s.name, o.ownership_percent_snapshot, o.obligation_amount;


create or replace view "public"."v_expense_realisation_monthly" as  SELECT period_month,
    category_id,
    subcategory_id,
    sum(amount) AS realised
   FROM expenses e
  WHERE (status = 'posted'::text)
  GROUP BY period_month, category_id, subcategory_id;


create or replace view "public"."v_expenses_list" as  SELECT e.id,
    e.expense_date,
    e.amount,
    v.name AS vendor_name,
    e.source,
    e.status
   FROM (expenses e
     LEFT JOIN vendors v ON ((v.id = e.vendor_id)));


create or replace view "public"."v_grn_items_with_order" as  SELECT gi.id AS grn_item_id,
    gi.grn_id,
    g.grn_number,
    g.date_received,
    g.purchase_order_id,
    g.vendor_id,
    g.vendor_name,
    g.status,
    g.ref_no,
    gi.po_item_id,
    gi.description,
    gi.uom,
    (gi.qty_input)::numeric AS qty_input,
    (gi.qty_received)::numeric AS qty_received,
    (gi.qty_overage)::numeric AS qty_overage,
    COALESCE(poi.qty, (0)::numeric) AS qty_order
   FROM ((grn_items gi
     JOIN grns g ON ((g.id = gi.grn_id)))
     LEFT JOIN po_items poi ON ((poi.id = gi.po_item_id)));


create or replace view "public"."v_petty_cash_box_summary" as  WITH tx AS (
         SELECT p.cashbox_id,
            (sum(
                CASE
                    WHEN (p.type = ANY (ARRAY['topup'::text, 'adjust_in'::text])) THEN p.amount
                    ELSE (0)::bigint
                END))::bigint AS in_amount,
            (sum(
                CASE
                    WHEN (p.type = ANY (ARRAY['settlement'::text, 'adjust_out'::text])) THEN p.amount
                    ELSE (0)::bigint
                END))::bigint AS out_amount,
            max(p.txn_date) AS last_txn
           FROM petty_cash_txns p
          GROUP BY p.cashbox_id
        ), ex AS (
         SELECT e.cashbox_id,
            (sum(
                CASE
                    WHEN (e.status = 'posted'::text) THEN e.amount
                    ELSE (0)::bigint
                END))::bigint AS spent_amount,
            max(e.expense_date) AS last_exp
           FROM expenses e
          WHERE (e.status = 'posted'::text)
          GROUP BY e.cashbox_id
        )
 SELECT pcb.id,
    pcb.name,
    COALESCE(tx.in_amount, (0)::bigint) AS in_amount,
    COALESCE(tx.out_amount, (0)::bigint) AS out_amount,
    COALESCE(ex.spent_amount, (0)::bigint) AS spent_amount,
    ((COALESCE(tx.in_amount, (0)::bigint) - COALESCE(tx.out_amount, (0)::bigint)) - COALESCE(ex.spent_amount, (0)::bigint)) AS balance,
    GREATEST(COALESCE(tx.last_txn, '1970-01-01'::date), COALESCE(ex.last_exp, '1970-01-01'::date)) AS last_activity
   FROM ((petty_cash_boxes pcb
     LEFT JOIN tx ON ((tx.cashbox_id = pcb.id)))
     LEFT JOIN ex ON ((ex.cashbox_id = pcb.id)))
  ORDER BY pcb.name;


create or replace view "public"."v_petty_cash_ledger" as  WITH l_tx AS (
         SELECT p.cashbox_id,
            p.txn_date AS event_date,
            p.type AS event_type,
            NULL::bigint AS expense_id,
            p.amount,
                CASE
                    WHEN ((p.type = ANY (ARRAY['topup'::text, 'adjust_in'::text])) OR (p.type ~~* 'topup%'::text)) THEN p.amount
                    WHEN ((p.type = ANY (ARRAY['settlement'::text, 'adjust_out'::text])) OR (p.type ~~* 'settlement%'::text) OR (p.type ~~* 'adjust_out%'::text)) THEN (- p.amount)
                    ELSE (0)::bigint
                END AS signed_amount,
            p.ref_no,
            p.note,
            'txn'::text AS source,
            NULL::bigint AS shareholder_id,
            NULL::text AS shareholder_name,
            p.id AS sort_id
           FROM petty_cash_txns p
        ), l_ex AS (
         SELECT e.cashbox_id,
            e.expense_date AS event_date,
            'expense'::text AS event_type,
            e.id AS expense_id,
            e.amount,
            (- e.amount) AS signed_amount,
            e.invoice_no AS ref_no,
            e.note,
            'expense'::text AS source,
            NULL::bigint AS shareholder_id,
            NULL::text AS shareholder_name,
            e.id AS sort_id
           FROM expenses e
          WHERE ((e.source = 'PETTY'::text) AND (e.status <> 'void'::text))
        )
 SELECT cashbox_id,
    event_date,
    event_type,
    expense_id,
    amount,
    signed_amount,
    ref_no,
    note,
    source,
    shareholder_id,
    shareholder_name,
    (sum(signed_amount) OVER (PARTITION BY cashbox_id ORDER BY event_date, source, event_type, sort_id ROWS UNBOUNDED PRECEDING))::bigint AS running_balance
   FROM ( SELECT l_tx.cashbox_id,
            l_tx.event_date,
            l_tx.event_type,
            l_tx.expense_id,
            l_tx.amount,
            l_tx.signed_amount,
            l_tx.ref_no,
            l_tx.note,
            l_tx.source,
            l_tx.shareholder_id,
            l_tx.shareholder_name,
            l_tx.sort_id
           FROM l_tx
        UNION ALL
         SELECT l_ex.cashbox_id,
            l_ex.event_date,
            l_ex.event_type,
            l_ex.expense_id,
            l_ex.amount,
            l_ex.signed_amount,
            l_ex.ref_no,
            l_ex.note,
            l_ex.source,
            l_ex.shareholder_id,
            l_ex.shareholder_name,
            l_ex.sort_id
           FROM l_ex) x
  ORDER BY event_date, source, event_type, sort_id;


create or replace view "public"."v_po_item_fulfillment" as  SELECT pi.id AS po_item_id,
    pi.purchase_order_id,
    (pi.qty)::numeric AS qty_order,
    COALESCE(sum(gi.qty_matched), (0)::numeric) AS qty_matched,
    (pi.qty - COALESCE(sum(gi.qty_matched), (0)::numeric)) AS qty_remaining
   FROM (po_items pi
     LEFT JOIN grn_items gi ON ((gi.po_item_id = pi.id)))
  GROUP BY pi.id;


create or replace view "public"."v_po_paid" as  SELECT pea.purchase_order_id,
    COALESCE(sum(pea.amount), (0)::numeric) AS paid
   FROM (po_expense_allocations pea
     JOIN expenses e ON (((e.id = pea.expense_id) AND (e.status = 'posted'::text))))
  GROUP BY pea.purchase_order_id;


create or replace view "public"."v_po_payment_summary" as  SELECT a.purchase_order_id AS po_id,
    sum(a.amount) AS amount_paid
   FROM (po_expense_allocations a
     JOIN expenses e ON ((e.id = a.expense_id)))
  WHERE (e.status = 'posted'::text)
  GROUP BY a.purchase_order_id;


create or replace view "public"."v_po_summary" as  SELECT po.id,
    po.po_number,
    po.vendor_id,
    po.po_date,
    po.delivery_date,
    po.is_tax_included,
    po.tax_percent,
    po.status,
    po.note,
    COALESCE(sum((it.qty * it.unit_price)), (0)::numeric) AS subtotal,
        CASE
            WHEN po.is_tax_included THEN (0)::numeric
            ELSE (COALESCE(sum((it.qty * it.unit_price)), (0)::numeric) * (COALESCE(po.tax_percent, (0)::numeric) / (100)::numeric))
        END AS tax_amount,
        CASE
            WHEN po.is_tax_included THEN COALESCE(sum((it.qty * it.unit_price)), (0)::numeric)
            ELSE (COALESCE(sum((it.qty * it.unit_price)), (0)::numeric) + (COALESCE(sum((it.qty * it.unit_price)), (0)::numeric) * (COALESCE(po.tax_percent, (0)::numeric) / (100)::numeric)))
        END AS total_amount
   FROM (purchase_orders po
     LEFT JOIN po_items it ON ((it.purchase_order_id = po.id)))
  GROUP BY po.id;


create or replace view "public"."v_po_with_terms" as  SELECT s.id,
    s.po_number,
    s.vendor_id,
    s.po_date,
    s.delivery_date,
    s.is_tax_included,
    s.tax_percent,
    s.status,
    s.note,
    s.subtotal,
    s.tax_amount,
    s.total_amount,
    v.name AS vendor_name,
    COALESCE(po.term_code, v.payment_type, 'NET'::text) AS effective_term_code,
    COALESCE(po.term_days, v.term_days, 0) AS effective_term_days,
    compute_due_date(po.po_date, po.delivery_date, COALESCE(po.term_code, v.payment_type, 'NET'::text), COALESCE(po.term_days, v.term_days, 0)) AS due_date_formula,
    COALESCE(po.due_date_override, compute_due_date(po.po_date, po.delivery_date, COALESCE(po.term_code, v.payment_type, 'NET'::text), COALESCE(po.term_days, v.term_days, 0))) AS due_date_effective
   FROM ((v_po_summary s
     JOIN purchase_orders po ON ((po.id = s.id)))
     LEFT JOIN vendors v ON ((v.id = po.vendor_id)));


create or replace view "public"."v_pt_inflows_list" as  SELECT 'CI'::text AS inflow_kind,
    c.transfer_date AS inflow_date,
    c.amount,
    c.bank_account_id AS account_id,
    b.name AS account_name,
    c.id AS ref_id,
    c.capital_injection_id AS plan_id,
    sh.name AS shareholder_name,
    NULL::text AS inflow_type,
    c.deposit_tx_ref AS source_doc,
    c.note
   FROM ((capital_contributions c
     LEFT JOIN shareholders sh ON ((sh.id = c.shareholder_id)))
     LEFT JOIN bank_accounts b ON ((b.id = c.bank_account_id)))
  WHERE (c.status = 'posted'::text)
UNION ALL
 SELECT 'TOPUP'::text AS inflow_kind,
    t.topup_date AS inflow_date,
    t.amount,
    t.account_id,
    b.name AS account_name,
    t.id AS ref_id,
    NULL::bigint AS plan_id,
    NULL::text AS shareholder_name,
    t.inflow_type,
    t.source_doc,
    t.note
   FROM (pt_topups t
     LEFT JOIN bank_accounts b ON ((b.id = t.account_id)))
  ORDER BY 2 DESC, 6 DESC;


create or replace view "public"."v_purchase_orders_with_payment" as  WITH base AS (
         SELECT p.id,
            p.po_number,
            p.vendor_id,
            p.po_date,
            p.delivery_date,
            p.status,
            p.is_tax_included,
            p.tax_percent,
            p.total,
            p.note,
            p.created_at,
            p.updated_at,
            p.term_code,
            p.term_days,
            p.due_date_override,
            COALESCE(s.amount_paid, (0)::numeric) AS amount_paid,
            GREATEST(((p.total)::numeric - COALESCE(s.amount_paid, (0)::numeric)), (0)::numeric) AS balance_due,
            (COALESCE((p.due_date_override)::timestamp without time zone, (p.po_date + ((COALESCE(p.term_days, 0))::double precision * '1 day'::interval))))::date AS due_date
           FROM (purchase_orders p
             LEFT JOIN v_po_payment_summary s ON ((s.po_id = p.id)))
        )
 SELECT id,
    po_number,
    vendor_id,
    po_date,
    delivery_date,
    status,
    is_tax_included,
    tax_percent,
    total,
    note,
    created_at,
    updated_at,
    term_code,
    term_days,
    due_date_override,
    amount_paid,
    balance_due,
    due_date,
        CASE
            WHEN (COALESCE(amount_paid, (0)::numeric) = (0)::numeric) THEN 'UNPAID'::text
            WHEN (COALESCE(amount_paid, (0)::numeric) < (total)::numeric) THEN 'PARTIAL'::text
            ELSE 'PAID'::text
        END AS payment_status,
    ((balance_due > (0)::numeric) AND (due_date < CURRENT_DATE)) AS is_overdue,
        CASE
            WHEN ((balance_due > (0)::numeric) AND (due_date < CURRENT_DATE)) THEN (CURRENT_DATE - due_date)
            ELSE 0
        END AS days_overdue
   FROM base b;


create or replace view "public"."v_rab_allocation_months" as  SELECT (date_trunc('month'::text, (alloc_date)::timestamp with time zone))::date AS period_month,
    count(*) AS rows,
    (COALESCE(sum(amount), (0)::numeric))::bigint AS total_allocated
   FROM rab_allocations
  GROUP BY ((date_trunc('month'::text, (alloc_date)::timestamp with time zone))::date)
  ORDER BY ((date_trunc('month'::text, (alloc_date)::timestamp with time zone))::date) DESC;


create or replace view "public"."v_rab_allocation_totals" as  SELECT (COALESCE(sum(amount), (0)::numeric))::bigint AS total_all_time,
    (COALESCE(sum(amount) FILTER (WHERE ((alloc_date >= date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone)) AND (alloc_date < (date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone) + '1 mon'::interval)))), (0)::numeric))::bigint AS total_this_month
   FROM rab_allocations a;


create or replace view "public"."v_rab_month_grid" as  WITH sh AS (
         SELECT shareholders.id AS shareholder_id,
            shareholders.name AS shareholder_name,
            shareholders.ownership_percent
           FROM shareholders
          WHERE (shareholders.active = true)
        ), months AS (
         SELECT DISTINCT (date_trunc('month'::text, (rab_allocations.alloc_date)::timestamp with time zone))::date AS period_month
           FROM rab_allocations
        )
 SELECT m.period_month,
    s.shareholder_id,
    s.shareholder_name,
    s.ownership_percent,
    COALESCE(( SELECT ra.amount
           FROM rab_allocations ra
          WHERE ((ra.alloc_date = m.period_month) AND (ra.shareholder_id = s.shareholder_id))), (0)::bigint) AS allocated_this_month,
    (COALESCE(( SELECT sum(ra2.amount) AS sum
           FROM rab_allocations ra2
          WHERE ((ra2.shareholder_id = s.shareholder_id) AND (date_trunc('month'::text, (ra2.alloc_date)::timestamp with time zone) <= m.period_month))), (0)::numeric))::bigint AS allocated_cumulative
   FROM (months m
     CROSS JOIN sh s)
  ORDER BY m.period_month DESC, s.shareholder_name;


create or replace view "public"."v_rab_rekening_summary" as  SELECT (COALESCE(( SELECT sum(a.amount) AS sum
           FROM rab_allocations a), (0)::numeric))::bigint AS total_rab,
    (COALESCE(( SELECT sum(e.amount) AS sum
           FROM expenses e
          WHERE ((e.status = 'posted'::text) AND ((e.source = 'RAB'::text) OR (e.shareholder_id IS NOT NULL)))), (0)::numeric))::bigint AS terpakai,
    ((COALESCE(( SELECT sum(a.amount) AS sum
           FROM rab_allocations a), (0)::numeric))::bigint - (COALESCE(( SELECT sum(e.amount) AS sum
           FROM expenses e
          WHERE ((e.status = 'posted'::text) AND ((e.source = 'RAB'::text) OR (e.shareholder_id IS NOT NULL)))), (0)::numeric))::bigint) AS tersedia;


create or replace view "public"."v_rab_used_per_month" as  SELECT period_month,
    shareholder_id,
    (sum(amount))::bigint AS used_this_month
   FROM expenses e
  WHERE ((status = 'posted'::text) AND ((source = 'RAB'::text) OR (shareholder_id IS NOT NULL)) AND (shareholder_id IS NOT NULL))
  GROUP BY period_month, shareholder_id;


create or replace view "public"."v_shareholders_percent_check" as  SELECT (COALESCE(sum(
        CASE
            WHEN active THEN ownership_percent
            ELSE (0)::numeric
        END), (0)::numeric))::numeric(7,2) AS total_active_percent,
    ((100)::numeric(7,2) - (COALESCE(sum(
        CASE
            WHEN active THEN ownership_percent
            ELSE (0)::numeric
        END), (0)::numeric))::numeric(7,2)) AS gap_to_100
   FROM shareholders;


create or replace view "public"."view_purchase_orders" as  SELECT po.id,
    po.po_number,
    v.name AS vendor_name,
    po.po_date,
    po.delivery_date,
    po.is_tax_included,
    po.tax_percent,
    po.status,
    COALESCE(sum((pi.unit_price * pi.qty)), (0)::numeric) AS total_amount
   FROM ((purchase_orders po
     LEFT JOIN vendors v ON ((v.id = po.vendor_id)))
     LEFT JOIN po_items pi ON ((pi.purchase_order_id = po.id)))
  GROUP BY po.id, v.name;


create or replace view "public"."v_grn_items_overage" as  WITH base AS (
         SELECT v.grn_item_id,
            v.grn_id,
            v.grn_number,
            v.date_received,
            v.purchase_order_id,
            v.vendor_id,
            v.vendor_name,
            v.status,
            v.ref_no,
            v.po_item_id,
            v.description,
            v.uom,
            v.qty_input,
            v.qty_received,
            v.qty_overage,
            v.qty_order,
                CASE
                    WHEN (v.po_item_id IS NULL) THEN (0)::numeric
                    ELSE COALESCE(sum(v.qty_received) OVER (PARTITION BY v.po_item_id ORDER BY v.date_received, v.grn_id, v.grn_item_id ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), (0)::numeric)
                END AS qty_before_this
           FROM v_grn_items_with_order v
        )
 SELECT grn_item_id,
    grn_id,
    grn_number,
    date_received,
    purchase_order_id,
    vendor_id,
    vendor_name,
    status,
    ref_no,
    po_item_id,
    description,
    uom,
    qty_input,
    qty_received,
    qty_overage,
    qty_order,
    qty_before_this,
        CASE
            WHEN ((po_item_id IS NULL) OR (purchase_order_id IS NULL)) THEN (0)::numeric
            ELSE GREATEST((qty_received - GREATEST((qty_order - qty_before_this), (0)::numeric)), (0)::numeric)
        END AS overage_row
   FROM base b;


create or replace view "public"."v_grn_list" as  SELECT g.id,
    g.grn_number,
    g.date_received,
    g.purchase_order_id,
    po.po_number,
    g.vendor_id,
    max(COALESCE(g.vendor_name, v.name, '-'::text)) AS vendor_name,
    g.ref_no,
    g.status,
    COALESCE(sum(
        CASE
            WHEN (v2.po_item_id IS NOT NULL) THEN v2.qty_order
            ELSE (0)::numeric
        END), (0)::numeric) AS po_qty,
    COALESCE(sum(v2.qty_received), (0)::numeric) AS received_qty,
    COALESCE(NULLIF(sum(v2.qty_overage), (0)::numeric), sum(v2.overage_row), (0)::numeric) AS overage_qty
   FROM (((( SELECT DISTINCT v_grn_items_with_order.grn_id AS id,
            v_grn_items_with_order.grn_number,
            v_grn_items_with_order.date_received,
            v_grn_items_with_order.purchase_order_id,
            v_grn_items_with_order.vendor_id,
            v_grn_items_with_order.vendor_name,
            v_grn_items_with_order.ref_no,
            v_grn_items_with_order.status
           FROM v_grn_items_with_order) g
     LEFT JOIN purchase_orders po ON ((po.id = g.purchase_order_id)))
     LEFT JOIN vendors v ON ((v.id = g.vendor_id)))
     LEFT JOIN v_grn_items_overage v2 ON ((v2.grn_id = g.id)))
  GROUP BY g.id, g.grn_number, g.date_received, g.purchase_order_id, po.po_number, g.vendor_id, g.ref_no, g.status;


create or replace view "public"."v_petty_box_summary" as  WITH tx AS (
         SELECT p.cashbox_id,
            (sum(
                CASE
                    WHEN ((p.type = ANY (ARRAY['topup'::text, 'adjust_in'::text])) OR (p.type ~~* 'topup%'::text)) THEN p.amount
                    ELSE (0)::bigint
                END))::bigint AS in_amount,
            (sum(
                CASE
                    WHEN ((p.type = ANY (ARRAY['settlement'::text, 'adjust_out'::text])) OR (p.type ~~* 'settlement%'::text) OR (p.type ~~* 'adjust_out%'::text)) THEN p.amount
                    ELSE (0)::bigint
                END))::bigint AS out_amount,
            min(p.txn_date) AS first_txn,
            max(p.txn_date) AS last_txn
           FROM petty_cash_txns p
          GROUP BY p.cashbox_id
        ), ex AS (
         SELECT e.cashbox_id,
            (sum(e.amount))::bigint AS spent_amount,
            max(e.expense_date) AS last_exp
           FROM expenses e
          WHERE ((e.source = 'PETTY'::text) AND (e.status <> 'void'::text))
          GROUP BY e.cashbox_id
        ), rb AS (
         SELECT v_petty_cash_ledger.cashbox_id,
            max(v_petty_cash_ledger.running_balance) AS balance
           FROM v_petty_cash_ledger
          GROUP BY v_petty_cash_ledger.cashbox_id
        )
 SELECT b.id,
    b.name,
    COALESCE(tx.in_amount, (0)::bigint) AS in_amount,
    COALESCE(tx.out_amount, (0)::bigint) AS out_amount,
    COALESCE(ex.spent_amount, (0)::bigint) AS spent_amount,
    COALESCE(rb.balance, (0)::bigint) AS balance,
    GREATEST(tx.last_txn, ex.last_exp) AS last_activity
   FROM (((petty_cash_boxes b
     LEFT JOIN tx ON ((tx.cashbox_id = b.id)))
     LEFT JOIN ex ON ((ex.cashbox_id = b.id)))
     LEFT JOIN rb ON ((rb.cashbox_id = b.id)))
  ORDER BY b.name;


create or replace view "public"."v_po_finance" as  WITH po_base AS (
         SELECT po.id,
            po.po_number,
            po.vendor_id,
            v.name AS vendor_name,
            po.is_tax_included,
            COALESCE(po.tax_percent, (0)::numeric) AS tax_percent
           FROM (purchase_orders po
             LEFT JOIN vendors v ON ((v.id = po.vendor_id)))
        ), po_items_sum AS (
         SELECT i.purchase_order_id AS id,
            sum((COALESCE(i.qty, (0)::numeric) * COALESCE(i.unit_price, (0)::numeric))) AS subtotal
           FROM po_items i
          GROUP BY i.purchase_order_id
        ), terms AS (
         SELECT v_po_with_terms.id,
            COALESCE(v_po_with_terms.total_amount, (0)::numeric) AS total_amount
           FROM v_po_with_terms
        ), po_total AS (
         SELECT b.id,
            COALESCE(t.total_amount,
                CASE
                    WHEN b.is_tax_included THEN COALESCE(s.subtotal, (0)::numeric)
                    ELSE round((COALESCE(s.subtotal, (0)::numeric) * ((1)::numeric + (b.tax_percent / 100.0))))
                END) AS total
           FROM ((po_base b
             LEFT JOIN terms t ON ((t.id = b.id)))
             LEFT JOIN po_items_sum s ON ((s.id = b.id)))
        ), po_paid AS (
         SELECT a.purchase_order_id AS id,
            sum(
                CASE
                    WHEN (e.status = 'posted'::text) THEN COALESCE(a.amount, (0)::numeric)
                    ELSE (0)::numeric
                END) AS paid
           FROM (po_expense_allocations a
             LEFT JOIN expenses e ON ((e.id = a.expense_id)))
          GROUP BY a.purchase_order_id
        )
 SELECT pt.id,
    COALESCE(pt.total, (0)::numeric) AS total,
    COALESCE(pp.paid, (0)::numeric) AS paid,
    GREATEST((COALESCE(pt.total, (0)::numeric) - COALESCE(pp.paid, (0)::numeric)), (0)::numeric) AS outstanding
   FROM (po_total pt
     LEFT JOIN po_paid pp ON ((pp.id = pt.id)));


create or replace view "public"."v_rab_balance_matrix" as  WITH months AS (
         SELECT DISTINCT (date_trunc('month'::text, (rab_allocations.alloc_date)::timestamp with time zone))::date AS period_month
           FROM rab_allocations
        UNION
         SELECT DISTINCT expenses.period_month
           FROM expenses
        ), sh AS (
         SELECT shareholders.id AS shareholder_id,
            shareholders.name AS shareholder_name,
            shareholders.ownership_percent
           FROM shareholders
          WHERE (shareholders.active = true)
        ), alloc AS (
         SELECT (date_trunc('month'::text, (rab_allocations.alloc_date)::timestamp with time zone))::date AS period_month,
            rab_allocations.shareholder_id,
            (sum(rab_allocations.amount))::bigint AS alloc_this_month
           FROM rab_allocations
          GROUP BY ((date_trunc('month'::text, (rab_allocations.alloc_date)::timestamp with time zone))::date), rab_allocations.shareholder_id
        ), used AS (
         SELECT v_rab_used_per_month.period_month,
            v_rab_used_per_month.shareholder_id,
            v_rab_used_per_month.used_this_month
           FROM v_rab_used_per_month
        ), grid AS (
         SELECT m.period_month,
            s.shareholder_id,
            s.shareholder_name,
            s.ownership_percent,
            COALESCE(a.alloc_this_month, (0)::bigint) AS allocated_this_month,
            COALESCE(u.used_this_month, (0)::bigint) AS used_this_month
           FROM (((months m
             CROSS JOIN sh s)
             LEFT JOIN alloc a ON (((a.period_month = m.period_month) AND (a.shareholder_id = s.shareholder_id))))
             LEFT JOIN used u ON (((u.period_month = m.period_month) AND (u.shareholder_id = s.shareholder_id))))
        )
 SELECT period_month,
    shareholder_id,
    shareholder_name,
    ownership_percent,
    allocated_this_month,
    used_this_month,
    (( SELECT sum(x.allocated_this_month) AS sum
           FROM grid x
          WHERE ((x.shareholder_id = g.shareholder_id) AND (x.period_month <= g.period_month))))::bigint AS allocated_cumulative,
    (( SELECT sum(x.used_this_month) AS sum
           FROM grid x
          WHERE ((x.shareholder_id = g.shareholder_id) AND (x.period_month <= g.period_month))))::bigint AS used_cumulative,
    ((( SELECT sum(x.allocated_this_month) AS sum
           FROM grid x
          WHERE ((x.shareholder_id = g.shareholder_id) AND (x.period_month <= g.period_month))) - ( SELECT sum(x.used_this_month) AS sum
           FROM grid x
          WHERE ((x.shareholder_id = g.shareholder_id) AND (x.period_month <= g.period_month)))))::bigint AS available_cumulative
   FROM grid g
  ORDER BY period_month DESC, shareholder_name;


grant delete on table "public"."bank_accounts" to "anon";

grant insert on table "public"."bank_accounts" to "anon";

grant references on table "public"."bank_accounts" to "anon";

grant select on table "public"."bank_accounts" to "anon";

grant trigger on table "public"."bank_accounts" to "anon";

grant truncate on table "public"."bank_accounts" to "anon";

grant update on table "public"."bank_accounts" to "anon";

grant delete on table "public"."bank_accounts" to "authenticated";

grant insert on table "public"."bank_accounts" to "authenticated";

grant references on table "public"."bank_accounts" to "authenticated";

grant select on table "public"."bank_accounts" to "authenticated";

grant trigger on table "public"."bank_accounts" to "authenticated";

grant truncate on table "public"."bank_accounts" to "authenticated";

grant update on table "public"."bank_accounts" to "authenticated";

grant delete on table "public"."bank_accounts" to "service_role";

grant insert on table "public"."bank_accounts" to "service_role";

grant references on table "public"."bank_accounts" to "service_role";

grant select on table "public"."bank_accounts" to "service_role";

grant trigger on table "public"."bank_accounts" to "service_role";

grant truncate on table "public"."bank_accounts" to "service_role";

grant update on table "public"."bank_accounts" to "service_role";

grant delete on table "public"."budget_lines" to "anon";

grant insert on table "public"."budget_lines" to "anon";

grant references on table "public"."budget_lines" to "anon";

grant select on table "public"."budget_lines" to "anon";

grant trigger on table "public"."budget_lines" to "anon";

grant truncate on table "public"."budget_lines" to "anon";

grant update on table "public"."budget_lines" to "anon";

grant delete on table "public"."budget_lines" to "authenticated";

grant insert on table "public"."budget_lines" to "authenticated";

grant references on table "public"."budget_lines" to "authenticated";

grant select on table "public"."budget_lines" to "authenticated";

grant trigger on table "public"."budget_lines" to "authenticated";

grant truncate on table "public"."budget_lines" to "authenticated";

grant update on table "public"."budget_lines" to "authenticated";

grant delete on table "public"."budget_lines" to "service_role";

grant insert on table "public"."budget_lines" to "service_role";

grant references on table "public"."budget_lines" to "service_role";

grant select on table "public"."budget_lines" to "service_role";

grant trigger on table "public"."budget_lines" to "service_role";

grant truncate on table "public"."budget_lines" to "service_role";

grant update on table "public"."budget_lines" to "service_role";

grant delete on table "public"."capital_contributions" to "anon";

grant insert on table "public"."capital_contributions" to "anon";

grant references on table "public"."capital_contributions" to "anon";

grant select on table "public"."capital_contributions" to "anon";

grant trigger on table "public"."capital_contributions" to "anon";

grant truncate on table "public"."capital_contributions" to "anon";

grant update on table "public"."capital_contributions" to "anon";

grant delete on table "public"."capital_contributions" to "authenticated";

grant insert on table "public"."capital_contributions" to "authenticated";

grant references on table "public"."capital_contributions" to "authenticated";

grant select on table "public"."capital_contributions" to "authenticated";

grant trigger on table "public"."capital_contributions" to "authenticated";

grant truncate on table "public"."capital_contributions" to "authenticated";

grant update on table "public"."capital_contributions" to "authenticated";

grant delete on table "public"."capital_contributions" to "service_role";

grant insert on table "public"."capital_contributions" to "service_role";

grant references on table "public"."capital_contributions" to "service_role";

grant select on table "public"."capital_contributions" to "service_role";

grant trigger on table "public"."capital_contributions" to "service_role";

grant truncate on table "public"."capital_contributions" to "service_role";

grant update on table "public"."capital_contributions" to "service_role";

grant delete on table "public"."capital_injections" to "anon";

grant insert on table "public"."capital_injections" to "anon";

grant references on table "public"."capital_injections" to "anon";

grant select on table "public"."capital_injections" to "anon";

grant trigger on table "public"."capital_injections" to "anon";

grant truncate on table "public"."capital_injections" to "anon";

grant update on table "public"."capital_injections" to "anon";

grant delete on table "public"."capital_injections" to "authenticated";

grant insert on table "public"."capital_injections" to "authenticated";

grant references on table "public"."capital_injections" to "authenticated";

grant select on table "public"."capital_injections" to "authenticated";

grant trigger on table "public"."capital_injections" to "authenticated";

grant truncate on table "public"."capital_injections" to "authenticated";

grant update on table "public"."capital_injections" to "authenticated";

grant delete on table "public"."capital_injections" to "service_role";

grant insert on table "public"."capital_injections" to "service_role";

grant references on table "public"."capital_injections" to "service_role";

grant select on table "public"."capital_injections" to "service_role";

grant trigger on table "public"."capital_injections" to "service_role";

grant truncate on table "public"."capital_injections" to "service_role";

grant update on table "public"."capital_injections" to "service_role";

grant delete on table "public"."categories" to "anon";

grant insert on table "public"."categories" to "anon";

grant references on table "public"."categories" to "anon";

grant select on table "public"."categories" to "anon";

grant trigger on table "public"."categories" to "anon";

grant truncate on table "public"."categories" to "anon";

grant update on table "public"."categories" to "anon";

grant delete on table "public"."categories" to "authenticated";

grant insert on table "public"."categories" to "authenticated";

grant references on table "public"."categories" to "authenticated";

grant select on table "public"."categories" to "authenticated";

grant trigger on table "public"."categories" to "authenticated";

grant truncate on table "public"."categories" to "authenticated";

grant update on table "public"."categories" to "authenticated";

grant delete on table "public"."categories" to "service_role";

grant insert on table "public"."categories" to "service_role";

grant references on table "public"."categories" to "service_role";

grant select on table "public"."categories" to "service_role";

grant trigger on table "public"."categories" to "service_role";

grant truncate on table "public"."categories" to "service_role";

grant update on table "public"."categories" to "service_role";

grant delete on table "public"."ci_obligations" to "anon";

grant insert on table "public"."ci_obligations" to "anon";

grant references on table "public"."ci_obligations" to "anon";

grant select on table "public"."ci_obligations" to "anon";

grant trigger on table "public"."ci_obligations" to "anon";

grant truncate on table "public"."ci_obligations" to "anon";

grant update on table "public"."ci_obligations" to "anon";

grant delete on table "public"."ci_obligations" to "authenticated";

grant insert on table "public"."ci_obligations" to "authenticated";

grant references on table "public"."ci_obligations" to "authenticated";

grant select on table "public"."ci_obligations" to "authenticated";

grant trigger on table "public"."ci_obligations" to "authenticated";

grant truncate on table "public"."ci_obligations" to "authenticated";

grant update on table "public"."ci_obligations" to "authenticated";

grant delete on table "public"."ci_obligations" to "service_role";

grant insert on table "public"."ci_obligations" to "service_role";

grant references on table "public"."ci_obligations" to "service_role";

grant select on table "public"."ci_obligations" to "service_role";

grant trigger on table "public"."ci_obligations" to "service_role";

grant truncate on table "public"."ci_obligations" to "service_role";

grant update on table "public"."ci_obligations" to "service_role";

grant delete on table "public"."expenses" to "anon";

grant insert on table "public"."expenses" to "anon";

grant references on table "public"."expenses" to "anon";

grant select on table "public"."expenses" to "anon";

grant trigger on table "public"."expenses" to "anon";

grant truncate on table "public"."expenses" to "anon";

grant update on table "public"."expenses" to "anon";

grant delete on table "public"."expenses" to "authenticated";

grant insert on table "public"."expenses" to "authenticated";

grant references on table "public"."expenses" to "authenticated";

grant select on table "public"."expenses" to "authenticated";

grant trigger on table "public"."expenses" to "authenticated";

grant truncate on table "public"."expenses" to "authenticated";

grant update on table "public"."expenses" to "authenticated";

grant delete on table "public"."expenses" to "service_role";

grant insert on table "public"."expenses" to "service_role";

grant references on table "public"."expenses" to "service_role";

grant select on table "public"."expenses" to "service_role";

grant trigger on table "public"."expenses" to "service_role";

grant truncate on table "public"."expenses" to "service_role";

grant update on table "public"."expenses" to "service_role";

grant delete on table "public"."grn_items" to "anon";

grant insert on table "public"."grn_items" to "anon";

grant references on table "public"."grn_items" to "anon";

grant select on table "public"."grn_items" to "anon";

grant trigger on table "public"."grn_items" to "anon";

grant truncate on table "public"."grn_items" to "anon";

grant update on table "public"."grn_items" to "anon";

grant delete on table "public"."grn_items" to "authenticated";

grant insert on table "public"."grn_items" to "authenticated";

grant references on table "public"."grn_items" to "authenticated";

grant select on table "public"."grn_items" to "authenticated";

grant trigger on table "public"."grn_items" to "authenticated";

grant truncate on table "public"."grn_items" to "authenticated";

grant update on table "public"."grn_items" to "authenticated";

grant delete on table "public"."grn_items" to "service_role";

grant insert on table "public"."grn_items" to "service_role";

grant references on table "public"."grn_items" to "service_role";

grant select on table "public"."grn_items" to "service_role";

grant trigger on table "public"."grn_items" to "service_role";

grant truncate on table "public"."grn_items" to "service_role";

grant update on table "public"."grn_items" to "service_role";

grant delete on table "public"."grns" to "anon";

grant insert on table "public"."grns" to "anon";

grant references on table "public"."grns" to "anon";

grant select on table "public"."grns" to "anon";

grant trigger on table "public"."grns" to "anon";

grant truncate on table "public"."grns" to "anon";

grant update on table "public"."grns" to "anon";

grant delete on table "public"."grns" to "authenticated";

grant insert on table "public"."grns" to "authenticated";

grant references on table "public"."grns" to "authenticated";

grant select on table "public"."grns" to "authenticated";

grant trigger on table "public"."grns" to "authenticated";

grant truncate on table "public"."grns" to "authenticated";

grant update on table "public"."grns" to "authenticated";

grant delete on table "public"."grns" to "service_role";

grant insert on table "public"."grns" to "service_role";

grant references on table "public"."grns" to "service_role";

grant select on table "public"."grns" to "service_role";

grant trigger on table "public"."grns" to "service_role";

grant truncate on table "public"."grns" to "service_role";

grant update on table "public"."grns" to "service_role";

grant delete on table "public"."petty_cash_boxes" to "anon";

grant insert on table "public"."petty_cash_boxes" to "anon";

grant references on table "public"."petty_cash_boxes" to "anon";

grant select on table "public"."petty_cash_boxes" to "anon";

grant trigger on table "public"."petty_cash_boxes" to "anon";

grant truncate on table "public"."petty_cash_boxes" to "anon";

grant update on table "public"."petty_cash_boxes" to "anon";

grant delete on table "public"."petty_cash_boxes" to "authenticated";

grant insert on table "public"."petty_cash_boxes" to "authenticated";

grant references on table "public"."petty_cash_boxes" to "authenticated";

grant select on table "public"."petty_cash_boxes" to "authenticated";

grant trigger on table "public"."petty_cash_boxes" to "authenticated";

grant truncate on table "public"."petty_cash_boxes" to "authenticated";

grant update on table "public"."petty_cash_boxes" to "authenticated";

grant delete on table "public"."petty_cash_boxes" to "service_role";

grant insert on table "public"."petty_cash_boxes" to "service_role";

grant references on table "public"."petty_cash_boxes" to "service_role";

grant select on table "public"."petty_cash_boxes" to "service_role";

grant trigger on table "public"."petty_cash_boxes" to "service_role";

grant truncate on table "public"."petty_cash_boxes" to "service_role";

grant update on table "public"."petty_cash_boxes" to "service_role";

grant delete on table "public"."petty_cash_txns" to "anon";

grant insert on table "public"."petty_cash_txns" to "anon";

grant references on table "public"."petty_cash_txns" to "anon";

grant select on table "public"."petty_cash_txns" to "anon";

grant trigger on table "public"."petty_cash_txns" to "anon";

grant truncate on table "public"."petty_cash_txns" to "anon";

grant update on table "public"."petty_cash_txns" to "anon";

grant delete on table "public"."petty_cash_txns" to "authenticated";

grant insert on table "public"."petty_cash_txns" to "authenticated";

grant references on table "public"."petty_cash_txns" to "authenticated";

grant select on table "public"."petty_cash_txns" to "authenticated";

grant trigger on table "public"."petty_cash_txns" to "authenticated";

grant truncate on table "public"."petty_cash_txns" to "authenticated";

grant update on table "public"."petty_cash_txns" to "authenticated";

grant delete on table "public"."petty_cash_txns" to "service_role";

grant insert on table "public"."petty_cash_txns" to "service_role";

grant references on table "public"."petty_cash_txns" to "service_role";

grant select on table "public"."petty_cash_txns" to "service_role";

grant trigger on table "public"."petty_cash_txns" to "service_role";

grant truncate on table "public"."petty_cash_txns" to "service_role";

grant update on table "public"."petty_cash_txns" to "service_role";

grant delete on table "public"."po_expense_allocations" to "anon";

grant insert on table "public"."po_expense_allocations" to "anon";

grant references on table "public"."po_expense_allocations" to "anon";

grant select on table "public"."po_expense_allocations" to "anon";

grant trigger on table "public"."po_expense_allocations" to "anon";

grant truncate on table "public"."po_expense_allocations" to "anon";

grant update on table "public"."po_expense_allocations" to "anon";

grant delete on table "public"."po_expense_allocations" to "authenticated";

grant insert on table "public"."po_expense_allocations" to "authenticated";

grant references on table "public"."po_expense_allocations" to "authenticated";

grant select on table "public"."po_expense_allocations" to "authenticated";

grant trigger on table "public"."po_expense_allocations" to "authenticated";

grant truncate on table "public"."po_expense_allocations" to "authenticated";

grant update on table "public"."po_expense_allocations" to "authenticated";

grant delete on table "public"."po_expense_allocations" to "service_role";

grant insert on table "public"."po_expense_allocations" to "service_role";

grant references on table "public"."po_expense_allocations" to "service_role";

grant select on table "public"."po_expense_allocations" to "service_role";

grant trigger on table "public"."po_expense_allocations" to "service_role";

grant truncate on table "public"."po_expense_allocations" to "service_role";

grant update on table "public"."po_expense_allocations" to "service_role";

grant delete on table "public"."po_items" to "anon";

grant insert on table "public"."po_items" to "anon";

grant references on table "public"."po_items" to "anon";

grant select on table "public"."po_items" to "anon";

grant trigger on table "public"."po_items" to "anon";

grant truncate on table "public"."po_items" to "anon";

grant update on table "public"."po_items" to "anon";

grant delete on table "public"."po_items" to "authenticated";

grant insert on table "public"."po_items" to "authenticated";

grant references on table "public"."po_items" to "authenticated";

grant select on table "public"."po_items" to "authenticated";

grant trigger on table "public"."po_items" to "authenticated";

grant truncate on table "public"."po_items" to "authenticated";

grant update on table "public"."po_items" to "authenticated";

grant delete on table "public"."po_items" to "service_role";

grant insert on table "public"."po_items" to "service_role";

grant references on table "public"."po_items" to "service_role";

grant select on table "public"."po_items" to "service_role";

grant trigger on table "public"."po_items" to "service_role";

grant truncate on table "public"."po_items" to "service_role";

grant update on table "public"."po_items" to "service_role";

grant delete on table "public"."pt_topups" to "anon";

grant insert on table "public"."pt_topups" to "anon";

grant references on table "public"."pt_topups" to "anon";

grant select on table "public"."pt_topups" to "anon";

grant trigger on table "public"."pt_topups" to "anon";

grant truncate on table "public"."pt_topups" to "anon";

grant update on table "public"."pt_topups" to "anon";

grant delete on table "public"."pt_topups" to "authenticated";

grant insert on table "public"."pt_topups" to "authenticated";

grant references on table "public"."pt_topups" to "authenticated";

grant select on table "public"."pt_topups" to "authenticated";

grant trigger on table "public"."pt_topups" to "authenticated";

grant truncate on table "public"."pt_topups" to "authenticated";

grant update on table "public"."pt_topups" to "authenticated";

grant delete on table "public"."pt_topups" to "service_role";

grant insert on table "public"."pt_topups" to "service_role";

grant references on table "public"."pt_topups" to "service_role";

grant select on table "public"."pt_topups" to "service_role";

grant trigger on table "public"."pt_topups" to "service_role";

grant truncate on table "public"."pt_topups" to "service_role";

grant update on table "public"."pt_topups" to "service_role";

grant delete on table "public"."purchase_orders" to "anon";

grant insert on table "public"."purchase_orders" to "anon";

grant references on table "public"."purchase_orders" to "anon";

grant select on table "public"."purchase_orders" to "anon";

grant trigger on table "public"."purchase_orders" to "anon";

grant truncate on table "public"."purchase_orders" to "anon";

grant update on table "public"."purchase_orders" to "anon";

grant delete on table "public"."purchase_orders" to "authenticated";

grant insert on table "public"."purchase_orders" to "authenticated";

grant references on table "public"."purchase_orders" to "authenticated";

grant select on table "public"."purchase_orders" to "authenticated";

grant trigger on table "public"."purchase_orders" to "authenticated";

grant truncate on table "public"."purchase_orders" to "authenticated";

grant update on table "public"."purchase_orders" to "authenticated";

grant delete on table "public"."purchase_orders" to "service_role";

grant insert on table "public"."purchase_orders" to "service_role";

grant references on table "public"."purchase_orders" to "service_role";

grant select on table "public"."purchase_orders" to "service_role";

grant trigger on table "public"."purchase_orders" to "service_role";

grant truncate on table "public"."purchase_orders" to "service_role";

grant update on table "public"."purchase_orders" to "service_role";

grant delete on table "public"."rab_allocations" to "anon";

grant insert on table "public"."rab_allocations" to "anon";

grant references on table "public"."rab_allocations" to "anon";

grant select on table "public"."rab_allocations" to "anon";

grant trigger on table "public"."rab_allocations" to "anon";

grant truncate on table "public"."rab_allocations" to "anon";

grant update on table "public"."rab_allocations" to "anon";

grant delete on table "public"."rab_allocations" to "authenticated";

grant insert on table "public"."rab_allocations" to "authenticated";

grant references on table "public"."rab_allocations" to "authenticated";

grant select on table "public"."rab_allocations" to "authenticated";

grant trigger on table "public"."rab_allocations" to "authenticated";

grant truncate on table "public"."rab_allocations" to "authenticated";

grant update on table "public"."rab_allocations" to "authenticated";

grant delete on table "public"."rab_allocations" to "service_role";

grant insert on table "public"."rab_allocations" to "service_role";

grant references on table "public"."rab_allocations" to "service_role";

grant select on table "public"."rab_allocations" to "service_role";

grant trigger on table "public"."rab_allocations" to "service_role";

grant truncate on table "public"."rab_allocations" to "service_role";

grant update on table "public"."rab_allocations" to "service_role";

grant delete on table "public"."roles" to "anon";

grant insert on table "public"."roles" to "anon";

grant references on table "public"."roles" to "anon";

grant select on table "public"."roles" to "anon";

grant trigger on table "public"."roles" to "anon";

grant truncate on table "public"."roles" to "anon";

grant update on table "public"."roles" to "anon";

grant delete on table "public"."roles" to "authenticated";

grant insert on table "public"."roles" to "authenticated";

grant references on table "public"."roles" to "authenticated";

grant select on table "public"."roles" to "authenticated";

grant trigger on table "public"."roles" to "authenticated";

grant truncate on table "public"."roles" to "authenticated";

grant update on table "public"."roles" to "authenticated";

grant delete on table "public"."roles" to "service_role";

grant insert on table "public"."roles" to "service_role";

grant references on table "public"."roles" to "service_role";

grant select on table "public"."roles" to "service_role";

grant trigger on table "public"."roles" to "service_role";

grant truncate on table "public"."roles" to "service_role";

grant update on table "public"."roles" to "service_role";

grant delete on table "public"."shareholders" to "anon";

grant insert on table "public"."shareholders" to "anon";

grant references on table "public"."shareholders" to "anon";

grant select on table "public"."shareholders" to "anon";

grant trigger on table "public"."shareholders" to "anon";

grant truncate on table "public"."shareholders" to "anon";

grant update on table "public"."shareholders" to "anon";

grant delete on table "public"."shareholders" to "authenticated";

grant insert on table "public"."shareholders" to "authenticated";

grant references on table "public"."shareholders" to "authenticated";

grant select on table "public"."shareholders" to "authenticated";

grant trigger on table "public"."shareholders" to "authenticated";

grant truncate on table "public"."shareholders" to "authenticated";

grant update on table "public"."shareholders" to "authenticated";

grant delete on table "public"."shareholders" to "service_role";

grant insert on table "public"."shareholders" to "service_role";

grant references on table "public"."shareholders" to "service_role";

grant select on table "public"."shareholders" to "service_role";

grant trigger on table "public"."shareholders" to "service_role";

grant truncate on table "public"."shareholders" to "service_role";

grant update on table "public"."shareholders" to "service_role";

grant delete on table "public"."subcategories" to "anon";

grant insert on table "public"."subcategories" to "anon";

grant references on table "public"."subcategories" to "anon";

grant select on table "public"."subcategories" to "anon";

grant trigger on table "public"."subcategories" to "anon";

grant truncate on table "public"."subcategories" to "anon";

grant update on table "public"."subcategories" to "anon";

grant delete on table "public"."subcategories" to "authenticated";

grant insert on table "public"."subcategories" to "authenticated";

grant references on table "public"."subcategories" to "authenticated";

grant select on table "public"."subcategories" to "authenticated";

grant trigger on table "public"."subcategories" to "authenticated";

grant truncate on table "public"."subcategories" to "authenticated";

grant update on table "public"."subcategories" to "authenticated";

grant delete on table "public"."subcategories" to "service_role";

grant insert on table "public"."subcategories" to "service_role";

grant references on table "public"."subcategories" to "service_role";

grant select on table "public"."subcategories" to "service_role";

grant trigger on table "public"."subcategories" to "service_role";

grant truncate on table "public"."subcategories" to "service_role";

grant update on table "public"."subcategories" to "service_role";

grant delete on table "public"."user_profiles" to "anon";

grant insert on table "public"."user_profiles" to "anon";

grant references on table "public"."user_profiles" to "anon";

grant select on table "public"."user_profiles" to "anon";

grant trigger on table "public"."user_profiles" to "anon";

grant truncate on table "public"."user_profiles" to "anon";

grant update on table "public"."user_profiles" to "anon";

grant delete on table "public"."user_profiles" to "authenticated";

grant insert on table "public"."user_profiles" to "authenticated";

grant references on table "public"."user_profiles" to "authenticated";

grant select on table "public"."user_profiles" to "authenticated";

grant trigger on table "public"."user_profiles" to "authenticated";

grant truncate on table "public"."user_profiles" to "authenticated";

grant update on table "public"."user_profiles" to "authenticated";

grant delete on table "public"."user_profiles" to "service_role";

grant insert on table "public"."user_profiles" to "service_role";

grant references on table "public"."user_profiles" to "service_role";

grant select on table "public"."user_profiles" to "service_role";

grant trigger on table "public"."user_profiles" to "service_role";

grant truncate on table "public"."user_profiles" to "service_role";

grant update on table "public"."user_profiles" to "service_role";

grant delete on table "public"."user_roles" to "anon";

grant insert on table "public"."user_roles" to "anon";

grant references on table "public"."user_roles" to "anon";

grant select on table "public"."user_roles" to "anon";

grant trigger on table "public"."user_roles" to "anon";

grant truncate on table "public"."user_roles" to "anon";

grant update on table "public"."user_roles" to "anon";

grant delete on table "public"."user_roles" to "authenticated";

grant insert on table "public"."user_roles" to "authenticated";

grant references on table "public"."user_roles" to "authenticated";

grant select on table "public"."user_roles" to "authenticated";

grant trigger on table "public"."user_roles" to "authenticated";

grant truncate on table "public"."user_roles" to "authenticated";

grant update on table "public"."user_roles" to "authenticated";

grant delete on table "public"."user_roles" to "service_role";

grant insert on table "public"."user_roles" to "service_role";

grant references on table "public"."user_roles" to "service_role";

grant select on table "public"."user_roles" to "service_role";

grant trigger on table "public"."user_roles" to "service_role";

grant truncate on table "public"."user_roles" to "service_role";

grant update on table "public"."user_roles" to "service_role";

grant delete on table "public"."vendors" to "anon";

grant insert on table "public"."vendors" to "anon";

grant references on table "public"."vendors" to "anon";

grant select on table "public"."vendors" to "anon";

grant trigger on table "public"."vendors" to "anon";

grant truncate on table "public"."vendors" to "anon";

grant update on table "public"."vendors" to "anon";

grant delete on table "public"."vendors" to "authenticated";

grant insert on table "public"."vendors" to "authenticated";

grant references on table "public"."vendors" to "authenticated";

grant select on table "public"."vendors" to "authenticated";

grant trigger on table "public"."vendors" to "authenticated";

grant truncate on table "public"."vendors" to "authenticated";

grant update on table "public"."vendors" to "authenticated";

grant delete on table "public"."vendors" to "service_role";

grant insert on table "public"."vendors" to "service_role";

grant references on table "public"."vendors" to "service_role";

grant select on table "public"."vendors" to "service_role";

grant trigger on table "public"."vendors" to "service_role";

grant truncate on table "public"."vendors" to "service_role";

grant update on table "public"."vendors" to "service_role";


  create policy "read bank_accounts"
  on "public"."bank_accounts"
  as permissive
  for select
  to authenticated
using (is_viewer_or_admin());



  create policy "all_auth"
  on "public"."budget_lines"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "all_auth"
  on "public"."capital_contributions"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "all_auth"
  on "public"."capital_injections"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "Allow read categories for authenticated"
  on "public"."categories"
  as permissive
  for select
  to authenticated
using (true);



  create policy "categories_select"
  on "public"."categories"
  as permissive
  for select
  to authenticated
using (has_any_role_current(ARRAY['viewer'::text, 'admin'::text, 'superadmin'::text]));



  create policy "categories_write"
  on "public"."categories"
  as permissive
  for all
  to authenticated
using (has_any_role_current(ARRAY['admin'::text, 'superadmin'::text]))
with check (has_any_role_current(ARRAY['admin'::text, 'superadmin'::text]));



  create policy "read categories"
  on "public"."categories"
  as permissive
  for select
  to authenticated
using (is_viewer_or_admin());



  create policy "Allow read expenses for authenticated"
  on "public"."expenses"
  as permissive
  for select
  to authenticated
using (true);



  create policy "expenses_select"
  on "public"."expenses"
  as permissive
  for select
  to authenticated
using (has_any_role_current(ARRAY['viewer'::text, 'admin'::text, 'superadmin'::text]));



  create policy "expenses_write"
  on "public"."expenses"
  as permissive
  for all
  to authenticated
using (has_any_role_current(ARRAY['admin'::text, 'superadmin'::text]))
with check (has_any_role_current(ARRAY['admin'::text, 'superadmin'::text]));



  create policy "read expenses by role"
  on "public"."expenses"
  as permissive
  for select
  to authenticated
using (((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = ANY (ARRAY['admin'::text, 'super_admin'::text]))))) OR (EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = 'viewer'::text))))));



  create policy "read expenses"
  on "public"."expenses"
  as permissive
  for select
  to authenticated
using (is_viewer_or_admin());



  create policy "all_auth"
  on "public"."grn_items"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "grn_items_select"
  on "public"."grn_items"
  as permissive
  for select
  to authenticated
using (has_any_role_current(ARRAY['viewer'::text, 'admin'::text, 'superadmin'::text]));



  create policy "grn_items_write"
  on "public"."grn_items"
  as permissive
  for all
  to authenticated
using (has_any_role_current(ARRAY['admin'::text, 'superadmin'::text]))
with check (has_any_role_current(ARRAY['admin'::text, 'superadmin'::text]));



  create policy "all_auth"
  on "public"."grns"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "grn_select"
  on "public"."grns"
  as permissive
  for select
  to authenticated
using (has_any_role_current(ARRAY['viewer'::text, 'admin'::text, 'superadmin'::text]));



  create policy "grn_write"
  on "public"."grns"
  as permissive
  for all
  to authenticated
using (has_any_role_current(ARRAY['admin'::text, 'superadmin'::text]))
with check (has_any_role_current(ARRAY['admin'::text, 'superadmin'::text]));



  create policy "all_auth"
  on "public"."petty_cash_boxes"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "pcb_select"
  on "public"."petty_cash_boxes"
  as permissive
  for select
  to authenticated
using (has_any_role_current(ARRAY['viewer'::text, 'admin'::text, 'superadmin'::text]));



  create policy "pcb_write"
  on "public"."petty_cash_boxes"
  as permissive
  for all
  to authenticated
using (has_any_role_current(ARRAY['admin'::text, 'superadmin'::text]))
with check (has_any_role_current(ARRAY['admin'::text, 'superadmin'::text]));



  create policy "read petty_cash_boxes"
  on "public"."petty_cash_boxes"
  as permissive
  for select
  to authenticated
using (is_viewer_or_admin());



  create policy "all_auth"
  on "public"."petty_cash_txns"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "pctx_select"
  on "public"."petty_cash_txns"
  as permissive
  for select
  to authenticated
using (has_any_role_current(ARRAY['viewer'::text, 'admin'::text, 'superadmin'::text]));



  create policy "pctx_write"
  on "public"."petty_cash_txns"
  as permissive
  for all
  to authenticated
using (has_any_role_current(ARRAY['admin'::text, 'superadmin'::text]))
with check (has_any_role_current(ARRAY['admin'::text, 'superadmin'::text]));



  create policy "Allow read po_expense_allocations for authenticated"
  on "public"."po_expense_allocations"
  as permissive
  for select
  to authenticated
using (true);



  create policy "po_alloc_select"
  on "public"."po_expense_allocations"
  as permissive
  for select
  to authenticated
using (has_any_role_current(ARRAY['viewer'::text, 'admin'::text, 'superadmin'::text]));



  create policy "po_alloc_write"
  on "public"."po_expense_allocations"
  as permissive
  for all
  to authenticated
using (has_any_role_current(ARRAY['admin'::text, 'superadmin'::text]))
with check (has_any_role_current(ARRAY['admin'::text, 'superadmin'::text]));



  create policy "read po_expense_allocations"
  on "public"."po_expense_allocations"
  as permissive
  for select
  to authenticated
using (is_viewer_or_admin());



  create policy "all_auth"
  on "public"."po_items"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "po_items_select"
  on "public"."po_items"
  as permissive
  for select
  to authenticated
using (has_any_role_current(ARRAY['viewer'::text, 'admin'::text, 'superadmin'::text]));



  create policy "po_items_write"
  on "public"."po_items"
  as permissive
  for all
  to authenticated
using (has_any_role_current(ARRAY['admin'::text, 'superadmin'::text]))
with check (has_any_role_current(ARRAY['admin'::text, 'superadmin'::text]));



  create policy "Allow read purchase_orders for authenticated"
  on "public"."purchase_orders"
  as permissive
  for select
  to authenticated
using (true);



  create policy "po_select"
  on "public"."purchase_orders"
  as permissive
  for select
  to authenticated
using (has_any_role_current(ARRAY['viewer'::text, 'admin'::text, 'superadmin'::text]));



  create policy "po_write"
  on "public"."purchase_orders"
  as permissive
  for all
  to authenticated
using (has_any_role_current(ARRAY['admin'::text, 'superadmin'::text]))
with check (has_any_role_current(ARRAY['admin'::text, 'superadmin'::text]));



  create policy "read purchase_orders"
  on "public"."purchase_orders"
  as permissive
  for select
  to authenticated
using (is_viewer_or_admin());



  create policy "all_auth"
  on "public"."rab_allocations"
  as permissive
  for all
  to authenticated
using (true)
with check (true);



  create policy "Allow read shareholders for authenticated"
  on "public"."shareholders"
  as permissive
  for select
  to authenticated
using (true);



  create policy "read shareholders"
  on "public"."shareholders"
  as permissive
  for select
  to authenticated
using (is_viewer_or_admin());



  create policy "Allow read subcategories for authenticated"
  on "public"."subcategories"
  as permissive
  for select
  to authenticated
using (true);



  create policy "read subcategories"
  on "public"."subcategories"
  as permissive
  for select
  to authenticated
using (is_viewer_or_admin());



  create policy "subcategories_select"
  on "public"."subcategories"
  as permissive
  for select
  to authenticated
using (has_any_role_current(ARRAY['viewer'::text, 'admin'::text, 'superadmin'::text]));



  create policy "subcategories_write"
  on "public"."subcategories"
  as permissive
  for all
  to authenticated
using (has_any_role_current(ARRAY['admin'::text, 'superadmin'::text]))
with check (has_any_role_current(ARRAY['admin'::text, 'superadmin'::text]));



  create policy "sel_own_role"
  on "public"."user_roles"
  as permissive
  for select
  to authenticated
using ((user_id = auth.uid()));



  create policy "ur_sel"
  on "public"."user_roles"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Allow read vendors for authenticated"
  on "public"."vendors"
  as permissive
  for select
  to authenticated
using (true);



  create policy "read vendors"
  on "public"."vendors"
  as permissive
  for select
  to authenticated
using (is_viewer_or_admin());



  create policy "vendors_delete"
  on "public"."vendors"
  as permissive
  for delete
  to public
using (app_has_any_role(ARRAY['admin'::text, 'superadmin'::text]));



  create policy "vendors_insert"
  on "public"."vendors"
  as permissive
  for insert
  to public
with check (app_has_any_role(ARRAY['admin'::text, 'superadmin'::text]));



  create policy "vendors_read"
  on "public"."vendors"
  as permissive
  for select
  to public
using (app_has_any_role(ARRAY['viewer'::text, 'admin'::text, 'superadmin'::text]));



  create policy "vendors_select"
  on "public"."vendors"
  as permissive
  for select
  to public
using ((is_super_admin() OR has_role(auth.uid(), 'admin'::text) OR has_role(auth.uid(), 'viewer'::text)));



  create policy "vendors_update"
  on "public"."vendors"
  as permissive
  for update
  to public
using (app_has_any_role(ARRAY['admin'::text, 'superadmin'::text]))
with check (app_has_any_role(ARRAY['admin'::text, 'superadmin'::text]));



  create policy "vendors_write"
  on "public"."vendors"
  as permissive
  for all
  to authenticated
using (has_any_role_current(ARRAY['admin'::text, 'superadmin'::text]))
with check (has_any_role_current(ARRAY['admin'::text, 'superadmin'::text]));



  create policy "viewer can read vendors"
  on "public"."vendors"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = ANY (ARRAY['viewer'::text, 'admin'::text, 'super_admin'::text]))))));



  create policy "viewer read vendors"
  on "public"."vendors"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = ANY (ARRAY['viewer'::text, 'admin'::text, 'super_admin'::text]))))));


CREATE TRIGGER trg_ensure_one_default AFTER UPDATE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION ensure_one_default();

CREATE TRIGGER ci_require_account BEFORE INSERT OR UPDATE ON public.capital_contributions FOR EACH ROW EXECUTE FUNCTION trg_ci_require_account();

CREATE TRIGGER exp_validate_subcat BEFORE INSERT OR UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION exp_validate_subcat();

CREATE TRIGGER set_timestamp_exp BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION trg_set_timestamp();

CREATE TRIGGER trg_check_po_on_post BEFORE UPDATE OF status ON public.expenses FOR EACH ROW EXECUTE FUNCTION check_po_paid_on_expense_post();

CREATE TRIGGER trg_grn_item_split BEFORE INSERT OR UPDATE OF qty_input, po_item_id ON public.grn_items FOR EACH ROW EXECUTE FUNCTION trg_grn_item_split_overreceive();

CREATE TRIGGER po_allocations_limit_biu BEFORE INSERT OR UPDATE ON public.po_expense_allocations FOR EACH ROW EXECUTE FUNCTION check_po_allocation_not_exceed();

CREATE TRIGGER trg_alloc_limit_expense BEFORE INSERT OR UPDATE ON public.po_expense_allocations FOR EACH ROW EXECUTE FUNCTION check_alloc_not_exceed_expense();

CREATE TRIGGER normalize_month_date_rab_alloc BEFORE INSERT OR UPDATE ON public.rab_allocations FOR EACH ROW EXECUTE FUNCTION trg_normalize_month_date();

CREATE TRIGGER trg_vendors_audit BEFORE INSERT OR UPDATE ON public.vendors FOR EACH ROW EXECUTE FUNCTION tg_set_vendor_audit();


