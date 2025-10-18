"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle,
  ArrowRight,
  Home,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/landing/header";
import { SimpleFooterWithFourGrids } from "@/components/footers/simple-footer-with-four-grids";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

interface SubscriptionStatus {
  payment_status: string;
  subscription_status: string;
  plan: string;
  max_prompts_per_week?: number;
  prompts_used_this_week?: number;
  current_period_end?: string;
  session_id: string;
  note?: string;
}

function SuccessPageContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { session, loading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionData, setSubscriptionData] =
    useState<SubscriptionStatus | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setError("No session ID provided");
        setIsLoading(false);
        return;
      }

      // Wait for auth to finish loading before checking session
      if (authLoading) {
        return;
      }

      if (!session) {
        setError("Please sign in to verify your payment");
        setIsLoading(false);
        return;
      }

      try {
        const API_URL =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const response = await fetch(
          `${API_URL}/api/verify-checkout-session/${sessionId}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
          },
        );

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ detail: "Verification failed" }));
          throw new Error(errorData.detail || "Failed to verify payment");
        }

        const data = await response.json();
        setSubscriptionData(data);
      } catch (error) {
        console.error("Error verifying payment:", error);
        setError(
          error instanceof Error ? error.message : "Failed to verify payment",
        );
      } finally {
        setIsLoading(false);
      }
    };

    verifyPayment();
  }, [sessionId, session, authLoading]);

  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">
            {authLoading ? "Loading..." : "Verifying your payment..."}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 text-center space-y-6">
            <div className="space-y-4">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
              <h1 className="text-3xl font-bold text-foreground">
                Payment Verification Failed
              </h1>
              <p className="text-muted-foreground text-lg">{error}</p>

              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">
                  What can you do?
                </h3>
                <ul className="text-muted-foreground space-y-1">
                  <li>• Check your email for payment confirmation</li>
                  <li>• Try refreshing this page</li>
                  <li>• Contact support if the issue persists</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2"
              >
                Try Again
                <ArrowRight className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                onClick={() => (window.location.href = "/pricing")}
                className="flex items-center gap-2"
              >
                Back to Pricing
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!subscriptionData) {
    return (
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 text-center space-y-6">
            <div className="space-y-4">
              <AlertCircle className="h-12 w-12 text-orange-500 mx-auto" />
              <h1 className="text-3xl font-bold text-foreground">
                No Payment Data Found
              </h1>
              <p className="text-muted-foreground text-lg">
                We could not find any payment information for this session.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => (window.location.href = "/pricing")}
                className="flex items-center gap-2"
              >
                Back to Pricing
                <ArrowRight className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                onClick={() => (window.location.href = "/")}
                className="flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                Go Home
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const isPaymentSuccessful = subscriptionData.payment_status === "paid";
  const isSubscriptionActive =
    subscriptionData.subscription_status === "active";
  const isSubscriptionPending =
    subscriptionData.subscription_status === "pending";

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <Card className="p-8 text-center space-y-6">
          <div className="space-y-4">
            {isPaymentSuccessful ? (
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
            ) : (
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            )}

            <h1 className="text-3xl font-bold text-foreground">
              {isPaymentSuccessful ? "Payment Successful!" : "Payment Issues"}
            </h1>

            <p className="text-muted-foreground text-lg">
              {isPaymentSuccessful
                ? isSubscriptionActive
                  ? `Thank you for subscribing to Bayes ${subscriptionData.plan.charAt(0).toUpperCase() + subscriptionData.plan.slice(1)}! Your subscription is now active.`
                  : isSubscriptionPending
                    ? `Your payment was successful and your subscription is being processed. It should be active shortly.`
                    : `Your payment was successful, but there was an issue activating your subscription. Please contact support.`
                : `There was an issue with your payment. Status: ${subscriptionData.payment_status}`}
            </p>

            {isSubscriptionPending && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <p className="text-blue-800 text-sm">
                  {subscriptionData.note ||
                    "Your subscription is being processed and will be active shortly."}
                </p>
              </div>
            )}

            {sessionId && (
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Session ID:</strong> {sessionId}
                </p>
              </div>
            )}

            {isPaymentSuccessful && (
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">
                  {isSubscriptionActive
                    ? "What's Next?"
                    : "Subscription Details"}
                </h3>
                <ul className="text-muted-foreground space-y-1">
                  <li>
                    • Plan:{" "}
                    {subscriptionData.plan.charAt(0).toUpperCase() +
                      subscriptionData.plan.slice(1)}
                  </li>
                  {subscriptionData.max_prompts_per_week && (
                    <li>
                      • Weekly prompt limit:{" "}
                      {subscriptionData.max_prompts_per_week} prompts
                    </li>
                  )}
                  {subscriptionData.prompts_used_this_week !== undefined && (
                    <li>
                      • Prompts used this week:{" "}
                      {subscriptionData.prompts_used_this_week}
                    </li>
                  )}
                  <li>• Check your email for the receipt</li>
                  {isSubscriptionActive && (
                    <li>• Start learning with your new subscription!</li>
                  )}
                </ul>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isPaymentSuccessful && isSubscriptionActive ? (
              <Button
                onClick={() => (window.location.href = "/learn")}
                className="flex items-center gap-2"
              >
                Start Learning
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={() => (window.location.href = "/pricing")}
                className="flex items-center gap-2"
              >
                Back to Pricing
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => (window.location.href = "/")}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Go Home
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <main className={cn("min-h-screen bg-background", inter.className)}>
      <Header />
      <Suspense fallback={<LoadingFallback />}>
        <SuccessPageContent />
      </Suspense>
      <SimpleFooterWithFourGrids />
    </main>
  );
}
