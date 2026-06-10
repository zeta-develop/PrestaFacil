"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      // Check if user has a profile, otherwise they might not have roles
      // For now, redirect to dashboard or home
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión. Verifica tus credenciales.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col flex-1 p-8 justify-center relative z-10">
      <div className="w-full max-w-sm mx-auto space-y-10">
        <div className="space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 shadow-[0_0_20px_rgba(45,212,191,0.4)] mb-4">
            <span className="text-2xl font-black text-white">P</span>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-white">
            Bienvenido
          </h1>
          <p className="text-zinc-400 text-sm">
            Ingresa a tu cuenta de PrestaFácil
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="block text-xs font-medium text-zinc-400 uppercase tracking-wider pl-1"
            >
              Correo Electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              required
              className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all text-white placeholder-zinc-600 backdrop-blur-md"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between pl-1">
              <label
                htmlFor="password"
                className="block text-xs font-medium text-zinc-400 uppercase tracking-wider"
              >
                Contraseña
              </label>
              <Link
                href="#"
                className="text-xs text-teal-400 hover:text-teal-300 transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all text-white placeholder-zinc-600 backdrop-blur-md"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-4 bg-white text-zinc-950 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold rounded-2xl transition-all active:scale-[0.98] shadow-lg mt-4"
          >
            {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-400">
          ¿No tienes una cuenta?{" "}
          <Link
            href="/register"
            className="text-white hover:text-teal-400 font-medium transition-colors"
          >
            Regístrate
          </Link>
        </p>
      </div>
    </main>
  );
}
