-- ============================================================================
-- Fix: Add unique constraint on (bathroom_id, coupon_code) and retry
--      code generation on conflict in create_business_coupon.
-- 036_coupon_code_uniqueness.sql
-- ============================================================================

-- Unique coupon code per bathroom so operators can't accidentally duplicate
-- a code they already handed out and end-users get an unambiguous redemption
-- identifier.
create unique index if not exists idx_business_coupons_code_per_bathroom
  on public.business_coupons (bathroom_id, coupon_code);

-- Recreate create_business_coupon with a retry loop so that auto-generated
-- codes simply retry on a collision instead of surfacing an exception.
create or replace function public.create_business_coupon(
  p_bathroom_id uuid,
  p_title text,
  p_description text default null,
  p_coupon_type text default 'percent_off',
  p_value numeric default null,
  p_min_purchase numeric default null,
  p_coupon_code text default null,
  p_max_redemptions integer default null,
  p_starts_at timestamptz default now(),
  p_expires_at timestamptz default null,
  p_premium_only boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_coupon_id uuid;
  v_code text;
  v_caller_code text;
  v_attempts integer := 0;
  v_max_attempts constant integer := 10;
begin
  if v_user_id is null then
    raise exception 'Unauthorized: Authentication required';
  end if;

  if not user_can_manage_business_bathroom(v_user_id, p_bathroom_id) then
    raise exception 'Forbidden: You do not manage this bathroom';
  end if;

  -- Normalise the caller-supplied code once; NULL means "auto-generate"
  v_caller_code := nullif(trim(p_coupon_code), '');

  -- If the caller provided a code, attempt a single insert.  Any unique
  -- violation on (bathroom_id, coupon_code) bubbles up as a clear error.
  if v_caller_code is not null then
    insert into public.business_coupons (
      bathroom_id, business_user_id, title, description,
      coupon_type, value, min_purchase, coupon_code,
      max_redemptions, starts_at, expires_at, premium_only
    )
    values (
      p_bathroom_id, v_user_id, p_title, p_description,
      p_coupon_type, p_value, p_min_purchase, v_caller_code,
      p_max_redemptions, p_starts_at, p_expires_at, p_premium_only
    )
    returning id into v_coupon_id;

    return jsonb_build_object(
      'success', true,
      'coupon_id', v_coupon_id,
      'coupon_code', v_caller_code
    );
  end if;

  -- Auto-generate: retry up to v_max_attempts times on a unique collision.
  loop
    v_attempts := v_attempts + 1;
    if v_attempts > v_max_attempts then
      raise exception 'Unable to generate a unique coupon code after % attempts', v_max_attempts;
    end if;

    v_code := upper(substring(
      replace(replace(encode(gen_random_bytes(6), 'base64'), '+', ''), '/', '')
      from 1 for 8
    ));

    begin
      insert into public.business_coupons (
        bathroom_id, business_user_id, title, description,
        coupon_type, value, min_purchase, coupon_code,
        max_redemptions, starts_at, expires_at, premium_only
      )
      values (
        p_bathroom_id, v_user_id, p_title, p_description,
        p_coupon_type, p_value, p_min_purchase, v_code,
        p_max_redemptions, p_starts_at, p_expires_at, p_premium_only
      )
      returning id into v_coupon_id;

      -- Insert succeeded — exit the loop.
      exit;
    exception
      when unique_violation then
        -- Collision on (bathroom_id, coupon_code): regenerate and retry.
        continue;
    end;
  end loop;

  return jsonb_build_object(
    'success', true,
    'coupon_id', v_coupon_id,
    'coupon_code', v_code
  );
end;
$$;

revoke all on function public.create_business_coupon(uuid, text, text, text, numeric, numeric, text, integer, timestamptz, timestamptz, boolean) from public;
grant execute on function public.create_business_coupon(uuid, text, text, text, numeric, numeric, text, integer, timestamptz, timestamptz, boolean) to authenticated;
