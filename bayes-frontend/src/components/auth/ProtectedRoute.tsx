"use client";

import { useAuth } from "@/lib/auth-context";
import { ReactNode } from "react";
import LoginButton from "./LoginButton";
import { Card } from "@/components/ui/card";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

interface ProtectedRouteProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export default function ProtectedRoute({
  children,
  fallback,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className={cn("min-h-screen bg-background", inter.className)}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground font-medium">Loading...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      fallback || (
        <main className={cn("min-h-screen bg-background", inter.className)}>
          <div className="container mx-auto px-4 py-16">
            <div className="flex items-center justify-center min-h-[70vh]">
              <div className="max-w-md mx-auto">
                <Card className="p-8 text-center space-y-6">
                  <div className="space-y-4">
                    <h1 className="text-3xl font-bold text-foreground">
                      Sign in to continue
                    </h1>
                    <p className="text-muted-foreground text-lg">
                      Please sign in to access your personalized learning
                      experience.
                    </p>
                  </div>

                  <div className="pt-4">
                    <LoginButton />
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </main>
      )
    );
  }

  return <>{children}</>;
}
