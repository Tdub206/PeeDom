import { AuthError, Session, User } from '@supabase/supabase-js';
import { z } from 'zod';
import { getSupabaseClient } from '@/lib/supabase';

interface AuthSuccess {
  error: null;
  data: {
    session: Session | null;
    user: User | null;
  };
}

interface AuthFailure {
  error: AuthError;
  data: null;
}

export type AuthResult = AuthSuccess | AuthFailure;

export interface SignInPayload {
  email: string;
  password: string;
}

export interface SignUpPayload extends SignInPayload {
  displayName: string;
}

const signInPayloadSchema = z.object({
  email: z.string().trim().min(1).email(),
  password: z.string().min(8),
});

const signUpPayloadSchema = signInPayloadSchema.extend({
  displayName: z.string().trim().min(2).max(50),
});

function toFailure(error: unknown, fallbackMessage: string): AuthFailure {
  return {
    error: error instanceof AuthError ? error : new AuthError(fallbackMessage),
    data: null,
  };
}

function toValidationFailure(error: z.ZodError, fallbackMessage: string): AuthFailure {
  return {
    error: new AuthError(error.issues[0]?.message || fallbackMessage),
    data: null,
  };
}

export async function signInWithEmail(payload: SignInPayload): Promise<AuthResult> {
  const parsedPayload = signInPayloadSchema.safeParse(payload);

  if (!parsedPayload.success) {
    return toValidationFailure(parsedPayload.error, 'Unable to sign in.');
  }

  try {
    const { data, error } = await getSupabaseClient().auth.signInWithPassword({
      email: parsedPayload.data.email,
      password: parsedPayload.data.password,
    });

    if (error) {
      return { error, data: null };
    }

    return {
      error: null,
      data: {
        session: data.session,
        user: data.user,
      },
    };
  } catch (error) {
    return toFailure(error, 'Unable to sign in.');
  }
}

export async function signUpWithEmail(payload: SignUpPayload): Promise<AuthResult> {
  const parsedPayload = signUpPayloadSchema.safeParse(payload);

  if (!parsedPayload.success) {
    return toValidationFailure(parsedPayload.error, 'Unable to create account.');
  }

  try {
    const { data, error } = await getSupabaseClient().auth.signUp({
      email: parsedPayload.data.email,
      password: parsedPayload.data.password,
      options: {
        data: {
          display_name: parsedPayload.data.displayName,
        },
      },
    });

    if (error) {
      return { error, data: null };
    }

    return {
      error: null,
      data: {
        session: data.session,
        user: data.user,
      },
    };
  } catch (error) {
    return toFailure(error, 'Unable to create account.');
  }
}

export async function signOutUser(): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await getSupabaseClient().auth.signOut();
    return { error };
  } catch (error) {
    return {
      error: error instanceof AuthError ? error : new AuthError('Unable to sign out right now.'),
    };
  }
}

export async function resetPassword(email: string): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email);
    return { error };
  } catch (error) {
    return {
      error: error instanceof AuthError ? error : new AuthError('Unable to send the reset email.'),
    };
  }
}
