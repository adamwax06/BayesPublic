"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ImageUpload } from "@/components/ui/image-upload";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import * as SelectPrimitive from "@radix-ui/react-select";
import {
  Image as ImageIcon,
  BookOpen,
  Trash2,
  ArrowUp,
  Paperclip,
  Camera,
  ChevronUp,
  LogOut,
  LogIn,
} from "lucide-react";
import {
  getSubscriptionStatus,
  SubscriptionStatus,
  getAllTopicProgress,
  deleteTopicProgress,
  TopicProgress,
} from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { UsageIndicator } from "@/components/ui/usage-indicator";
import { UpgradePrompt } from "@/components/ui/upgrade-prompt";
import { cn } from "@/lib/utils";
import { Inter } from "next/font/google";
import Image from "next/image";
import { BugReport } from "@/components/ui/bug-report";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Helper function to extract first name from full name
const getFirstName = (fullName?: string): string => {
  if (!fullName) return "there";
  const parts = fullName.split(" ");
  return parts[0] || "there";
};

export default function LearnHome() {
  const [topic, setTopic] = useState("");
  const [course, setCourse] = useState("");
  const [customCourse, setCustomCourse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [imageData, setImageData] = useState<string | null>(null);
  const [detectedTopic, setDetectedTopic] = useState<string | null>(null);
  const [detectedCourse, setDetectedCourse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [savedTopics, setSavedTopics] = useState<TopicProgress[]>([]);
  const [loadingSavedTopics, setLoadingSavedTopics] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const router = useRouter();
  const { user, signOut } = useAuth();
  const firstName = getFirstName(user?.user_metadata?.full_name);
  const { signInWithGoogle } = useAuth();

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (e) {
      console.error(e);
    }
  };

  const courseOptions = [
    { value: "k-1", label: "Kindergarten - 1st Grade" },
    { value: "2-3", label: "2nd - 3rd Grade" },
    { value: "4-6", label: "4th - 6th Grade" },
    { value: "pre-algebra", label: "Pre-Algebra" },
    { value: "algebra-1", label: "Algebra 1" },
    { value: "geometry", label: "Geometry" },
    { value: "algebra-2", label: "Algebra 2" },
    { value: "trigonometry", label: "Trigonometry" },
    { value: "calc-1", label: "Calculus 1" },
    { value: "calc-2", label: "Calculus 2" },
    { value: "calc-3", label: "Calculus 3" },
    { value: "custom", label: "Custom Course" },
  ];

  const fetchSavedTopics = async () => {
    setLoadingSavedTopics(true);
    try {
      const response = await getAllTopicProgress();
      setSavedTopics(response.topic_progress);
    } catch (error) {
      console.error("Error fetching topic progress:", error);
      // Fallback: show empty state if progress system isn't ready yet
      setSavedTopics([]);
    } finally {
      setLoadingSavedTopics(false);
    }
  };

  const fetchSubscriptionStatus = async () => {
    setLoadingSubscription(true);
    try {
      const status = await getSubscriptionStatus();
      setSubscriptionStatus(status);
    } catch (error) {
      console.error("Error fetching subscription status:", error);
    } finally {
      setLoadingSubscription(false);
    }
  };

  React.useEffect(() => {
    if (user) {
      fetchSavedTopics();
      fetchSubscriptionStatus();
    }
  }, [user]);

  // Refresh subscription status when user comes back to the page
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        fetchSubscriptionStatus();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user]);

  // Handle pending prompt after login
  React.useEffect(() => {
    if (user) {
      // Check for pending prompt in sessionStorage
      const pendingData = sessionStorage.getItem("pendingLearnPrompt");
      if (pendingData) {
        try {
          const pending = JSON.parse(pendingData);
          const selectedCourse =
            pending.course === "custom" ? pending.customCourse : pending.course;
          const params = new URLSearchParams({
            course: selectedCourse || pending.course,
          });

          // Clear the pending prompt
          sessionStorage.removeItem("pendingLearnPrompt");

          // Navigate to the topic
          router.push(
            `/learn/${encodeURIComponent(pending.topic)}?${params.toString()}`,
          );
        } catch (error) {
          console.error("Error parsing pending prompt:", error);
          sessionStorage.removeItem("pendingLearnPrompt");
        }
      }
    }
  }, [user, router]);

  const handleUpgrade = () => {
    // Navigate to pricing page
    router.push("/pricing");
    setShowUpgradePrompt(false);
  };

  const handleCloseUpgradePrompt = () => {
    setShowUpgradePrompt(false);
  };

    // Check if user has reached their limit
  const hasReachedLimit = subscriptionStatus && 
    subscriptionStatus.prompts_used_this_week >= subscriptionStatus.max_prompts_per_week;

  const handleDeleteTopic = async (progress: TopicProgress) => {
    try {
      await deleteTopicProgress(progress.topic_name, progress.course);
      setSavedTopics(savedTopics.filter((topic) => topic.id !== progress.id));
    } catch (error) {
      console.error("Error deleting topic progress:", error);
    }
  };

  const handleSavedTopicClick = (progress: TopicProgress) => {
    const params = new URLSearchParams({
      course: progress.course,
    });
    
    // Navigate to topic - progress will be loaded automatically
    router.push(
      `/learn/${encodeURIComponent(progress.topic_name)}?${params.toString()}`,
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!topic.trim()) {
      setValidationError("Please enter a topic");
      return;
    }

    if (!course) {
      setValidationError("Please select your course");
      return;
    }

    // Check if user has reached their usage limit
    if (hasReachedLimit) {
      setShowUpgradePrompt(true);
      return;
    }

    // Check if user is authenticated
    if (!user) {
      // Store the pending prompt in sessionStorage
      const pendingData = {
        topic: topic.trim(),
        course: course,
        customCourse: customCourse,
      };
      sessionStorage.setItem("pendingLearnPrompt", JSON.stringify(pendingData));

      // Redirect to login page
      router.push("/login?redirect=/learn");
      return;
    }

    setIsLoading(true);
    const selectedCourse = course === "custom" ? customCourse : course;
    const params = new URLSearchParams({
      course: selectedCourse,
    });
    router.push(
      `/learn/${encodeURIComponent(topic.trim())}?${params.toString()}`,
    );
  };

  const handleImageUploaded = (base64Image: string) => {
    setImageData(base64Image);
    setDetectedTopic(null);
    setDetectedCourse(null);
  };

  const handleImageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageData) return;

    // Check if user has reached their usage limit
    if (hasReachedLimit) {
      setShowUpgradePrompt(true);
      return;
    }

    // Check if user is authenticated
    if (!user) {
      // For image uploads, we'll detect the topic first, then ask for login
      setIsLoading(true);
      setError(null);

      try {
        const apiUrl =
          process.env.NEXT_PUBLIC_DEVELOPMENT_MODE === "true"
            ? "http://localhost:8000"
            : "https://bayes-backend.onrender.com";

        const detectResponse = await fetch(`${apiUrl}/api/detect-topic`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ image_data: imageData }),
        });

        if (!detectResponse.ok) {
          throw new Error("Failed to detect topic from image");
        }

        const detectResult = await detectResponse.json();

        if (
          detectResult.error_message ||
          detectResult.topic === "Error detecting topic"
        ) {
          setError("Topic detection failed");
          setIsLoading(false);
          return;
        }

        const detectedTopic = detectResult.topic;
        const detectedCourse = detectResult.course;

        setDetectedTopic(detectedTopic);
        setDetectedCourse(detectedCourse);

        // Store the pending prompt in sessionStorage
        const pendingData = {
          topic: detectedTopic,
          course: detectedCourse,
        };
        sessionStorage.setItem(
          "pendingLearnPrompt",
          JSON.stringify(pendingData),
        );

        setIsLoading(false);
        setShowImageUpload(false);

        // Redirect to login page
        router.push("/login?redirect=/learn");
      } catch (error) {
        console.error("Error processing image:", error);
        setError("Topic detection failed");
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_DEVELOPMENT_MODE === "true"
          ? "http://localhost:8000"
          : "https://bayes-backend.onrender.com";

      const detectResponse = await fetch(`${apiUrl}/api/detect-topic`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image_data: imageData }),
      });

      if (!detectResponse.ok) {
        throw new Error("Failed to detect topic from image");
      }

      const detectResult = await detectResponse.json();

      if (
        detectResult.error_message ||
        detectResult.topic === "Error detecting topic"
      ) {
        setError("Topic detection failed");
        setIsLoading(false);
        return;
      }

      const detectedTopic = detectResult.topic;
      const detectedCourse = detectResult.course;

      setDetectedTopic(detectedTopic);
      setDetectedCourse(detectedCourse);

      const params = new URLSearchParams({
        course: detectedCourse,
      });
      router.push(
        `/learn/${encodeURIComponent(detectedTopic)}?${params.toString()}`,
      );
    } catch (error) {
      console.error("Error processing image:", error);
      setError("Topic detection failed");
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setImageData(null);
    setDetectedTopic(null);
    setDetectedCourse(null);
    setError(null);
    setShowImageUpload(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  /* --------------------------------------------------
     Drag-and-drop image/PDF support on the topic bar  
  -------------------------------------------------- */
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    // Allow drop and show copy cursor
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    // We only need the first file
    const file = files[0];

    // Limit size to ~10 MB to avoid huge payloads (adjust as needed)
    const maxSizeBytes = 10 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setError("File too large (max 10 MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (!result) return;

              // Immediately process the dropped file (reuse logic from handleImageSubmit)
        const runPipeline = async (base64Img: string) => {
          handleImageUploaded(base64Img); // store for consistency

          // Check if user has reached their usage limit
          if (hasReachedLimit) {
            setShowUpgradePrompt(true);
            return;
          }

          // Check if user is authenticated
          if (!user) {
          setIsLoading(true);
          setError(null);

          try {
            const apiUrl =
              process.env.NEXT_PUBLIC_DEVELOPMENT_MODE === "true"
                ? "http://localhost:8000"
                : "https://bayes-backend.onrender.com";

            const detectResponse = await fetch(`${apiUrl}/api/detect-topic`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ image_data: base64Img }),
            });

            if (!detectResponse.ok) throw new Error("Failed to detect topic");

            const detectResult = await detectResponse.json();

            if (
              detectResult.error_message ||
              detectResult.topic === "Error detecting topic"
            ) {
              setError("Topic detection failed");
              setIsLoading(false);
              return;
            }

            const detectedTopic = detectResult.topic;
            const detectedCourse = detectResult.course;

            setDetectedTopic(detectedTopic);
            setDetectedCourse(detectedCourse);

            // Store the pending prompt in sessionStorage
            const pendingData = {
              topic: detectedTopic,
              course: detectedCourse,
            };
            sessionStorage.setItem(
              "pendingLearnPrompt",
              JSON.stringify(pendingData),
            );

            setIsLoading(false);

            // Redirect to login page
            router.push("/login?redirect=/learn");
          } catch (err) {
            console.error("Auto-processing error:", err);
            setError("Topic detection failed");
            setIsLoading(false);
          }
          return;
        }

        setIsLoading(true);
        setError(null);

        // Check if user has reached their usage limit
        if (hasReachedLimit) {
          setShowUpgradePrompt(true);
          setIsLoading(false);
          return;
        }

        try {
          const apiUrl =
            process.env.NEXT_PUBLIC_DEVELOPMENT_MODE === "true"
              ? "http://localhost:8000"
              : "https://bayes-backend.onrender.com";

          const detectResponse = await fetch(`${apiUrl}/api/detect-topic`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image_data: base64Img }),
          });

          if (!detectResponse.ok) throw new Error("Failed to detect topic");

          const detectResult = await detectResponse.json();

          if (
            detectResult.error_message ||
            detectResult.topic === "Error detecting topic"
          ) {
            setError("Topic detection failed");
            setIsLoading(false);
            return;
          }

          const detectedTopic = detectResult.topic;
          const detectedCourse = detectResult.course;

          const params = new URLSearchParams({ course: detectedCourse });
          router.push(
            `/learn/${encodeURIComponent(detectedTopic)}?${params.toString()}`,
          );
        } catch (err) {
          console.error("Auto-processing error:", err);
          setError("Topic detection failed");
          setIsLoading(false);
        }
      };

      runPipeline(result);
    };
    //deploy
    // Read as data URL so backend receives data:...;base64, (base64 encoding)
    reader.readAsDataURL(file);
  };

  // (mapping removed – backend now returns canonical course codes directly)

  return (
    <div className={cn("flex h-screen bg-background", inter.className)}>
      {/* Sidebar - Very light gray with dark text */}
      <div className="w-64 bg-[#000000] text-white border-r border-gray-500 flex flex-col">
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-500">
          <h3 className="text-sm font-medium text-white">Previous Topics</h3>
        </div>

        {/* Saved Topics List */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="space-y-1">
            {loadingSavedTopics ? (
              <div className="text-sm text-gray-200 p-3">Loading...</div>
            ) : savedTopics.length > 0 ? (
              savedTopics.map((progress) => (
                <div
                  key={progress.id}
                  className="group relative flex items-center gap-2 p-2 text-sm rounded-md hover:bg-gray-600 cursor-pointer text-white"
                  onClick={() => handleSavedTopicClick(progress)}
                >
                  <BookOpen className="w-4 h-4 text-gray-200 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-white">
                      {progress.topic_name}
                    </div>
                    <div className="text-xs text-gray-200 truncate">
                      {progress.course} • {progress.current_step === 'article' ? 'Reading' : 'Problems'}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-white hover:bg-gray-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTopic(progress);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))
            ) : user ? (
              <div className="text-sm text-gray-200 p-3">
                No topics in progress yet
              </div>
            ) : (
              <div className="text-sm text-gray-200 p-3">
                Sign in to track progress
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Footer - Aligned with bottom input area */}
        <div className="mt-auto">
          <div className="p-4 border-t border-gray-500">
            <div className="space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-white hover:bg-gray-600"
                onClick={() => router.push("/progress")}
              >
                <BookOpen className="w-4 h-4" />
                My Progress
              </Button>
              {user ? (
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-white hover:bg-gray-600"
                  onClick={handleSignOut}
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-white hover:bg-gray-600"
                  onClick={handleSignIn}
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - ChatGPT style */}
      <div className="flex-1 flex flex-col">
        {/* Usage Indicator - Top Right */}
        {user && subscriptionStatus && !loadingSubscription && (
          <div className="absolute top-4 right-4 z-10">
            <UsageIndicator
              used={subscriptionStatus.prompts_used_this_week}
              total={subscriptionStatus.max_prompts_per_week}
              plan={subscriptionStatus.plan}
            />
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Content Container */}
          <div className="flex-1 flex items-center justify-center p-8 pb-4 pt-20">
            <div className="w-full max-w-2xl mx-auto">
              {/* Bayes Logo */}
              <div className="flex justify-center mb-8">
                <Image
                  src="/icons/favicon-512.png"
                  alt="Bayes Logo"
                  width={120}
                  height={120}
                  className="border-0 outline-none"
                />
              </div>

              {/* Welcome Message */}
              <div className="text-center mb-16">
                <h1 className="text-4xl font-bold text-foreground mb-6">
                  Hey, {firstName}!
                </h1>
                <h2 className="text-2xl font-semibold text-foreground/80 mb-6">
                  What would you like to learn today?
                </h2>
                <p className="text-muted-foreground text-lg">
                  Choose a topic to get started or upload your homework
                </p>
              </div>

              {/* Custom Course Input */}
              {course === "custom" && (
                <div className="mb-8 max-w-sm mx-auto">
                  <label className="text-sm font-medium text-foreground mb-3 block text-center">
                    Custom Course Name
                  </label>
                  <input
                    type="text"
                    placeholder="Enter your course name"
                    value={customCourse}
                    onChange={(e) => setCustomCourse(e.target.value)}
                    disabled={isLoading}
                    className="w-full px-4 py-3 text-sm border border-input rounded-full bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed text-center"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Input Area - ChatGPT style with aligned height */}
        <div className="border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 mt-auto">
          <div className="max-w-4xl mx-auto px-8 pt-8 pb-7">
            {/* Main Input Bar */}
            <form onSubmit={handleSubmit}>
              <div className="relative max-w-2xl mx-auto">
                <div
                  className="relative border-2 border-gray-300 rounded-full bg-white shadow-lg focus-within:ring-2 focus-within:ring-blue-500"
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <div className="flex items-center">
                    {/* Camera button on the left inside container */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setShowImageUpload(true)}
                      disabled={isLoading}
                      className="h-12 w-12 p-0 rounded-full hover:bg-gray-200 flex-shrink-0 ml-1"
                    >
                      <Camera className="w-6 h-6 text-gray-600" />
                    </Button>

                    {/* Text input area */}
                    <div className="flex-1 relative flex items-center">
                      <textarea
                        placeholder="Enter a math topic..."
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        disabled={isLoading}
                        className="w-full pl-1 pr-4 py-3 text-md bg-transparent border-0 outline-none resize-none leading-tight"
                        rows={1}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSubmit(e as any);
                          }
                        }}
                      />
                    </div>

                    {/* Course selection and Submit button on the right */}
                    <div className="flex items-center gap-2 mr-1">
                      <Select
                        value={course}
                        onValueChange={setCourse}
                        disabled={isLoading}
                      >
                        <SelectPrimitive.Trigger className="bg-transparent border-0 text-gray-500 focus:ring-0 shadow-none px-2 py-1 font-semibold text-sm flex items-center gap-2">
                          <SelectValue placeholder="Select your course" />
                          <SelectPrimitive.Icon asChild>
                            <ChevronUp className="h-4 w-4 opacity-50" />
                          </SelectPrimitive.Icon>
                        </SelectPrimitive.Trigger>
                        <SelectContent>
                          {courseOptions.map((option) => (
                            <SelectItem
                              key={option.value}
                              value={option.value}
                              className="text-sm"
                            >
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button
                        type="submit"
                        disabled={
                          isLoading ||
                          !topic.trim() ||
                          !course ||
                          (course === "custom" && !customCourse.trim())
                        }
                        size="icon"
                        className="h-10 w-10 p-0 rounded-full bg-black hover:bg-gray-800 shadow-lg"
                      >
                        {isLoading ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <ArrowUp className="w-5 h-5 text-white" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </form>

            {/* Validation Error */}
            {validationError && (
              <div className="max-w-2xl mx-auto mt-2">
                <p className="text-destructive text-sm text-center">
                  {validationError}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Image Upload Modal */}
        <Dialog open={showImageUpload} onOpenChange={setShowImageUpload}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Upload Homework Image</DialogTitle>
              <DialogDescription>
                Upload an image of your homework to automatically detect the
                topic and get help.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <ImageUpload
                onImageUploaded={handleImageUploaded}
                onReset={handleReset}
                loading={isLoading}
              />

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-center">
                  <p className="text-destructive text-sm">{error}</p>
                </div>
              )}

              {detectedTopic && !error && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                  <p className="text-green-700 text-sm">
                    <strong>Detected:</strong> {detectedTopic} ({detectedCourse}
                    )
                  </p>
                </div>
              )}

              {imageData && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleImageSubmit}
                    disabled={isLoading || !imageData}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <ImageIcon className="w-4 h-4 mr-2" />
                        Process Image
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    disabled={isLoading}
                  >
                    Reset
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {/* Floating bug-report button */}
      <BugReport className="left-auto right-4" />

      {/* Upgrade Prompt */}
      <UpgradePrompt
        isOpen={showUpgradePrompt}
        onClose={handleCloseUpgradePrompt}
        onUpgrade={handleUpgrade}
        currentUsage={subscriptionStatus?.prompts_used_this_week || 0}
        maxUsage={subscriptionStatus?.max_prompts_per_week || 10}
      />
    </div>
  );
}
