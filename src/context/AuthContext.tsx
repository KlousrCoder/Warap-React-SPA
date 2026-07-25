import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import type { Session, User } from "@supabase/supabase-js";

export type UserRole = "client" | "provider" | "admin";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: true; role: UserRole } | { ok: false; error: string }>;
  register: (input: { name: string; email: string; password: string; role: Exclude<UserRole, "admin">; providerCategory?: string }) => Promise<{ ok: true; role: UserRole; needsEmailConfirmation?: boolean } | { ok: false; error: string }>;
  googleLogin: () => Promise<{ ok: true } | { ok: false; error: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function dashboardPathFor(role: UserRole): string {
  if (role === "client") return "/dashboard/client";
  if (role === "provider") return "/dashboard/provider";
  return "/dashboard/admin";
}

async function fetchRole(userId: string): Promise<UserRole | null> {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId).limit(1).maybeSingle();
  return (data?.role as UserRole | undefined) ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => {
          fetchRole(s.user.id).then(setRole);
        }, 0);
      } else {
        setRole(null);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        fetchRole(data.session.user.id).then((r) => {
          setRole(r);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login: AuthContextValue["login"] = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return { ok: false, error: error?.message ?? "Identifiants invalides" };
    const r = (await fetchRole(data.user.id)) ?? "client";
    return { ok: true, role: r };
  }, []);

  const register: AuthContextValue["register"] = useCallback(async (input) => {
    const redirectUrl = `${window.location.origin}/`;
    const { data, error } = await supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { name: input.name, role: input.role, provider_category: input.providerCategory ?? null },
      },
    });
    if (error) {
      const m = error.message.toLowerCase();
      const msg = m.includes("registered") || m.includes("already") || m.includes("exists") || m.includes("duplicate")
        ? "Cet email est déjà associé à un compte. Essayez de vous connecter."
        : error.message;
      return { ok: false, error: msg };
    }
    if (!data.user) return { ok: false, error: "Erreur lors de la création du compte" };
    // Supabase: en cas d'email déjà utilisé, identities=[] et aucune session n'est renvoyée
    const noIdentities = !data.user.identities || data.user.identities.length === 0;
    if (noIdentities) {
      return { ok: false, error: "Cet email est déjà associé à un compte. Essayez de vous connecter." };
    }
    // Si la confirmation par email est requise, aucune session n'est créée
    const needsEmailConfirmation = !data.session;
    return { ok: true, role: input.role, needsEmailConfirmation };
  }, []);


  const googleLogin: AuthContextValue["googleLogin"] = useCallback(async () => {
    let extraParams: Record<string, string> | undefined;
    try {
      const pending = JSON.parse(sessionStorage.getItem("pending_signup") ?? "null") as { role?: string; providerCategory?: string } | null;
      if (pending?.role === "provider" && pending.providerCategory) {
        extraParams = { role: "provider", provider_category: pending.providerCategory };
      }
    } catch {}
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/onboarding`, extraParams });
    if (result.error) return { ok: false, error: result.error.message };
    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user, session, role, isAuthenticated: !!user, loading,
    login, register, googleLogin, logout,
  }), [user, session, role, loading, login, register, googleLogin, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
