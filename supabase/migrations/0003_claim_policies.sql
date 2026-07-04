-- ===== 0003: سياسات الملكية — Supabase Auth حقيقي =====
-- النموذج الهجين للمرحلة الانتقالية:
--   * الصفوف غير المُدّعاة (owner_id is null) تبقى مفتوحة الكتابة — ديمو الزوار يعمل.
--   * الصف المُدّعى (owner_id مضبوط) لا يكتبه إلا صاحبه (auth.uid()).
--   * القراءة تبقى عامة — الصفحة التعريفية علنية بطبيعتها.

drop policy if exists "public_profiles_insert_demo" on public.public_profiles;
drop policy if exists "public_profiles_insert" on public.public_profiles;
create policy "public_profiles_insert"
  on public.public_profiles for insert
  with check (owner_id is null or owner_id = auth.uid());

drop policy if exists "public_profiles_update_demo" on public.public_profiles;
drop policy if exists "public_profiles_update" on public.public_profiles;
create policy "public_profiles_update"
  on public.public_profiles for update
  using (owner_id is null or owner_id = auth.uid())
  with check (owner_id is null or owner_id = auth.uid());
