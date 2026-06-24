"use client";

import { useState, useEffect, useRef } from "react";
import ProtectedRoute from "./ProtectedRoute";
import BottomNav from "./BottomNav";
import { RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const startY = useRef(0);
  const currentY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const PULL_THRESHOLD = 70; // Distancia mínima para activar el refresh
  const MAX_PULL = 100; // Distancia máxima visible del indicador

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // Solo iniciar el arrastre si estamos en el tope superior del scroll
      if (window.scrollY === 0 && !refreshing) {
        startY.current = e.touches[0].pageY;
        setIsDragging(true);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging || refreshing) return;
      
      currentY.current = e.touches[0].pageY;
      const diff = currentY.current - startY.current;
      
      if (diff > 0) {
        // Lógica de resistencia táctil (atenuación logarítmica)
        const resistanceDiff = Math.min(diff * 0.45, MAX_PULL);
        setPullDistance(resistanceDiff);
        
        // Prevenir el scroll nativo/rebote si estamos arrastrando hacia abajo
        if (e.cancelable) {
          e.preventDefault();
        }
      } else {
        setPullDistance(0);
        setIsDragging(false);
      }
    };

    const handleTouchEnd = async () => {
      if (!isDragging || refreshing) return;
      
      setIsDragging(false);
      
      if (pullDistance >= PULL_THRESHOLD) {
        setRefreshing(true);
        setPullDistance(PULL_THRESHOLD); // Quedar suspendido en el umbral mientras recarga
        
        try {
          // Refrescar todas las queries activas en React Query v5
          await queryClient.refetchQueries({ type: 'active' });
        } catch (err) {
          console.error("Error al refrescar las peticiones:", err);
        } finally {
          setRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("touchstart", handleTouchStart, { passive: true });
      container.addEventListener("touchmove", handleTouchMove, { passive: false });
      container.addEventListener("touchend", handleTouchEnd);
    }

    return () => {
      if (container) {
        container.removeEventListener("touchstart", handleTouchStart);
        container.removeEventListener("touchmove", handleTouchMove);
        container.removeEventListener("touchend", handleTouchEnd);
      }
    };
  }, [isDragging, pullDistance, refreshing, queryClient]);

  // Rotación del icono mientras arrastras o refrescas
  const rotation = refreshing ? "animate-spin" : "";
  const progressPercent = Math.min((pullDistance / PULL_THRESHOLD) * 100, 100);

  return (
    <ProtectedRoute>
      <div 
        ref={containerRef} 
        className="flex flex-col min-h-screen pb-20 relative select-none"
      >
        {/* Indicador de Pull to Refresh */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 z-50 flex items-center justify-center pointer-events-none transition-all duration-300 ease-out"
          style={{
            top: `${pullDistance - 45}px`,
            opacity: pullDistance > 10 ? Math.min(pullDistance / PULL_THRESHOLD, 1) : 0,
            transform: `translate3d(-50%, 0, 0) scale(${pullDistance > 15 ? Math.min(pullDistance / PULL_THRESHOLD, 1.1) : 0.5})`,
          }}
        >
          <div className="h-10 w-10 rounded-full bg-white/90 dark:bg-zinc-900/90 border border-zinc-200 dark:border-white/10 shadow-lg backdrop-blur-md flex items-center justify-center">
            <RefreshCw 
              size={16} 
              className={`text-teal-500 dark:text-teal-400 ${rotation}`} 
              style={{
                transform: refreshing ? undefined : `rotate(${pullDistance * 4}deg)`,
                transition: refreshing ? undefined : 'transform 0.1s linear'
              }}
            />
          </div>
        </div>

        {/* Contenido Principal */}
        <div 
          className="flex-1 transition-transform duration-300 ease-out"
          style={{
            transform: pullDistance > 0 ? `translate3d(0, ${pullDistance * 0.4}px, 0)` : undefined
          }}
        >
          {children}
        </div>

        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
