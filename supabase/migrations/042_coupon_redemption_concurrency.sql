-- ============================================================================
-- StallPass coupon redemption concurrency hardening
-- 042_coupon_redemption_concurrency.sql
--
-- Prevents over-redemption under concurrent traffic by locking the target
-- coupon row during validation and only incrementing the redemption counter
-- after a successful redemption insert.
-- ============================================================================

create or replace function public.redeem_coupon(
  p_coupon_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_coupon public.business_coupons%rowtype;
  v_redemption_id uuid;
  v_now timestamptz := now();
begin
  if v_user_id is null then
    raise exception 'Unauthorized: Authentication required';
  end if;

  select *
  into v_coupon
  from public.business_coupons
  where id = p_coupon_id
  for update;

  if not found then
    raise exception 'Coupon not found';
  end if;

  if not v_coupon.is_active then
    raise exception 'This coupon is no longer active';
  end if;

  if v_coupon.starts_at > v_now then
    raise exception 'This coupon is not active yet';
  end if;

  if v_coupon.expires_at is not null and v_coupon.expires_at <= v_now then
    raise exception 'This coupon has expired';
  end if;

  if v_coupon.max_redemptions is not null
     and v_coupon.current_redemptions >= v_coupon.max_redemptions then
    raise exception 'This coupon has reached its redemption limit';
  end if;

  if v_coupon.premium_only then
    if not exists (
      select 1
      from public.profiles p
      where p.id = v_user_id
        and p.is_premium = true
        and (p.premium_expires_at is null or p.premium_expires_at > v_now)
    ) then
      raise exception 'This coupon is only available to StallPass Premium members';
    end if;
  end if;

  begin
    insert into public.coupon_redemptions (coupon_id, user_id)
    values (p_coupon_id, v_user_id)
    returning id into v_redemption_id;
  exception
    when unique_violation then
      raise exception 'You have already redeemed this coupon';
  end;

  update public.business_coupons
  set current_redemptions = current_redemptions + 1,
      updated_at = v_now
  where id = p_coupon_id;

  perform public.record_stallpass_visit(v_coupon.bathroom_id, 'coupon_redeem');

  return jsonb_build_object(
    'success', true,
    'redemption_id', v_redemption_id,
    'coupon_code', v_coupon.coupon_code,
    'title', v_coupon.title
  );
end;
$$;

revoke all on function public.redeem_coupon(uuid) from public;
grant execute on function public.redeem_coupon(uuid) to authenticated;
