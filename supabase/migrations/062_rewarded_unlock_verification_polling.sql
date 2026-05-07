create or replace function public.has_rewarded_unlock_verification(
  p_feature_key text,
  p_bathroom_id uuid,
  p_reward_verification_token text
)
returns boolean
language sql
security definer
set search_path = public
as $$
  select
    auth.uid() is not null
    and p_feature_key in ('code_reveal', 'emergency_lookup')
    and p_reward_verification_token is not null
    and length(trim(p_reward_verification_token)) between 12 and 512
    and exists (
      select 1
      from public.rewarded_unlock_verifications verifications
      where verifications.verification_token = trim(p_reward_verification_token)
        and verifications.user_id = auth.uid()
        and verifications.feature_key = p_feature_key
        and verifications.bathroom_id is not distinct from p_bathroom_id
        and verifications.consumed_at is null
        and verifications.verified_at >= now() - interval '30 minutes'
    );
$$;

revoke all on function public.has_rewarded_unlock_verification(text, uuid, text) from public;
grant execute on function public.has_rewarded_unlock_verification(text, uuid, text) to authenticated;
