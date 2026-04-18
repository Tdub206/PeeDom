import { createClient } from 'jsr:@supabase/supabase-js@2';

interface BathroomPhotoRow {
  storage_bucket: string;
  storage_path: string;
}

interface BathroomReferenceRow {
  id: string;
}

const jsonHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: jsonHeaders,
  });
}

function requireEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', {
      headers: jsonHeaders,
    });
  }

  if (request.method !== 'POST') {
    return jsonResponse(
      {
        error: 'Method not allowed.',
      },
      405
    );
  }

  try {
    const authorizationHeader = request.headers.get('Authorization');

    if (!authorizationHeader) {
      return jsonResponse(
        {
          error: 'Missing authorization header.',
        },
        401
      );
    }

    const supabaseUrl = requireEnv('SUPABASE_URL');
    const anonKey = requireEnv('SUPABASE_ANON_KEY');
    const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

    const userClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authorizationHeader,
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse(
        {
          error: 'Unable to authenticate the current user.',
        },
        401
      );
    }

    const [
      { data: bathroomPhotos, error: photoQueryError },
      { data: authoredBathrooms, error: bathroomReferenceError },
      { data: reviewedClaims, error: claimReferenceError },
    ] = await Promise.all([
      adminClient
        .from('bathroom_photos')
        .select('storage_bucket, storage_path')
        .eq('uploaded_by', user.id),
      adminClient.from('bathrooms').select('id').eq('created_by', user.id),
      adminClient.from('business_claims').select('id').eq('reviewed_by', user.id),
    ]);

    if (photoQueryError || bathroomReferenceError || claimReferenceError) {
      console.error('Unable to prepare account deletion:', {
        photoQueryError,
        bathroomReferenceError,
        claimReferenceError,
        userId: user.id,
      });

      return jsonResponse(
        {
          error: 'Unable to prepare account deletion right now.',
        },
        500
      );
    }

    const authoredBathroomIds = ((authoredBathrooms ?? []) as BathroomReferenceRow[]).map((bathroom) => bathroom.id);
    const reviewedClaimIds = ((reviewedClaims ?? []) as BathroomReferenceRow[]).map((claim) => claim.id);
    const mutationTasks: Promise<unknown>[] = [];

    if (authoredBathroomIds.length > 0) {
      mutationTasks.push(
        adminClient.from('bathrooms').update({ created_by: null }).in('id', authoredBathroomIds)
      );
    }

    if (reviewedClaimIds.length > 0) {
      mutationTasks.push(
        adminClient.from('business_claims').update({ reviewed_by: null }).in('id', reviewedClaimIds)
      );
    }

    const mutationResults = await Promise.all(mutationTasks);
    const mutationErrors = mutationResults
      .map((result) => (typeof result === 'object' && result !== null && 'error' in result ? result.error : null))
      .filter(Boolean);

    if (mutationErrors.length > 0) {
      console.error('Unable to anonymize account-owned references before deletion:', {
        mutationErrors,
        userId: user.id,
      });

      return jsonResponse(
        {
          error: 'Unable to prepare account deletion right now.',
        },
        500
      );
    }

    const photoRows = (bathroomPhotos ?? []) as BathroomPhotoRow[];
    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(user.id);

    if (deleteUserError) {
      console.error('Unable to delete account:', deleteUserError);

      const restoreTasks: Promise<unknown>[] = [];

      if (authoredBathroomIds.length > 0) {
        restoreTasks.push(
          adminClient.from('bathrooms').update({ created_by: user.id }).in('id', authoredBathroomIds)
        );
      }

      if (reviewedClaimIds.length > 0) {
        restoreTasks.push(
          adminClient.from('business_claims').update({ reviewed_by: user.id }).in('id', reviewedClaimIds)
        );
      }

      const restoreResults = await Promise.all(restoreTasks);
      const [restoreBathroomsError, restoreClaimsError] = restoreResults.map((result) =>
        typeof result === 'object' && result !== null && 'error' in result ? result.error : null
      );

      if (restoreBathroomsError || restoreClaimsError) {
        console.error('Unable to restore authorship after failed account deletion:', {
          restoreBathroomsError,
          restoreClaimsError,
          userId: user.id,
        });
      }

      return jsonResponse(
        {
          error: 'Unable to delete your account right now.',
        },
        500
      );
    }

    let cleanupWarning: string | null = null;

    if (photoRows.length > 0) {
      const bucketGroups = photoRows.reduce<Record<string, string[]>>((groups, photoRow) => {
        const currentGroup = groups[photoRow.storage_bucket] ?? [];
        currentGroup.push(photoRow.storage_path);
        groups[photoRow.storage_bucket] = currentGroup;
        return groups;
      }, {});

      for (const [bucketName, paths] of Object.entries(bucketGroups)) {
        const { error: storageCleanupError } = await adminClient.storage.from(bucketName).remove(paths);

        if (storageCleanupError) {
          cleanupWarning = 'The account was deleted, but a few uploaded photos could not be cleaned up automatically.';
          console.error('Unable to clean up bathroom photo storage objects after account deletion:', {
            bucketName,
            paths,
            storageCleanupError,
            userId: user.id,
          });
          break;
        }
      }
    }

    return jsonResponse({
      success: true,
      warning: cleanupWarning,
    });
  } catch (error) {
    console.error('Unexpected delete-account failure:', error);

    return jsonResponse(
      {
        error: 'Unexpected account deletion failure.',
      },
      500
    );
  }
});
