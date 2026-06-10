"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, Map, User } from "lucide-react";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Inicio", href: "/", icon: Home },
    { name: "Clientes", href: "/clientes", icon: Users },
    { name: "Rutas", href: "/rutas", icon: Map },
    { name: "Perfil", href: "/perfil", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md border-t border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl pb-safe transition-colors duration-300">
      <div className="flex h-16 items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-all active:scale-95 ${
                isActive 
                  ? "text-teal-600 dark:text-teal-400" 
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
              }`}
            >
              <Icon size={24} className={isActive ? "drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" : ""} />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
