import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  // nombre que el usuario dio al registrarse; si no lo tiene, la parte del correo antes de la @
  nombre: string;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  // conSesion: Supabase ya inició sesión (el proyecto no pide confirmar el correo)
  signUp: (
    email: string,
    password: string,
    nombre: string
  ) => Promise<{ error: string | null; conSesion: boolean }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Solo en desarrollo: evita tener que loguearse a mano en cada recarga
// mientras se prueba la app. No corre en un build de producción (__DEV__
// es false ahí). Las credenciales vienen de .env.local (no se suben a git);
// si no están, se salta el auto-login y se muestra el login normal.
const DEV_AUTO_LOGIN = {
  email: process.env.EXPO_PUBLIC_DEV_EMAIL ?? "",
  password: process.env.EXPO_PUBLIC_DEV_PASSWORD ?? "",
};
const HAY_AUTO_LOGIN = __DEV__ && DEV_AUTO_LOGIN.email !== "" && DEV_AUTO_LOGIN.password !== "";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // `loading` solo termina cuando se sabe si hay sesión, incluido el intento
    // de auto-login. Si el evento inicial de Supabase (sin sesión) lo
    // terminara antes, la app ya habría mandado al login y la sesión del
    // auto-login llegaría tarde.
    let autoLoginEnCurso = false;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session && HAY_AUTO_LOGIN) {
        autoLoginEnCurso = true;
        const { data: login } = await supabase.auth.signInWithPassword(DEV_AUTO_LOGIN);
        autoLoginEnCurso = false;
        setSession(login.session); // null si las credenciales de dev fallan o no hay red
      } else {
        setSession(data.session);
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (event === "INITIAL_SESSION") return; // de eso se encarga getSession
      setSession(newSession);
      if (!autoLoginEnCurso) setLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? mensajeDeError(error.message) : null };
  }

  async function signUp(email: string, password: string, nombre: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre } },
    });
    return { error: error ? mensajeDeError(error.message) : null, conSesion: !!data.session };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  const nombre = nombreVisible(session);

  return (
    <AuthContext.Provider value={{ session, loading, nombre, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// Supabase responde en inglés; estos son los casos que ve un usuario normal.
function mensajeDeError(mensaje: string) {
  const m = mensaje.toLowerCase();
  if (m.includes("invalid login credentials")) return "Correo o contraseña incorrectos.";
  if (m.includes("email not confirmed")) return "Confirma tu correo antes de ingresar. Revisa tu bandeja de entrada.";
  if (m.includes("already registered")) return "Ya existe una cuenta con ese correo.";
  if (m.includes("password should be")) return "La contraseña debe tener al menos 6 caracteres.";
  if (m.includes("invalid format") || m.includes("is invalid")) return "Ese correo no parece válido.";
  if (m.includes("rate limit") || m.includes("too many")) return "Demasiados intentos. Espera un momento y vuelve a probar.";
  if (m.includes("fetch") || m.includes("network")) return "No hay conexión. Revisa tu internet e inténtalo de nuevo.";
  return mensaje;
}

function nombreVisible(session: Session | null) {
  const delRegistro = session?.user.user_metadata?.nombre;
  if (typeof delRegistro === "string" && delRegistro.trim() !== "") return delRegistro.trim();
  return session?.user.email?.split("@")[0] ?? "";
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
