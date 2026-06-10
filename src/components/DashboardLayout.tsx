"use client";

import ProtectedRoute from "./ProtectedRoute";
import BottomNav from "./BottomNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen pb-20">
        {children}
        <BottomNav />
      </div>
    </ProtectedRoute>
  );
}
