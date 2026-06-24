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

  const isDraggingRef = useRef(false);
  const pullDistanceRef = useRef(0);
  const refreshingRef = useRef(false);
  
  const PULL_THRESHOLD = 70;
  const MAX_PULL = 100;

  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  useEffect(() => {
    pullDistanceRef.current = pullDistance;
  }, [pullDistance]);

  useEffect(() => {
    refreshingRef.current = refreshing;
  }, [refreshing]);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop;
      if (scrollTop === 0 && !refreshingRef.current) {
        startY.current = e.touches[0].pageY;
        setIsDragging(true);
        isDraggingRef.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || refreshingRef.current) return;
      
      currentY.current = e.touches[0].pageY;
      const diff = currentY.current - startY.current;
      
      if (diff > 0) {
        const resistanceDiff = Math.min(diff * 0.45, MAX_PULL);
        setPullDistance(resistanceDiff);
        pullDistanceRef.current = resistanceDiff;
        
        if (e.cancelable) {
          e.preventDefault();
        }
      } else {
        setPullDistance(0);
        pullDistanceRef.current = 0;
        setIsDragging(false);
        isDraggingRef.current = false;
      }
    };

    const handleTouchEnd = async () => {
      if (!isDraggingRef.current || refreshingRef.current) return;
      
      setIsDragging(false);
      isDraggingRef.current = false;
      
      const currentPull = pullDistanceRef.current;
      
      if (currentPull >= PULL_THRESHOLD) {
        setRefreshing(true);
        refreshingRef.current = true;
        setPullDistance(PULL_THRESHOLD);
        pullDistanceRef.current = PULL_THRESHOLD;
        
        try {
          await queryClient.refetchQueries({ type: 'active' });
        } catch (err) {
          console.error("Error al refrescar las peticiones:", err);
        } finally {
          setRefreshing(false);
          refreshingRef.current = false;
          setPullDistance(0);
          pullDistanceRef.current = 0;
        }
      } else {
        setPullDistance(0);
        pullDistanceRef.current = 0;
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
  }, [queryClient]);

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
