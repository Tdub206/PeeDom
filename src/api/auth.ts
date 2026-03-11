import { AuthError, Session, User } from '@supabase/supabase-js';
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

function toFailure(error: unknown, fallbackMessage: string): AuthFailure {
  return {
    error: error instanceof AuthError ? error : new AuthError(fallbackMessage),
    data: null,
  };
}

export async function signInWithEmail(payload: SignInPayload): Promise<AuthResult> {
  try {
    const { data, error } = await getSupabaseClient().auth.signInWithPassword({
      email: payload.email,
      password: payload.password,
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
  try {
    const { data, error } = await getSupabaseClient().auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          display_name: payload.displayName,
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
