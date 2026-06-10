"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { LogOut, User, Settings, Shield, DollarSign, Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

export default function PerfilPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userInfo, setUserInfo] = useState<{ email: string; name: string } | null>(null);
  const [capital, setCapital] = useState("");

  useEffect(() => {
    setMounted(true);
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        setUserInfo({
          email: user.email || "",
          name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuario",
        });

        const { data } = await supabase
          .from("capital_config")
          .select("capital_inicial")
          .eq("user_id", user.id)
          .single();

        if (data) {
          setCapital(String(data.capital_inicial ?? 0));
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const handleSaveCapital = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const numCapital = parseFloat(capital) || 0;

      // Upsert logic (checking if exists first)
      const { data: existing } = await supabase
        .from("capital_config")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (existing) {
        await supabase
          .from("capital_config")
          .update({ capital_inicial: numCapital })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("capital_config")
          .insert({
            user_id: user.id,
            capital_inicial: numCapital,
            capital_disponible: numCapital,
            dia_corte_kpi: 1
          });
      }
      
      alert("Capital actualizado con éxito");
    } catch (error) {
      console.error("Error saving capital:", error);
      alert("Hubo un error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <main className="flex-1 p-6 space-y-8 relative z-10">
        <header className="flex items-center justify-between pt-2">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white tracking-tight transition-colors duration-300">Perfil</h1>
        </header>

        {loading ? (
           <div className="flex justify-center py-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-500 border-t-transparent"></div>
          </div>
        ) : (
          <>
            {/* Tarjeta de Usuario */}
            <section className="rounded-3xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-6 shadow-lg dark:shadow-none backdrop-blur-md flex flex-col items-center text-center space-y-4 transition-colors duration-300">
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-teal-400 to-indigo-600 shadow-[0_0_20px_rgba(45,212,191,0.3)] flex items-center justify-center text-white text-3xl font-black">
                {userInfo?.name ? userInfo.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white transition-colors duration-300">{userInfo?.name || "Usuario"}</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{userInfo?.email || "Cargando..."}</p>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-widest border border-indigo-100 dark:border-indigo-500/20">
                <Shield size={12} />
                Administrador
              </div>
            </section>

            {/* Ajustes Rápidos */}
            <section className="space-y-4">
              <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-widest pl-1">Configuración</h3>
              
              <div className="rounded-3xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-5 shadow-lg dark:shadow-none backdrop-blur-md space-y-5 transition-colors duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-zinc-900 dark:text-white transition-colors duration-300">
                    <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400">
                      <DollarSign size={20} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">Capital Inicial</h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Ajusta la base de tu negocio</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-3">
                  <input
                    type="number"
                    value={capital}
                    onChange={(e) => setCapital(e.target.value)}
                    placeholder="Ej. 10000"
                    className="w-full px-4 py-3.5 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none text-zinc-900 dark:text-white transition-all backdrop-blur-sm"
                  />
                  <button 
                    onClick={handleSaveCapital}
                    disabled={saving}
                    className="w-full py-3.5 rounded-2xl bg-teal-500 hover:bg-teal-600 text-white dark:text-zinc-950 font-bold transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(20,184,166,0.3)] active:scale-[0.98]"
                  >
                    {saving ? "Guardando..." : "Actualizar Capital"}
                  </button>
                </div>
              </div>

              {/* Tema de la app */}
              <div className="rounded-3xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 p-5 shadow-lg dark:shadow-none backdrop-blur-md flex items-center justify-between transition-colors duration-300">
                <div className="flex items-center gap-3 text-zinc-900 dark:text-white transition-colors duration-300">
                  <div className="p-2 rounded-xl bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-400">
                    {mounted && theme === "dark" ? <Moon size={20} /> : <Sun size={20} />}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Tema Visual</h4>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Cambiar a {mounted && theme === "dark" ? "Modo Claro" : "Modo Oscuro"}</p>
                  </div>
                </div>
                <button
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/20 text-zinc-900 dark:text-white font-semibold text-sm transition-all active:scale-95"
                >
                  Alternar
                </button>
              </div>
            </section>

            {/* Acciones */}
            <section className="pt-4">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-500 font-semibold rounded-2xl border border-red-200 dark:border-red-500/20 transition-all active:scale-[0.98]"
              >
                <LogOut size={20} />
                Cerrar Sesión
              </button>
            </section>
          </>
        )}
      </main>
    </DashboardLayout>
  );
}
