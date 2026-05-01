import {
  bathroomAccessibilityDetailsSchema,
  bathroomAttributeConfirmationSchema,
  bathroomCurrentLiveStatusSchema,
  bathroomNeedMetadataSchema,
  parseSupabaseNullableRow,
  parseSupabaseRows,
  savedNeedProfileSchema,
} from '@/lib/supabase-parsers';
import { getSupabaseClient } from '@/lib/supabase';
import type {
  BathroomAccessibilityDetails,
  BathroomAttributeConfirmation,
  BathroomAttributeConfirmationSourceType,
  BathroomLiveStatusEventType,
  BathroomNeedMetadata,
  BathroomOccupancyLevel,
  SavedNeedProfile,
} from '@/types';

interface ApiErrorShape {
  code?: string;
  message: string;
}

interface ReportBathroomLiveStatusEventInput {
  bathroomId: string;
  statusType: BathroomLiveStatusEventType;
  statusValue: string;
  waitMinutes?: number | null;
  occupancyLevel?: BathroomOccupancyLevel | null;
  suppliesMissing?: string[];
  confidenceScore?: number;
  evidencePhotoUrl?: string | null;
}

interface CreateBathroomAttributeConfirmationInput {
  bathroomId: string;
  fieldName: string;
  fieldValueSnapshot: Record<string, unknown>;
  sourceType: BathroomAttributeConfirmationSourceType;
  confidenceScore: number;
  notes?: string | null;
  evidencePhotoUrl?: string | null;
  businessId?: string | null;
  sourceUserId?: string | null;
}

export interface CurrentBathroomLiveStatus {
  id: string;
  bathroom_id: string;
  user_id: string | null;
  status_type: BathroomLiveStatusEventType;
  status_value: string;
  wait_minutes: number | null;
  occupancy_level: BathroomOccupancyLevel | null;
  supplies_missing: string[];
  reported_at: string;
  expires_at: string;
  confidence_score: number;
  evidence_photo_url: string | null;
  created_at: string;
  minutes_since_report: number;
  summary_text: string;
}

function toAppError(error: ApiErrorShape | Error, fallbackMessage: string): Error & { code?: string } {
  const appError = new Error(error.message || fallbackMessage) as Error & { code?: string };
  appError.code = 'code' in error ? error.code : undefined;
  return appError;
}

function mapFallbackAccessibilityDetails(
  bathroomId: string,
  sourceRow: {
    is_accessible: boolean | null;
    accessibility_features: {
      has_grab_bars?: boolean | null;
      door_width_inches?: number | null;
      turning_radius_inches?: number | null;
      stall_width_inches?: number | null;
      notes?: string | null;
      is_automatic_door?: boolean | null;
      has_wheelchair_ramp?: boolean | null;
    } | null;
    updated_at: string;
  }
): BathroomAccessibilityDetails {
  const features = sourceRow.accessibility_features ?? {};

  return {
    bathroom_id: bathroomId,
    wheelchair_accessible: sourceRow.is_accessible,
    door_clear_width_inches:
      typeof features.door_width_inches === 'number' ? features.door_width_inches : null,
    turning_space_inches:
      typeof features.turning_radius_inches === 'number' ? features.turning_radius_inches : null,
    stall_width_inches:
      typeof features.stall_width_inches === 'number' ? features.stall_width_inches : null,
    stall_depth_inches: null,
    has_grab_bars: features.has_grab_bars === true,
    has_accessible_sink: null,
    has_step_free_access:
      features.has_wheelchair_ramp === true || sourceRow.is_accessible === true,
    has_power_door: features.is_automatic_door === true,
    notes: typeof features.notes === 'string' ? features.notes : null,
    created_at: sourceRow.updated_at,
    updated_at: sourceRow.updated_at,
  };
}

export async function fetchBathroomAttributeConfirmations(
  bathroomId: string
): Promise<{ data: BathroomAttributeConfirmation[]; error: (Error & { code?: string }) | null }> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('bathroom_attribute_confirmations' as never)
      .select('*')
      .eq('bathroom_id', bathroomId)
      .order('last_confirmed_at', { ascending: false });

    if (error) {
      return {
        data: [],
        error: toAppError(error, 'Unable to load attribute confirmations right now.'),
      };
    }

    const parsedData = parseSupabaseRows(
      bathroomAttributeConfirmationSchema,
      data,
      'bathroom attribute confirmations',
      'Unable to load attribute confirmations right now.'
    );

    if (parsedData.error) {
      return {
        data: [],
        error: parsedData.error,
      };
    }

    return {
      data: parsedData.data as BathroomAttributeConfirmation[],
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load attribute confirmations right now.'),
        'Unable to load attribute confirmations right now.'
      ),
    };
  }
}

