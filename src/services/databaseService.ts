import { supabase } from "@/lib/supabase/client";
import { Cliente, CapitalConfig } from "@/types/database";

export const clienteService = {
  async getAll(userId: string) {
    const { data, error } = await supabase
      .from("clientes")
      .select("*, prestamos(*)")
      .eq("user_id", userId)
      .order("nombre", { ascending: true });
    
    if (error) throw error;
    return data as Cliente[];
  },

  async getById(id: string, userId: string) {
    const { data, error } = await supabase
      .from("clientes")
      .select("*, prestamos(*)")
      .eq("id", id)
      .eq("user_id", userId)
      .single();
    
    if (error) throw error;
    return data as Cliente;
  },

  async create(cliente: Omit<Cliente, "id" | "created_at">) {
    const { data, error } = await supabase
      .from("clientes")
      .insert(cliente)
      .select()
      .single();
    
    if (error) throw error;
    return data as Cliente;
  }
};

export const dashboardService = {
  async getStats(userId: string) {
    const { data, error } = await supabase
      .from("capital_config")
      .select("*")
      .eq("user_id", userId)
      .single();
    
    if (error) throw error;
    return data as CapitalConfig;
  }
};
