"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { sendWelcomeEmail, getSavedTopics } from "@/lib/api";

export default function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Auth callback error:", error);
          setStatus("error");
          return;
        }

        if (data.session) {
          // Check if this is a new user and send welcome email
          await handleNewUserWelcome(data.session.user);

          setStatus("success");

          // Check if there's a redirect parameter
          const redirectPath = searchParams.get("redirect");
          if (redirectPath) {
            router.push(redirectPath);
          } else {
            // Default redirect to topic prompt page
            router.push("/learn");
          }
        } else {
          setStatus("error");
        }
      } catch (error) {
        console.error("Auth callback error:", error);
        setStatus("error");
      }
    };

    const handleNewUserWelcome = async (user: any) => {
      try {
        // Check if user is new by looking at their creation time
        const userCreatedAt = new Date(user.created_at);
        const now = new Date();
        const timeDiffMinutes =
          (now.getTime() - userCreatedAt.getTime()) / (1000 * 60);

        // If user was created in the last 5 minutes, consider them new
        const isLikelyNewUser = timeDiffMinutes < 5;

        if (isLikelyNewUser) {
          console.log("New user detected, checking for existing activity...");

          // Double-check by seeing if they have any saved topics
          try {
            const savedTopics = await getSavedTopics();
            const hasExistingActivity = savedTopics.total > 0;

            if (!hasExistingActivity) {
              console.log("Sending welcome email to new user:", user.email);

              // Send welcome email (don't block the user flow if it fails)
              sendWelcomeEmail(
                user.email,
                user.user_metadata?.full_name || user.user_metadata?.name,
              )
                .then((result) => {
                  if (result.success) {
                    console.log("Welcome email sent successfully!");
                  } else {
                    console.log("Welcome email failed:", result.error);
                  }
                })
                .catch((error) => {
                  console.log("Welcome email error:", error);
                });
            } else {
              console.log("User has existing activity, skipping welcome email");
            }
          } catch (error) {
            // If we can't check saved topics, still try to send welcome email for very new users
            if (timeDiffMinutes < 2) {
              console.log(
                "Could not check saved topics, sending welcome email anyway for very new user",
              );
              sendWelcomeEmail(
                user.email,
                user.user_metadata?.full_name || user.user_metadata?.name,
              ).catch(() => {
                // Silently handle email errors
              });
            }
          }
        }
      } catch (error) {
        // Don't block user flow if welcome email logic fails
        console.log("Welcome email logic error:", error);
      }
    };

    handleAuthCallback();
  }, [router, searchParams]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Completing sign in...</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">
            Authentication Error
          </h1>
          <p className="text-gray-600 mb-4">
            There was an error signing you in.
          </p>
          <button
            onClick={() => router.push("/")}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-green-600 mb-4">Success!</h1>
        <p className="text-gray-600">Redirecting you to the app...</p>
      </div>
    </div>
  );
}