export async function createBathroomAttributeConfirmation(
  input: CreateBathroomAttributeConfirmationInput
): Promise<{ data: BathroomAttributeConfirmation | null; error: (Error & { code?: string }) | null }> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('bathroom_attribute_confirmations' as never)
      .insert({
        bathroom_id: input.bathroomId,
        field_name: input.fieldName,
        field_value_snapshot: input.fieldValueSnapshot,
        source_type: input.sourceType,
        confidence_score: input.confidenceScore,
        notes: input.notes ?? null,
        evidence_photo_url: input.evidencePhotoUrl ?? null,
        business_id: input.businessId ?? null,
        source_user_id: input.sourceUserId ?? null,
      } as never)
      .select('*')
      .maybeSingle();

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to save this field confirmation right now.'),
      };
    }

    const parsedData = parseSupabaseNullableRow(
      bathroomAttributeConfirmationSchema,
      data,
      'bathroom attribute confirmation',
      'Unable to save this field confirmation right now.'
    );

    if (parsedData.error) {
      return {
        data: null,
        error: parsedData.error,
      };
    }

    return {
      data: (parsedData.data as BathroomAttributeConfirmation | null) ?? null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to save this field confirmation right now.'),
        'Unable to save this field confirmation right now.'
      ),
    };
  }
}

export async function fetchBathroomNeedMetadata(
  bathroomId: string
): Promise<{ data: BathroomNeedMetadata | null; error: (Error & { code?: string }) | null }> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('bathroom_need_metadata' as never)
      .select('*')
      .eq('bathroom_id', bathroomId)
      .maybeSingle();

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to load bathroom metadata right now.'),
      };
    }

    const parsedData = parseSupabaseNullableRow(
      bathroomNeedMetadataSchema,
      data,
      'bathroom need metadata',
      'Unable to load bathroom metadata right now.'
    );

    if (parsedData.error) {
      return {
        data: null,
        error: parsedData.error,
      };
    }

    return {
      data: (parsedData.data as BathroomNeedMetadata | null) ?? null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load bathroom metadata right now.'),
        'Unable to load bathroom metadata right now.'
      ),
    };
  }
}

export async function fetchBathroomNeedMetadataForBathrooms(
  bathroomIds: string[]
): Promise<{ data: BathroomNeedMetadata[]; error: (Error & { code?: string }) | null }> {
  if (!bathroomIds.length) {
    return {
      data: [],
      error: null,
    };
  }

  try {
    const { data, error } = await getSupabaseClient()
      .from('bathroom_need_metadata' as never)
      .select('*')
      .in('bathroom_id', bathroomIds);

    if (error) {
      return {
        data: [],
        error: toAppError(error, 'Unable to load bathroom metadata right now.'),
      };
    }

    const parsedData = parseSupabaseRows(
      bathroomNeedMetadataSchema,
      data,
      'bathroom need metadata list',
      'Unable to load bathroom metadata right now.'
    );

    if (parsedData.error) {
      return {
        data: [],
        error: parsedData.error,
      };
    }

    return {
      data: parsedData.data as BathroomNeedMetadata[],
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load bathroom metadata right now.'),
        'Unable to load bathroom metadata right now.'
      ),
    };
  }
}

