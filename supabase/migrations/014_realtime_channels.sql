-- ============================================================================
-- Pee-Dom Realtime Channel Configuration
-- Ensures all user-facing realtime tables are published to supabase_realtime.
-- Presence remains client-side only and does not require persistent tables.
-- ============================================================================

do $$
begin
  begin
    alter publication supabase_realtime add table public.bathrooms;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.bathroom_access_codes;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.code_votes;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.bathroom_reports;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.cleanliness_ratings;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.favorites;
  exception
    when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.bathroom_status_events;
  exception
    when duplicate_object then null;
  end;
end;
$$;
