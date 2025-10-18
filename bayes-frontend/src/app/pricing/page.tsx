"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { BadgeCheck, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Header } from "@/components/landing/header";
import { SimpleFooterWithFourGrids } from "@/components/footers/simple-footer-with-four-grids";
import { Inter } from "next/font/google";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// API function for creating checkout sessions
async function createCheckoutSession(billingPeriod: string, token: string) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const response = await fetch(`${API_URL}/api/create-checkout-session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ billing_period: billingPeriod }),
  });

  if (!response.ok) {
    const errorData = await response
      .json()
      .catch(() => ({ error: "Unknown error" }));
    throw new Error(errorData.detail || "Failed to create checkout session");
  }

  return response.json();
}

// NumberFlow component implementation with animation
interface NumberFlowProps {
  value: number;
  format?: Intl.NumberFormatOptions;
  className?: string;
}

function NumberFlow({ value, format, className }: NumberFlowProps) {
  const [displayValue, setDisplayValue] = React.useState(value);
  const [isAnimating, setIsAnimating] = React.useState(false);
  const prevValueRef = React.useRef(value);

  React.useEffect(() => {
    if (prevValueRef.current !== value) {
      setIsAnimating(true);
      const startValue = prevValueRef.current;
      const endValue = value;
      const duration = 600; // Animation duration in milliseconds
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out animation
        const easeOutProgress = 1 - Math.pow(1 - progress, 3);

        const currentValue =
          startValue + (endValue - startValue) * easeOutProgress;
        setDisplayValue(Math.round(currentValue));

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
          prevValueRef.current = value;
        }
      };

      requestAnimationFrame(animate);
    }
  }, [value]);

  const formattedValue = React.useMemo(() => {
    if (format) {
      return new Intl.NumberFormat("en-US", format).format(displayValue);
    }
    return Math.round(displayValue).toString();
  }, [displayValue, format]);

  return (
    <span
      className={cn(className, isAnimating && "transition-all duration-300")}
    >
      {formattedValue}
    </span>
  );
}

// Pricing tier interface
export interface PricingTier {
  name: string;
  price: Record<string, number | string>;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  stripeLink?: string | Record<string, string>;
}

// Tab component for frequency toggle
interface TabProps {
  text: string;
  selected: boolean;
  setSelected: (text: string) => void;
  discount?: boolean;
}

function Tab({ text, selected, setSelected, discount = false }: TabProps) {
  return (
    <button
      onClick={() => setSelected(text)}
      className={cn(
        "relative w-fit px-4 py-2 text-sm font-bold capitalize",
        "text-foreground transition-colors",
        discount && "flex items-center justify-center gap-2.5",
        inter.className,
      )}
    >
      <span className="relative z-10">{text}</span>
      {selected && (
        <motion.span
          layoutId="tab"
          transition={{ type: "spring", duration: 0.4 }}
          className="absolute inset-0 z-0 rounded-full bg-background shadow-sm"
        />
      )}
      {discount && (
        <Badge
          variant="secondary"
          className={cn(
            "relative z-10 whitespace-nowrap shadow-none font-bold",
            selected && "bg-muted",
          )}
        >
          Save 20%
        </Badge>
      )}
    </button>
  );
}

// Pricing card component
interface PricingCardProps {
  tier: PricingTier;
  paymentFrequency: string;
  currentPlan?: string;
}

function PricingCard({
  tier,
  paymentFrequency,
  currentPlan,
}: PricingCardProps) {
  const price = tier.price[paymentFrequency];
  const isHighlighted = tier.highlighted;
  const { user, session } = useAuth();
  const { toast } = useToast();

  // Check if this is the current plan
  const isCurrentPlan =
    currentPlan &&
    ((tier.name === "Starter" && currentPlan === "free") ||
      (tier.name === "Pro" && currentPlan === "pro") ||
      (tier.name === "Enterprise" && currentPlan === "enterprise"));

  const handleGetStarted = async () => {
    // If this is the current plan, redirect to learn page
    if (isCurrentPlan) {
      window.location.href = "/learn";
      return;
    }

    if (tier.name === "Starter") {
      // For free tier, just redirect to sign up or learn page
      if (user) {
        window.location.href = "/learn";
      } else {
        toast({
          title: "Sign up required",
          description: "Please sign up to get started with the free plan",
          variant: "default",
        });
      }
      return;
    }

    if (tier.name === "Enterprise") {
      // For enterprise, show contact information
      toast({
        title: "Contact Sales",
        description: "Please contact our sales team for Enterprise pricing",
        variant: "default",
      });
      return;
    }

    if (tier.name === "Pro") {
      try {
        // First check if user is authenticated
        if (!user || !session) {
          toast({
            title: "Authentication required",
            description: "Please sign in to subscribe to the Pro plan",
            variant: "destructive",
          });
          return;
        }

        // Show loading state
        toast({
          title: "Processing...",
          description: "Creating checkout session...",
          variant: "default",
        });

        // Create checkout session and redirect to Stripe
        const checkoutData = await createCheckoutSession(
          paymentFrequency,
          session.access_token,
        );

        // Redirect to Stripe checkout
        window.location.href = checkoutData.checkout_url;
      } catch (error) {
        console.error("Error creating checkout session:", error);
        toast({
          title: "Error",
          description: "Failed to create checkout session. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Card
      className={cn(
        "relative flex flex-col gap-8 overflow-hidden p-6 rounded-xl",
        isHighlighted
          ? "bg-foreground text-background"
          : "bg-background text-foreground",
        isCurrentPlan &&
          "ring-2 ring-primary ring-offset-2 ring-offset-background",
        inter.className,
      )}
    >
      {isHighlighted && <HighlightedBackground />}

      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-3 text-xl font-bold capitalize">
          {tier.name}
        </h2>
        {isCurrentPlan && (
          <Badge
            variant="secondary"
            className="bg-primary text-primary-foreground font-bold border-2 border-primary-foreground/20"
          >
            Current Plan
          </Badge>
        )}
      </div>

      <div className="relative h-16">
        {typeof price === "number" ? (
          <>
            <NumberFlow
              format={{
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 0,
              }}
              value={price}
              className="text-4xl font-bold"
            />
            <p className="mt-2 text-xs text-muted-foreground font-semibold">
              Per month
            </p>
          </>
        ) : (
          <h1 className="text-4xl font-bold">{price}</h1>
        )}
      </div>

      <div className="flex-1 space-y-2">
        <h3 className="text-sm font-bold">{tier.description}</h3>
        <ul className="space-y-2">
          {tier.features.map((feature, index) => (
            <li
              key={index}
              className={cn(
                "flex items-center gap-2 text-sm font-semibold",
                isHighlighted ? "text-background" : "text-muted-foreground",
              )}
            >
              <BadgeCheck className="h-4 w-4" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <Button
        variant={isHighlighted ? "secondary" : "default"}
        className="w-full group relative overflow-hidden font-bold"
        onClick={handleGetStarted}
      >
        <span className="mr-8 transition-opacity duration-500 group-hover:opacity-0 font-bold">
          {isCurrentPlan ? "Go to Dashboard" : tier.cta}
        </span>
        <i className="absolute right-1 top-1 bottom-1 rounded-sm z-10 grid w-1/4 place-items-center transition-all duration-500 bg-primary-foreground/15 group-hover:w-[calc(100%-0.5rem)] group-active:scale-95">
          <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
        </i>
      </Button>
    </Card>
  );
}

const HighlightedBackground = () => (
  <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:45px_45px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
);

// Main pricing section component
interface PricingSectionProps {
  title: string;
  subtitle: string;
  tiers: PricingTier[];
  frequencies: string[];
}

function PricingSection({
  title,
  subtitle,
  tiers,
  frequencies,
}: PricingSectionProps) {
  const [selectedFrequency, setSelectedFrequency] = React.useState(
    frequencies[0],
  );
  const { subscriptionPlan } = useAuth();

  return (
    <section
      className={cn(
        "flex flex-col items-center gap-10 py-10 min-h-screen bg-background",
        inter.className,
      )}
    >
      <div className="space-y-7 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold md:text-5xl text-foreground">
            {title}
          </h1>
          <p className="text-muted-foreground font-medium">{subtitle}</p>
        </div>
        <div className="mx-auto flex w-fit rounded-full bg-muted p-1">
          {frequencies.map((freq) => (
            <Tab
              key={freq}
              text={freq}
              selected={selectedFrequency === freq}
              setSelected={setSelectedFrequency}
              discount={freq === "yearly"}
            />
          ))}
        </div>
      </div>

      <div className="grid w-full max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {tiers.map((tier) => (
          <PricingCard
            key={tier.name}
            tier={tier}
            paymentFrequency={selectedFrequency}
            currentPlan={subscriptionPlan || undefined}
          />
        ))}
      </div>

      <div className="absolute inset-0 -z-10">
        <div className="h-full w-full bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:35px_35px] opacity-30 [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      </div>
    </section>
  );
}

// Demo data and component
const PAYMENT_FREQUENCIES = ["monthly", "yearly"];

const TIERS: PricingTier[] = [
  {
    name: "Starter",
    price: {
      monthly: "Free",
      yearly: "Free",
    },
    description: "Perfect for getting started with math tutoring",
    features: [
      "10 prompts per week",
      "Basic calculus topics",
      "Community support",
      "Problem-solving guidance",
      "Basic progress tracking",
    ],
    cta: "Get Started",
  },
  {
    name: "Pro",
    price: {
      monthly: 20,
      yearly: 16,
    },
    description: "Great for serious math students",
    features: [
      "100 prompts per week",
      "All math topics (K-12 to Calculus)",
      "Priority support",
      "Advanced problem solving",
      "Detailed progress analytics",
      "Custom study plans",
    ],
    cta: "Start Free Trial",
    stripeLink: {
      monthly: "https://buy.stripe.com/test_bJe5kEb5A8S6e1s5uofUQ08",
      yearly: "https://buy.stripe.com/test_7sY28s8Xsecq4qS3mgfUQ09",
    },
  },
  {
    name: "Enterprise",
    price: {
      monthly: "Custom",
      yearly: "Custom",
    },
    description: "For large educational organizations",
    features: [
      "Unlimited prompts",
      "All Pro features",
      "Multiple student accounts",
      "Custom integrations",
      "SLA guarantee",
      "On-premise deployment",
      "24/7 phone support",
    ],
    cta: "Contact Us",
    highlighted: true,
  },
];

function ModernPricingPage() {
  return (
    <div className="relative flex justify-center items-center w-full">
      <PricingSection
        title="Choose Your Math Tutoring Plan"
        subtitle="Start free and upgrade as you progress. All plans include AI-powered tutoring and progress tracking."
        frequencies={PAYMENT_FREQUENCIES}
        tiers={TIERS}
      />
    </div>
  );
}

export default function PricingPage() {
  return (
    <main className={cn("min-h-screen bg-background", inter.className)}>
      <Header />
      <ModernPricingPage />
      <SimpleFooterWithFourGrids />
      <Toaster />
    </main>
  );
}