export async function fetchBathroomAccessibilityDetails(
  bathroomId: string
): Promise<{ data: BathroomAccessibilityDetails | null; error: (Error & { code?: string }) | null }> {
  try {
    const detailsResult = await getSupabaseClient()
      .from('bathroom_accessibility_details' as never)
      .select('*')
      .eq('bathroom_id', bathroomId)
      .maybeSingle();

    if (!detailsResult.error) {
      const parsedData = parseSupabaseNullableRow(
        bathroomAccessibilityDetailsSchema,
        detailsResult.data,
        'bathroom accessibility details',
        'Unable to load accessibility details right now.'
      );

      if (parsedData.error) {
        return {
          data: null,
          error: parsedData.error,
        };
      }

      return {
        data: (parsedData.data as BathroomAccessibilityDetails | null) ?? null,
        error: null,
      };
    }

    const fallbackResult = await getSupabaseClient()
      .from('v_bathroom_detail_public')
      .select('is_accessible,accessibility_features,updated_at')
      .eq('id', bathroomId)
      .maybeSingle();

    if (fallbackResult.error || !fallbackResult.data) {
      return {
        data: null,
        error: toAppError(
          detailsResult.error,
          'Unable to load accessibility details right now.'
        ),
      };
    }

    return {
      data: mapFallbackAccessibilityDetails(bathroomId, fallbackResult.data as {
        is_accessible: boolean | null;
        accessibility_features: {
          has_grab_bars?: boolean | null;
          door_width_inches?: number | null;
          turning_radius_inches?: number | null;
          stall_width_inches?: number | null;
          notes?: string | null;
          is_automatic_door?: boolean | null;
          has_wheelchair_ramp?: boolean | null;
        } | null;
        updated_at: string;
      }),
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load accessibility details right now.'),
        'Unable to load accessibility details right now.'
      ),
    };
  }
}

export async function fetchCurrentBathroomLiveStatus(
  bathroomId: string
): Promise<{ data: CurrentBathroomLiveStatus[]; error: (Error & { code?: string }) | null }> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('get_current_bathroom_live_status' as never)
      .select('*')
      .eq('bathroom_id', bathroomId)
      .order('reported_at', { ascending: false });

    if (error) {
      return {
        data: [],
        error: toAppError(error, 'Unable to load current live status right now.'),
      };
    }

    const parsedData = parseSupabaseRows(
      bathroomCurrentLiveStatusSchema,
      data,
      'current bathroom live status',
      'Unable to load current live status right now.'
    );

    if (parsedData.error) {
      return {
        data: [],
        error: parsedData.error,
      };
    }

    return {
      data: parsedData.data as CurrentBathroomLiveStatus[],
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load current live status right now.'),
        'Unable to load current live status right now.'
      ),
    };
  }
}

export async function reportBathroomLiveStatusEvent(
  input: ReportBathroomLiveStatusEventInput
): Promise<{ error: (Error & { code?: string }) | null }> {
  try {
    const { error } = await getSupabaseClient().from('bathroom_live_status_events' as never).insert(
      {
        bathroom_id: input.bathroomId,
        status_type: input.statusType,
        status_value: input.statusValue,
        wait_minutes: input.waitMinutes ?? null,
        occupancy_level: input.occupancyLevel ?? null,
        supplies_missing: input.suppliesMissing ?? [],
        confidence_score: input.confidenceScore ?? 0.5,
        evidence_photo_url: input.evidencePhotoUrl ?? null,
      } as never
    );

    if (error) {
      return {
        error: toAppError(error, 'Unable to report live status right now.'),
      };
    }

    return {
      error: null,
    };
  } catch (error) {
    return {
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to report live status right now.'),
        'Unable to report live status right now.'
      ),
    };
  }
}

export async function fetchSavedNeedProfiles(
  userId: string
): Promise<{ data: SavedNeedProfile[]; error: (Error & { code?: string }) | null }> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('saved_need_profiles' as never)
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('updated_at', { ascending: false });

    if (error) {
      return {
        data: [],
        error: toAppError(error, 'Unable to load saved need profiles right now.'),
      };
    }

    const parsedData = parseSupabaseRows(
      savedNeedProfileSchema,
      data,
      'saved need profiles',
      'Unable to load saved need profiles right now.'
    );

    if (parsedData.error) {
      return {
        data: [],
        error: parsedData.error,
      };
    }

    return {
      data: parsedData.data as SavedNeedProfile[],
      error: null,
    };
  } catch (error) {
    return {
      data: [],
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to load saved need profiles right now.'),
        'Unable to load saved need profiles right now.'
      ),
    };
  }
}

