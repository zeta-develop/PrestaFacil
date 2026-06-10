"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) throw error;

      setSuccess(true);
      // Wait a bit before redirecting, or let the user click a button
      setTimeout(() => {
        router.push("/login");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Error al crear la cuenta. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-col flex-1 p-8 justify-center relative z-10">
      <div className="w-full max-w-sm mx-auto space-y-10">
        <div className="space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 shadow-[0_0_20px_rgba(45,212,191,0.4)] mb-4">
            <span className="text-2xl font-black text-white">R</span>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-white">
            Crear Cuenta
          </h1>
          <p className="text-zinc-400 text-sm">
            Únete a PrestaFácil para empezar
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          {error && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-400 text-sm">
              Cuenta creada con éxito. Redirigiendo...
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="fullName"
              className="block text-xs font-medium text-zinc-400 uppercase tracking-wider pl-1"
            >
              Nombre Completo
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ej. Juan Pérez"
              required
              className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all text-white placeholder-zinc-600 backdrop-blur-md"
            />
          </div>

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
            <label
              htmlFor="password"
              className="block text-xs font-medium text-zinc-400 uppercase tracking-wider pl-1"
            >
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full px-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none transition-all text-white placeholder-zinc-600 backdrop-blur-md"
            />
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full py-4 px-4 bg-white text-zinc-950 hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed font-semibold rounded-2xl transition-all active:scale-[0.98] shadow-lg mt-4"
          >
            {loading ? "Registrando..." : "Registrarse"}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-400">
          ¿Ya tienes una cuenta?{" "}
          <Link
            href="/login"
            className="text-white hover:text-teal-400 font-medium transition-colors"
          >
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
