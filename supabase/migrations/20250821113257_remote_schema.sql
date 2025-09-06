drop extension if exists "pg_net";

alter table "public"."purchase_orders" drop constraint "purchase_orders_vendor_id_unique";

drop index if exists "public"."purchase_orders_vendor_id_unique";

alter table "public"."budget_lines" enable row level security;

alter table "public"."capital_contributions" enable row level security;

alter table "public"."capital_injections" enable row level security;

alter table "public"."ci_obligations" enable row level security;

alter table "public"."purchase_orders" alter column "vendor_id" set not null;

alter table "public"."rab_allocations" enable row level security;


  create policy "admins_can_insert_bank_accounts"
  on "public"."bank_accounts"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = ANY (ARRAY['admin'::text, 'superadmin'::text]))))));



  create policy "admins_can_select_bank_accounts"
  on "public"."bank_accounts"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = ANY (ARRAY['admin'::text, 'superadmin'::text]))))));



  create policy "bl_delete_admin_only"
  on "public"."budget_lines"
  as permissive
  for delete
  to authenticated
using (is_admin());



  create policy "bl_insert_admin_only"
  on "public"."budget_lines"
  as permissive
  for insert
  to authenticated
with check (is_admin());



  create policy "bl_select_all_auth"
  on "public"."budget_lines"
  as permissive
  for select
  to authenticated
using (true);



  create policy "bl_update_admin_only"
  on "public"."budget_lines"
  as permissive
  for update
  to authenticated
using (is_admin())
with check (is_admin());



  create policy "cc_delete_admin_only"
  on "public"."capital_contributions"
  as permissive
  for delete
  to authenticated
using (is_admin());



  create policy "cc_insert_admin_only"
  on "public"."capital_contributions"
  as permissive
  for insert
  to authenticated
with check (is_admin());



  create policy "cc_select_all_auth"
  on "public"."capital_contributions"
  as permissive
  for select
  to authenticated
using (true);



  create policy "cc_update_admin_only"
  on "public"."capital_contributions"
  as permissive
  for update
  to authenticated
using (is_admin())
with check (is_admin());



  create policy "ci_delete_admin_only"
  on "public"."capital_injections"
  as permissive
  for delete
  to authenticated
using (is_admin());



  create policy "ci_insert_admin_only"
  on "public"."capital_injections"
  as permissive
  for insert
  to authenticated
with check (is_admin());



  create policy "ci_select_all_auth"
  on "public"."capital_injections"
  as permissive
  for select
  to authenticated
using (true);



  create policy "ci_update_admin_only"
  on "public"."capital_injections"
  as permissive
  for update
  to authenticated
using (is_admin())
with check (is_admin());



  create policy "cio_delete_admin_only"
  on "public"."ci_obligations"
  as permissive
  for delete
  to authenticated
using (is_admin());



  create policy "cio_insert_admin_only"
  on "public"."ci_obligations"
  as permissive
  for insert
  to authenticated
with check (is_admin());



  create policy "cio_select_all_auth"
  on "public"."ci_obligations"
  as permissive
  for select
  to authenticated
using (true);



  create policy "cio_update_admin_only"
  on "public"."ci_obligations"
  as permissive
  for update
  to authenticated
using (is_admin())
with check (is_admin());



  create policy "rab_alloc_delete_admin_only"
  on "public"."rab_allocations"
  as permissive
  for delete
  to authenticated
using (is_admin());



  create policy "rab_alloc_insert_admin_only"
  on "public"."rab_allocations"
  as permissive
  for insert
  to authenticated
with check (is_admin());



  create policy "rab_alloc_select_all_auth"
  on "public"."rab_allocations"
  as permissive
  for select
  to authenticated
using (true);



  create policy "rab_alloc_update_admin_only"
  on "public"."rab_allocations"
  as permissive
  for update
  to authenticated
using (is_admin())
with check (is_admin());



  create policy "shareholders_delete_admin_only"
  on "public"."shareholders"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = ANY (ARRAY['admin'::text, 'superadmin'::text]))))));



  create policy "shareholders_insert_admin_only"
  on "public"."shareholders"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = ANY (ARRAY['admin'::text, 'superadmin'::text]))))));



  create policy "shareholders_select_by_any_role"
  on "public"."shareholders"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = ANY (ARRAY['viewer'::text, 'admin'::text, 'superadmin'::text]))))));



  create policy "shareholders_update_admin_only"
  on "public"."shareholders"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = ANY (ARRAY['admin'::text, 'superadmin'::text]))))))
with check ((EXISTS ( SELECT 1
   FROM (user_roles ur
     JOIN roles r ON ((r.id = ur.role_id)))
  WHERE ((ur.user_id = auth.uid()) AND (r.code = ANY (ARRAY['admin'::text, 'superadmin'::text]))))));