export async function createSavedNeedProfile(input: {
  userId: string;
  name: string;
  presetKey: SavedNeedProfile['preset_key'];
  filters: Record<string, unknown>;
  isDefault: boolean;
}): Promise<{ data: SavedNeedProfile | null; error: (Error & { code?: string }) | null }> {
  try {
    const { data, error } = await getSupabaseClient()
      .from('saved_need_profiles' as never)
      .insert({
        user_id: input.userId,
        name: input.name,
        preset_key: input.presetKey,
        filters: input.filters,
        is_default: input.isDefault,
      } as never)
      .select('*')
      .maybeSingle();

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to save this need profile right now.'),
      };
    }

    const parsedData = parseSupabaseNullableRow(
      savedNeedProfileSchema,
      data,
      'saved need profile',
      'Unable to save this need profile right now.'
    );

    if (parsedData.error) {
      return {
        data: null,
        error: parsedData.error,
      };
    }

    return {
      data: (parsedData.data as SavedNeedProfile | null) ?? null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to save this need profile right now.'),
        'Unable to save this need profile right now.'
      ),
    };
  }
}

export async function updateSavedNeedProfile(input: {
  profileId: string;
  userId: string;
  name?: string;
  filters?: Record<string, unknown>;
  presetKey?: SavedNeedProfile['preset_key'];
  isDefault?: boolean;
}): Promise<{ data: SavedNeedProfile | null; error: (Error & { code?: string }) | null }> {
  try {
    const patch: {
      name?: string;
      filters?: Record<string, unknown>;
      preset_key?: SavedNeedProfile['preset_key'];
      is_default?: boolean;
    } = {};

    if (typeof input.name === 'string') {
      patch.name = input.name;
    }

    if (input.filters) {
      patch.filters = input.filters;
    }

    if (typeof input.presetKey !== 'undefined') {
      patch.preset_key = input.presetKey;
    }

    if (typeof input.isDefault === 'boolean') {
      patch.is_default = input.isDefault;
    }

    const { data, error } = await getSupabaseClient()
      .from('saved_need_profiles' as never)
      .update(patch as never)
      .eq('id', input.profileId)
      .eq('user_id', input.userId)
      .select('*')
      .maybeSingle();

    if (error) {
      return {
        data: null,
        error: toAppError(error, 'Unable to update this need profile right now.'),
      };
    }

    const parsedData = parseSupabaseNullableRow(
      savedNeedProfileSchema,
      data,
      'saved need profile update',
      'Unable to update this need profile right now.'
    );

    if (parsedData.error) {
      return {
        data: null,
        error: parsedData.error,
      };
    }

    return {
      data: (parsedData.data as SavedNeedProfile | null) ?? null,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to update this need profile right now.'),
        'Unable to update this need profile right now.'
      ),
    };
  }
}

export async function deleteSavedNeedProfile(input: {
  profileId: string;
  userId: string;
}): Promise<{ error: (Error & { code?: string }) | null }> {
  try {
    const { error } = await getSupabaseClient()
      .from('saved_need_profiles' as never)
      .delete()
      .eq('id', input.profileId)
      .eq('user_id', input.userId);

    if (error) {
      return {
        error: toAppError(error, 'Unable to delete this need profile right now.'),
      };
    }

    return {
      error: null,
    };
  } catch (error) {
    return {
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to delete this need profile right now.'),
        'Unable to delete this need profile right now.'
      ),
    };
  }
}

export async function setDefaultSavedNeedProfile(input: {
  profileId: string;
  userId: string;
}): Promise<{ error: (Error & { code?: string }) | null }> {
  try {
    const resetResult = await getSupabaseClient()
      .from('saved_need_profiles' as never)
      .update({ is_default: false } as never)
      .eq('user_id', input.userId)
      .eq('is_default', true);

    if (resetResult.error) {
      return {
        error: toAppError(resetResult.error, 'Unable to update your default profile right now.'),
      };
    }

    const setResult = await getSupabaseClient()
      .from('saved_need_profiles' as never)
      .update({ is_default: true } as never)
      .eq('id', input.profileId)
      .eq('user_id', input.userId);

    if (setResult.error) {
      return {
        error: toAppError(setResult.error, 'Unable to update your default profile right now.'),
      };
    }

    return {
      error: null,
    };
  } catch (error) {
    return {
      error: toAppError(
        error instanceof Error ? error : new Error('Unable to update your default profile right now.'),
        'Unable to update your default profile right now.'
      ),
    };
  }
}
