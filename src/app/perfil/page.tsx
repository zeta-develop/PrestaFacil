"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import DashboardLayout from "@/components/DashboardLayout";
import { LogOut, Shield, DollarSign, Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useRef } from "react";

export default function PerfilPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { data: session } = useAuth();

  const [saving, setSaving] = useState(false);
  const [appVersion, setAppVersion] = useState("0.2.0");

  const capitalRef = useRef<HTMLInputElement>(null);
  const diaCorteRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const getVersion = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const info = await App.getInfo();
          setAppVersion(`${info.version} (Build ${info.build})`);
        } catch (err) {
          console.error("Error obteniendo versión de app:", err);
        }
      }
    };
    getVersion();
  }, []);

  const { data: profileConfig, isLoading: loading } = useQuery({
    queryKey: ["perfil_config", session?.id],
    enabled: !!session?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("capital_config")
        .select("capital_inicial, dia_corte_kpi")
        .eq("user_id", session!.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }

      return data;
    }
  });

  const userInfo = session ? {
    email: session.email || "",
    name: session.user_metadata?.full_name || session.email?.split("@")[0] || "Usuario",
  } : null;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const handleSaveCapital = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use refs to get values since uncontrolled components don't re-render on edit,
      // preventing re-render cascading while also allowing standard UI pattern
      const numCapital = parseFloat(capitalRef.current?.value || "0");
      const numDiaCorte = parseInt(diaCorteRef.current?.value || "1");

      if (numDiaCorte < 1 || numDiaCorte > 28) {
        alert("El día de corte debe estar entre 1 y 28");
        setSaving(false);
        return;
      }

      // Upsert logic (checking if exists first)
      const { data: existing } = await supabase
        .from("capital_config")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (existing) {
        await supabase
          .from("capital_config")
          .update({ 
            capital_inicial: numCapital,
            dia_corte_kpi: numDiaCorte
          })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("capital_config")
          .insert({
            user_id: user.id,
            capital_inicial: numCapital,
            capital_disponible: 0,
            dia_corte_kpi: numDiaCorte
          });
      }
      
      alert("Configuración actualizada con éxito");
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
                      <h4 className="font-semibold text-sm">Finanzas y KPIs</h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Ajusta la base y el día de corte de tu negocio</p>
                    </div>
                  </div>
                </div>
                 
                <div className="flex flex-col gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest pl-1">Capital Inicial</label>
                    <input
                      ref={capitalRef}
                      type="number"
                      key={loading ? 'loading-cap' : 'ready-cap'} // only remount once when loading finishes
                      defaultValue={profileConfig?.capital_inicial ?? ""}
                      placeholder="Ej. 18000"
                      className="w-full px-4 py-3.5 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none text-zinc-900 dark:text-white transition-all backdrop-blur-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest pl-1">Día de Corte Mensual (1 al 28)</label>
                    <input
                      ref={diaCorteRef}
                      type="number"
                      min="1"
                      max="28"
                      key={loading ? 'loading-dia' : 'ready-dia'}
                      defaultValue={profileConfig?.dia_corte_kpi ?? "1"}
                      placeholder="Ej. 23"
                      className="w-full px-4 py-3.5 bg-zinc-50 dark:bg-black/20 border border-zinc-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 outline-none text-zinc-900 dark:text-white transition-all backdrop-blur-sm"
                    />
                  </div>

                  <button 
                    onClick={handleSaveCapital}
                    disabled={saving}
                    className="w-full py-3.5 mt-2 rounded-2xl bg-teal-500 hover:bg-teal-600 text-white dark:text-zinc-950 font-bold transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(20,184,166,0.3)] active:scale-[0.98]"
                  >
                    {saving ? "Guardando..." : "Actualizar Configuración"}
                  </button>
                </div>
              </div>

              {/* Tema de la app */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-zinc-900 dark:text-white transition-colors duration-300">
                    <div className="p-2 rounded-xl bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-400">
                      {theme === "dark" ? <Moon size={20} /> : <Sun size={20} />}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">Tema Visual</h4>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Cambiar a {theme === "dark" ? "Modo Claro" : "Modo Oscuro"}</p>
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
            <section className="pt-4 space-y-6">
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 text-red-600 dark:text-red-500 font-semibold rounded-2xl border border-red-200 dark:border-red-500/20 transition-all active:scale-[0.98]"
              >
                <LogOut size={20} />
                Cerrar Sesión
              </button>

              <div className="text-center pt-2 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                PrestaFácil v{appVersion}
              </div>
            </section>
          </>
        )}
      </main>
    </DashboardLayout>
  );
}
