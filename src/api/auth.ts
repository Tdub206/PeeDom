import { AuthError, Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

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

async function withAuthResult<T>(
  operation: () => Promise<{ data: T; error: AuthError | null }>
): Promise<{ data: T | null; error: AuthError | null }> {
  try {
    const { data, error } = await operation();

    if (error) {
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof AuthError ? error : new AuthError('Unexpected authentication error.'),
    };
  }
}

export async function signInWithEmail(payload: SignInPayload): Promise<AuthResult> {
  const result = await withAuthResult(() =>
    supabase.auth.signInWithPassword({
      email: payload.email,
      password: payload.password,
    })
  );

  if (result.error || !result.data) {
    return { error: result.error ?? new AuthError('Unable to sign in.'), data: null };
  }

  return {
    error: null,
    data: {
      session: result.data.session,
      user: result.data.user,
    },
  };
}

export async function signUpWithEmail(payload: SignUpPayload): Promise<AuthResult> {
  const result = await withAuthResult(() =>
    supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          display_name: payload.displayName,
        },
      },
    })
  );

  if (result.error || !result.data) {
    return { error: result.error ?? new AuthError('Unable to create account.'), data: null };
  }

  return {
    error: null,
    data: {
      session: result.data.session,
      user: result.data.user,
    },
  };
}

export async function signOutUser(): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (error) {
    return {
      error: error instanceof AuthError ? error : new AuthError('Unable to sign out right now.'),
    };
  }
}

export async function resetPassword(email: string): Promise<{ error: AuthError | null }> {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error };
  } catch (error) {
    return {
      error: error instanceof AuthError ? error : new AuthError('Unable to send the reset email.'),
    };
  }
}
