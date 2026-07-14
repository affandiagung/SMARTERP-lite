import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "viewer";
};

const accessCookie = "smarterp_access_token";
const refreshCookie = "smarterp_refresh_token";

function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return { url, anonKey };
}

export async function signInWithPassword(email: string, password: string) {
  const { url, anonKey } = supabaseConfig();
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password }),
    cache: "no-store"
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error_description || payload.msg || "Invalid email or password.");
  }

  const cookieStore = await cookies();
  cookieStore.set(accessCookie, payload.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: payload.expires_in ?? 3600
  });
  cookieStore.set(refreshCookie, payload.refresh_token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });

  const userId = payload.user.id as string;
  const role = email === "admin@smarterp.test" ? "ADMIN" : "VIEWER";
  const name = email === "admin@smarterp.test" ? "Aisha Admin" : "Omar Viewer";

  await prisma.userProfile.upsert({
    where: { id: userId },
    update: { email, name, role },
    create: { id: userId, email, name, role }
  });
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete(accessCookie);
  cookieStore.delete(refreshCookie);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(accessCookie)?.value;

  if (!accessToken) return null;

  const { url, anonKey } = supabaseConfig();
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`
    },
    cache: "no-store"
  });

  if (!response.ok) return null;

  const authUser = await response.json();
  const profile = await prisma.userProfile.findUnique({ where: { id: authUser.id } });

  if (!profile) return null;

  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role === "ADMIN" ? "admin" : "viewer"
  };
}

export async function requireAdmin() {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    throw new Error("Admin access is required for this action.");
  }

  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) redirect("/");

  return user;
}
