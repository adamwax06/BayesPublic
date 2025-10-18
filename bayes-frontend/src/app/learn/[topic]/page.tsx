"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { MathContent } from "@/components/ui/math-content";
import { MathInput } from "@/components/ui/math-input";
import { MultipleChoice } from "@/components/ui/multiple-choice";
import { Whiteboard } from "@/components/ui/whiteboard";
import { Button } from "@/components/ui/button";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Head from "next/head";
import { checkWorkWithFeedback, cn } from "@/lib/utils";
import { getTopicProgress, saveTopicProgress, SaveProgressRequest, TopicProgress } from "@/lib/api";
import dynamic from "next/dynamic";
import { ContentLoadingScreen } from "@/components/ui/content-loading-screen";
import { TommyAssistant } from "@/components/ui/tommy-assistant";
import { BugReport } from "@/components/ui/bug-report";

// Dynamically import Confetti with no SSR
const ReactConfetti = dynamic(() => import("react-confetti"), { ssr: false });

// Patch mathjs dynamic import
let mathjs: typeof import("mathjs") | null = null;
const loadMathjs = async () => {
  if (typeof window !== "undefined" && !mathjs) {
    try {
      mathjs = await import("mathjs");
    } catch (error) {
      console.error("Failed to load mathjs:", error);
    }
  }
};
// Load mathjs on component mount
if (typeof window !== "undefined") {
  loadMathjs();
}

// Enums
type ProblemType = "short_answer" | "multiple_choice";

interface Problem {
  question: string;
  answer: string;
  type: ProblemType;
  options?: string[]; // For multiple choice questions
  correct_option?: number; // Index of correct option (0-based)
  explanation?: string; // Optional explanation for the answer
  hints?: string[]; // Array of 2 progressive hint
}

interface Subtopic {
  title: string;
  article: string;
  problems: Problem[];
}

interface TopicData {
  topic: string;
  subtopics: Subtopic[];
}

type LearningStep = "article" | "problems" | "completed";

// Helper function to normalize LaTeX for comparison
const normalizeLatex = (latex: string): string => {
  console.log("🔍 [normalizeLatex] Input:", latex);
  let normalized = latex;

  // Remove all whitespace
  normalized = normalized.replace(/\s+/g, "");

  // Remove dollar signs from LaTeX expressions
  normalized = normalized.replace(/^\$|\$$/g, "");

  console.log("🔍 [normalizeLatex] Output:", normalized);
  return normalized;
};

const tryMathEquivalence = (a: string, b: string): boolean => {
  if (!mathjs) return false;
  try {
    // Type guard for mathjs.evaluate
    if (typeof mathjs.evaluate === "function") {
      const numA = mathjs.evaluate(a);
      const numB = mathjs.evaluate(b);
      if (typeof numA === "number" && typeof numB === "number") {
        return Math.abs(numA - numB) < 1e-9;
      }
    }
  } catch {}
  try {
    // Type guard for mathjs.simplify and mathjs.equal
    if (
      typeof mathjs.simplify === "function" &&
      typeof mathjs.equal === "function"
    ) {
      const exprA = mathjs.simplify(a);
      const exprB = mathjs.simplify(b);
      // mathjs.equal expects string or MathType, so use .toString()
      const result = mathjs.equal(exprA.toString(), exprB.toString());
      if (typeof result === "boolean") return result;
    }
  } catch {}
  return false;
};

export default function LearnPage() {
  const params = useParams();
  const router = useRouter();
  const topic = decodeURIComponent(params.topic as string);

  // Get course and saved status from URL search params
  const [course, setCourse] = useState<string>("calc 1");
  const [courseInitialized, setCourseInitialized] = useState(false);

  // Debug: log initial course state
  console.log("Initial course state:", course);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const courseParam = urlParams.get("course");
      const savedParam = urlParams.get("saved");
      console.log("URL course parameter:", courseParam);
      console.log("URL saved parameter:", savedParam);

      if (courseParam) {
        setCourse(courseParam);
        console.log("Setting course to:", courseParam);
      } else {
        console.log("No course parameter found, using default: calc 1");
      }

      setCourseInitialized(true);
    }
  }, []);

  useEffect(() => {
    const fetchTopicData = async () => {
      if (!courseInitialized) return; // Don't fetch until course is initialized

      try {
        setLoading(true);
        setIsFirstGen(true); // assume generating until proven cached

        // Always generate new content - progress will be loaded separately
        await generateNewContent();
      } catch (error) {
        console.error("Error fetching topic data:", error);
      } finally {
        setLoading(false);
      }
    };

    const generateNewContent = async () => {
      const apiUrl =
        process.env.NEXT_PUBLIC_DEVELOPMENT_MODE === "true"
          ? "http://localhost:8000"
          : "https://bayes-backend.onrender.com";
      console.log(
        "Generating new content with topic:",
        topic,
        "course:",
        course,
      );

      // Get the session for authenticated requests
      const { supabase } = await import("@/lib/supabase");
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch(`${apiUrl}/api/generate-content`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token && {
            Authorization: `Bearer ${session.access_token}`,
          }),
        },
        body: JSON.stringify({ topic, course }),
      });

      if (response.ok) {
        const data = await response.json();
        setTopicData(data);
        setIsFirstGen(false);
      } else {
        console.error("Failed to generate topic data");
      }
    };

    // Only fetch if we have both topic and course, and course has been initialized
    if (topic && courseInitialized) {
      fetchTopicData();
    }
  }, [topic, course, courseInitialized]);

  const [topicData, setTopicData] = useState<TopicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirstGen, setIsFirstGen] = useState(false);
  const [currentSubtopicIndex, setCurrentSubtopicIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState<LearningStep>("article");
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [validationExplanation, setValidationExplanation] = useState("");
  const [isCorrectBackend, setIsCorrectBackend] = useState<boolean | null>(
    null,
  );
  const [hintLevel, setHintLevel] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Enhanced feedback state
  const [feedbackItems, setFeedbackItems] = useState<
    Array<{
      area: string;
      coordinates?: { x: number; y: number };
      issue: string;
      suggestion: string;
      severity: string;
    }>
  >([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCheckingWork, setIsCheckingWork] = useState(false);
  const [extractedWork, setExtractedWork] = useState<string>("");
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [isTommyOpen, setIsTommyOpen] = useState(false);

  const [topicProgress, setTopicProgress] = useState<TopicProgress | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [lastSaveTime, setLastSaveTime] = useState<number>(0);
  const [isSavingOnExit, setIsSavingOnExit] = useState(false);

  // Load progress on component mount
  useEffect(() => {
    if (topic && courseInitialized) {
      loadTopicProgress();
    }
  }, [topic, course, courseInitialized]);

  // Save progress on state changes
  useEffect(() => {
    if (topicData && topicProgress) {
      const now = Date.now();
      // Save immediately on important state changes, or every 30 seconds
      const shouldSave = 
        now - lastSaveTime > 30000 || // 30 seconds
        currentStep !== topicProgress.current_step ||
        currentSubtopicIndex !== topicProgress.current_subtopic_index ||
        currentProblemIndex !== topicProgress.current_problem_index ||
        correctAnswers !== topicProgress.correct_answers;
      
      if (shouldSave) {
        saveProgress();
        setLastSaveTime(now);
      }
    }
  }, [currentSubtopicIndex, currentProblemIndex, currentStep, correctAnswers, topicData, topicProgress]);

  const loadTopicProgress = async () => {
    try {
      const progress = await getTopicProgress(topic, course);
      if (progress) {
        console.log("Loaded existing progress:", progress);
        setTopicProgress(progress);
        setCurrentSubtopicIndex(progress.current_subtopic_index);
        setCurrentProblemIndex(progress.current_problem_index);
        setCurrentStep(progress.current_step as 'article' | 'problems');
        setCorrectAnswers(progress.correct_answers);
        setSessionStartTime(Date.now());
      } else {
        console.log("No existing progress found, will create new record");
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("404")) {
        console.log("No existing progress found - starting fresh (this is normal for new topics)");
      } else {
        console.error("Error loading progress:", error);
      }
      // If progress not found, we'll create a new record when content loads
    }
  };

  const saveProgress = async () => {
    if (!topicData) return;
    
    try {
      const timeSpent = Math.floor((Date.now() - sessionStartTime) / 1000);
      
      // Calculate completed subtopics and problems
      const completedSubtopics: number[] = [];
      const completedProblems: number[] = [];
      
      // Add logic to calculate completed items based on current progress
      // This is a simplified version - you might want to track this more precisely
      
      const progressRequest: SaveProgressRequest = {
        topic_name: topic,
        course,
        current_subtopic_index: currentSubtopicIndex,
        current_problem_index: currentProblemIndex,
        current_step: currentStep === 'completed' ? 'problems' : currentStep,
        correct_answers: correctAnswers,
        total_problems_attempted: correctAnswers + (currentProblemIndex > 0 ? 1 : 0), // Simplified
        completed_subtopics: completedSubtopics,
        completed_problems: completedProblems,
        time_spent: timeSpent,
      };
      
      await saveTopicProgress(progressRequest);
      console.log("Progress saved successfully");
    } catch (error) {
      console.error("Error saving progress:", error);
    }
  };

  useEffect(() => {
    // Check if jQuery and MathQuill are already loaded
    if (
      typeof window !== "undefined" &&
      typeof (window as unknown as { jQuery: unknown }).jQuery !==
        "undefined" &&
      typeof (window as unknown as { MathQuill: unknown }).MathQuill !==
        "undefined"
    ) {
      return;
    }

    // Load jQuery first
    const jQueryScript = document.createElement("script");
    jQueryScript.src =
      "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.4/jquery.min.js";
    jQueryScript.async = false;

    jQueryScript.onload = () => {
      // Now load MathQuill
      const mathQuillScript = document.createElement("script");
      mathQuillScript.src =
        "https://cdnjs.cloudflare.com/ajax/libs/mathquill/0.10.1/mathquill.min.js";
      mathQuillScript.async = false;

      mathQuillScript.onload = () => {
        // setMathResourcesLoaded(true); // This line was removed
      };

      document.body.appendChild(mathQuillScript);
    };

    document.body.appendChild(jQueryScript);

    // Add MathQuill CSS
    if (!document.getElementById("mathquill-css")) {
      const mathQuillCSS = document.createElement("link");
      mathQuillCSS.id = "mathquill-css";
      mathQuillCSS.rel = "stylesheet";
      mathQuillCSS.href =
        "https://cdnjs.cloudflare.com/ajax/libs/mathquill/0.10.1/mathquill.min.css";
      document.head.appendChild(mathQuillCSS);
    }
  }, []);

  const handleNextFromArticle = () => {
    setCurrentStep("problems");
    setCurrentProblemIndex(0);
    setUserAnswer("");
    setSelectedOption(null);
    setShowAnswer(false);
    setCorrectAnswers(0);
    setValidationExplanation("");
    setIsCorrectBackend(null);
    setHintLevel(0);
    setFeedback(null);
  };

  const handleProblemNext = () => {
    if (!topicData) return;

    const currentSubtopic = topicData.subtopics[currentSubtopicIndex];
    const isLastProblem =
      currentProblemIndex === currentSubtopic.problems.length - 1;

    if (isLastProblem) {
      // Check if this is the last subtopic
      if (currentSubtopicIndex === topicData.subtopics.length - 1) {
        setCurrentStep("completed");
      } else {
        // Move to next subtopic
        setCurrentSubtopicIndex(currentSubtopicIndex + 1);
        setCurrentStep("article");
        setCurrentProblemIndex(0);
        setUserAnswer("");
        setSelectedOption(null);
        setShowAnswer(false);
        setCorrectAnswers(0);
        setValidationExplanation("");
        setIsCorrectBackend(null);
        setHintLevel(0);
        setFeedback(null);
      }
    } else {
      // Move to next problem in current subtopic
      setCurrentProblemIndex(currentProblemIndex + 1);
      setUserAnswer("");
      setSelectedOption(null);
      setShowAnswer(false);
      setValidationExplanation("");
      setIsCorrectBackend(null);
      setHintLevel(0);
      setFeedback(null);
    }
  };

  const handleAnswerSubmit = async () => {
    if (!topicData) return;

    const currentProblem =
      topicData.subtopics[currentSubtopicIndex].problems[currentProblemIndex];

    // Validate input based on question type
    if (currentProblem.type === "short_answer") {
      if (!userAnswer.trim()) return;
    } else if (currentProblem.type === "multiple_choice") {
      if (selectedOption === null) return;
    }

    // Create a custom event to close any open math keyboards
    const closeKeyboardEvent = new CustomEvent("closeMathKeyboard");
    window.dispatchEvent(closeKeyboardEvent);

    // Try backend validation first (if available)
    let isCorrect = false;
    let validationExplanation = "";

    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_DEVELOPMENT_MODE === "true"
          ? "http://localhost:8000"
          : "https://bayes-backend.onrender.com";

      const requestBody: Record<string, unknown> = {
        question_type: currentProblem.type,
        problem_type: "general",
      };

      if (currentProblem.type === "short_answer") {
        console.log("🔍 [handleAnswerSubmit] Raw user answer:", userAnswer);
        console.log(
          "🔍 [handleAnswerSubmit] Raw correct answer:",
          currentProblem.answer,
        );

        // Clean up the LaTeX expressions for comparison
        const cleanUserAnswer = normalizeLatex(userAnswer.trim());
        const cleanCorrectAnswer = normalizeLatex(currentProblem.answer.trim());

        console.log(
          "🔍 [handleAnswerSubmit] Clean user answer:",
          cleanUserAnswer,
        );
        console.log(
          "🔍 [handleAnswerSubmit] Clean correct answer:",
          cleanCorrectAnswer,
        );

        requestBody.user_answer = cleanUserAnswer;
        requestBody.correct_answer = cleanCorrectAnswer;
      } else if (currentProblem.type === "multiple_choice") {
        requestBody.selected_option = selectedOption;
        requestBody.correct_answer =
          currentProblem.correct_option?.toString() || "0";
      }

      const response = await fetch(`${apiUrl}/api/check-answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const validationResult = await response.json();
        isCorrect = validationResult.is_correct;
        validationExplanation = validationResult.explanation;
        setIsCorrectBackend(isCorrect);

        // Log backend validation result for debugging
        console.log("Backend validation:", validationResult);
      } else {
        // Backend validation failed, fall back to frontend
        console.warn("Backend validation failed, using frontend fallback");
        throw new Error("Backend validation failed");
      }
    } catch {
      // Fallback to frontend validation
      console.log("Using frontend validation fallback");

      if (currentProblem.type === "short_answer") {
        // Clean up the LaTeX expressions for comparison
        const cleanUserAnswer = normalizeLatex(userAnswer.trim());
        const cleanCorrectAnswer = normalizeLatex(currentProblem.answer.trim());

        // Try mathjs equivalence first
        if (tryMathEquivalence(cleanUserAnswer, cleanCorrectAnswer)) {
          isCorrect = true;
          validationExplanation = "Answer is correct (frontend validation)";
        } else {
          // Fallback to strict LaTeX normalization
          isCorrect = cleanUserAnswer === cleanCorrectAnswer;
          validationExplanation = isCorrect
            ? "Answer is correct (exact LaTeX match)"
            : "Answer is incorrect (exact LaTeX comparison)";
        }
      } else if (currentProblem.type === "multiple_choice") {
        // For multiple choice, check if selected option matches correct option
        isCorrect = selectedOption === currentProblem.correct_option;
        validationExplanation = isCorrect
          ? "Correct answer selected"
          : `Incorrect answer selected. You selected option ${selectedOption! + 1}, but the correct answer was option ${currentProblem.correct_option! + 1}.`;
      }

      setIsCorrectBackend(isCorrect);
    }

    setShowAnswer(true);
    if (isCorrect) {
      setCorrectAnswers((prev) => prev + 1);
    }
  };

  const handleRetry = () => {
    setShowAnswer(false);
    setUserAnswer("");
    setSelectedOption(null);
    setValidationExplanation("");
    setIsCorrectBackend(null);
    setHintLevel(0);
  };

  // Enhanced check work function
  const handleCheckWork = async (imageData: string) => {
    if (!topicData) return;

    const currentProblem =
      topicData.subtopics[currentSubtopicIndex].problems[currentProblemIndex];

    try {
      setIsCheckingWork(true);
      setFeedbackItems([]);
      setShowFeedback(false);
      setExtractedWork(""); // Clear previous work
      setShowConfetti(false);
      setShowSuccessPopup(false);

      const result = await checkWorkWithFeedback(
        imageData,
        currentProblem.question,
        currentProblem.answer,
        "general",
      );

      console.log("Full result from checkWorkWithFeedback:", result);

      if (result.error_message) {
        console.error("Error in work checking:", result.error_message);
        setFeedback(result.error_message);
        return;
      }

      // Debug logging
      console.log("Feedback items received:", result.feedback_items);
      console.log(
        "Feedback items with coordinates:",
        result.feedback_items?.map(
          (item: {
            area: string;
            coordinates?: { x: number; y: number };
            issue: string;
          }) => ({
            area: item.area,
            coordinates: item.coordinates,
            issue: item.issue,
          }),
        ),
      );

      // Set feedback items for visualization
      setFeedbackItems(result.feedback_items || []);
      setShowFeedback(true);
      // No general feedback needed anymore
      setExtractedWork(result.extracted_work || ""); // Store extracted work

      // Check if the answer is correct and show confetti
      if (result.overall_correct === true) {
        // Mark the answer as correct in the UI so the "Submit Answer" button flips to "Continue"
        setIsCorrectBackend(true);
        setShowAnswer(true);
        setShowConfetti(true);
        setShowSuccessPopup(true);

        // Hide confetti and success popup after 4 seconds
        setTimeout(() => {
          setShowConfetti(false);
          setShowSuccessPopup(false);
        }, 4000);
      }

      // Additional debugging for coordinates
      console.log(
        "Setting feedback items with coordinates:",
        result.feedback_items?.map(
          (item: {
            area: string;
            coordinates?: { x: number; y: number };
            issue: string;
          }) => ({
            area: item.area,
            coordinates: item.coordinates,
            hasCoordinates: !!item.coordinates,
          }),
        ),
      );
    } catch (error) {
      console.error("Error checking work:", error);
      setFeedback("Failed to analyze your work. Please try again.");
    } finally {
      setIsCheckingWork(false);
    }
  };

  const resetTopic = () => {
    setCurrentSubtopicIndex(0);
    setCurrentStep("article");
    setCurrentProblemIndex(0);
    setUserAnswer("");
    setSelectedOption(null);
    setShowAnswer(false);
    setCorrectAnswers(0);
    setValidationExplanation("");
    setIsCorrectBackend(null);
    setHintLevel(0);
    setFeedback(null);
  };

  const handleBack = () => {
    if (!topicData) return;

    // If on completion screen -> go to last subtopic last problem
    if (currentStep === "completed") {
      const lastSub = topicData.subtopics.length - 1;
      setCurrentSubtopicIndex(lastSub);
      setCurrentStep("problems");
      const lastProb = topicData.subtopics[lastSub].problems.length - 1;
      setCurrentProblemIndex(lastProb);
      setShowAnswer(true);
      return;
    }

    if (currentStep === "problems") {
      if (currentProblemIndex > 0) {
        // go to previous problem within same subtopic
        setCurrentProblemIndex(currentProblemIndex - 1);
        setShowAnswer(false);
      } else {
        // first problem -> go back to article
        setCurrentStep("article");
      }
    } else if (currentStep === "article") {
      if (currentSubtopicIndex > 0) {
        // go to previous subtopic's last problem
        const prevSub = currentSubtopicIndex - 1;
        setCurrentSubtopicIndex(prevSub);
        setCurrentStep("problems");
        const lastProb = topicData.subtopics[prevSub].problems.length - 1;
        setCurrentProblemIndex(lastProb);
        setShowAnswer(true);
      }
    }
  };

  const handleExit = async () => {
    // Always save progress before exiting
    if (topicData) {
      try {
        setIsSavingOnExit(true);
        await saveProgress();
        console.log("Progress saved before exit");
      } catch (error) {
        console.error("Error saving progress before exit:", error);
        // Still exit even if save fails
      } finally {
        setIsSavingOnExit(false);
      }
    }
    router.push("/learn");
  };

  if (loading) {
    return <ContentLoadingScreen topic={topic} firstGen={isFirstGen} />;
  }

  if (!topicData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">
            Failed to load content for {topic}
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const currentSubtopic = topicData.subtopics[currentSubtopicIndex];
  const progress =
    ((currentSubtopicIndex + (currentStep === "problems" ? 0.5 : 0)) /
      topicData.subtopics.length) *
    100;

  const answerCorrect = isCorrectBackend === null ? false : isCorrectBackend;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Head>
          {/* MathQuill resources preload */}
          <link
            rel="preload"
            as="script"
            href="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.4/jquery.min.js"
          />
          <link
            rel="preload"
            as="script"
            href="https://cdnjs.cloudflare.com/ajax/libs/mathquill/0.10.1/mathquill.min.js"
          />
          <link
            rel="preload"
            as="style"
            href="https://cdnjs.cloudflare.com/ajax/libs/mathquill/0.10.1/mathquill.min.css"
          />
          <link
            rel="stylesheet"
            href="https://cdnjs.cloudflare.com/ajax/libs/mathquill/0.10.1/mathquill.min.css"
          />
        </Head>

        {/* Main content wrapper that shifts when Tommy is open */}
        <div
          className={cn(
            "transition-all duration-300",
            isTommyOpen && currentStep === "problems" ? "mr-80 sm:mr-96" : "",
          )}
        >
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
            <div className="max-w-4xl mx-auto px-6 py-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <button
                    onClick={handleBack}
                    className="mr-4 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 19l-7-7m0 0l7-7m-7 7h18"
                      />
                    </svg>
                  </button>

                  {/* Exit button */}
                  <button
                    onClick={handleExit}
                    disabled={isSavingOnExit}
                    className="mr-4 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingOnExit ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-500"></div>
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    )}
                  </button>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {topicData.topic}
                  </h1>
                </div>
                <button
                  onClick={resetTopic}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Restart
                </button>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mt-2">
                <span>Progress: {Math.round(progress)}%</span>
                <span>
                  Subtopic {currentSubtopicIndex + 1} of{" "}
                  {topicData.subtopics.length}
                </span>
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto px-6 py-8">
            {currentStep === "article" && (
              <ArticleView
                subtopic={currentSubtopic}
                onNext={handleNextFromArticle}
                currentIndex={currentSubtopicIndex}
                totalSubtopics={topicData.subtopics.length}
              />
            )}

            {currentStep === "problems" && (
              <ProblemsView
                subtopic={topicData.subtopics[currentSubtopicIndex]}
                currentProblem={
                  topicData.subtopics[currentSubtopicIndex].problems[
                    currentProblemIndex
                  ]
                }
                currentProblemIndex={currentProblemIndex}
                totalProblems={
                  topicData.subtopics[currentSubtopicIndex].problems.length
                }
                userAnswer={userAnswer}
                setUserAnswer={setUserAnswer}
                selectedOption={selectedOption}
                setSelectedOption={setSelectedOption}
                showAnswer={showAnswer}
                onAnswerSubmit={handleAnswerSubmit}
                onNext={handleProblemNext}
                onRetry={handleRetry}
                correctAnswers={correctAnswers}
                validationExplanation={validationExplanation}
                answerCorrect={answerCorrect}
                hintLevel={hintLevel}
                setHintLevel={setHintLevel}
                feedback={feedback}
                setFeedback={setFeedback}
                handleCheckWork={handleCheckWork}
                feedbackItems={feedbackItems}
                setFeedbackItems={setFeedbackItems}
                showFeedback={showFeedback}
                setShowFeedback={setShowFeedback}
                isCheckingWork={isCheckingWork}
                extractedWork={extractedWork}
                setExtractedWork={setExtractedWork}
                showConfetti={showConfetti}
                showSuccessPopup={showSuccessPopup}
                onToggleTommy={() => setIsTommyOpen(!isTommyOpen)}
              />
            )}

            {currentStep === "completed" && (
              <CompletionView
                topic={topicData.topic}
                totalSubtopics={topicData.subtopics.length}
                onBackToMain={() => router.push("/")}
                onRestart={resetTopic}
              />
            )}
          </div>
        </div>

        {/* Whiteboard Component - only show during problems phase */}

        {/* Tommy Assistant - only show during problems phase */}
        {currentStep === "problems" && topicData && (
          <TommyAssistant
            problem={
              topicData.subtopics[currentSubtopicIndex].problems[
                currentProblemIndex
              ]
            }
            topic={topicData.topic}
            subtopic={topicData.subtopics[currentSubtopicIndex].title}
            userWork={extractedWork || userAnswer}
            hintLevel={hintLevel}
            isOpen={isTommyOpen}
            onToggle={() => setIsTommyOpen(!isTommyOpen)}
          />
        )}

        {/* Bug Report Button - floating in bottom left corner */}
        <BugReport className="left-4 right-auto" />
      </div>
    </ProtectedRoute>
  );
}

function ArticleView({
  subtopic,
  onNext,
  currentIndex,
  totalSubtopics,
}: {
  subtopic: Subtopic;
  onNext: () => void;
  currentIndex: number;
  totalSubtopics: number;
}) {
  console.log("=".repeat(80));
  console.log("🔍 [ARTICLE VIEW CONTENT]");
  console.log("=".repeat(80));
  console.log("SUBTOPIC TITLE:", subtopic.title);
  console.log("SUBTOPIC ARTICLE:", subtopic.article);
  console.log("=".repeat(80));

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {subtopic.title}
          </h1>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Subtopic {currentIndex + 1} of {totalSubtopics}
          </div>
        </div>

        <div className="prose prose-lg max-w-none dark:prose-invert">
          <MathContent content={subtopic.article} />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onNext} className="px-8 py-3">
          Continue to Practice Problems
        </Button>
      </div>
    </div>
  );
}

function ProblemsView({
  subtopic,
  currentProblem,
  currentProblemIndex,
  totalProblems,
  userAnswer,
  setUserAnswer,
  selectedOption,
  setSelectedOption,
  showAnswer,
  onAnswerSubmit,
  onNext,
  onRetry,
  correctAnswers,
  validationExplanation,
  answerCorrect,
  hintLevel,
  setHintLevel,
  feedback,
  setFeedback,
  handleCheckWork,
  feedbackItems,
  setFeedbackItems,
  showFeedback,
  setShowFeedback,
  isCheckingWork,
  extractedWork,
  setExtractedWork,
  showConfetti,
  showSuccessPopup,
  onToggleTommy,
}: {
  subtopic: Subtopic;
  currentProblem: Problem;
  currentProblemIndex: number;
  totalProblems: number;
  userAnswer: string;
  setUserAnswer: (answer: string) => void;
  selectedOption: number | null;
  setSelectedOption: (option: number | null) => void;
  showAnswer: boolean;
  onAnswerSubmit: () => void;
  onNext: () => void;
  onRetry: () => void;
  correctAnswers: number;
  validationExplanation: string;
  answerCorrect: boolean;
  hintLevel: number;
  setHintLevel: (level: number) => void;
  feedback: string | null;
  setFeedback: (feedback: string | null) => void;
  handleCheckWork: (imageData: string) => Promise<void>;
  feedbackItems: Array<{
    area: string;
    coordinates?: { x: number; y: number };
    issue: string;
    suggestion: string;
    severity: string;
  }>;
  setFeedbackItems: React.Dispatch<
    React.SetStateAction<
      Array<{
        area: string;
        coordinates?: { x: number; y: number };
        issue: string;
        suggestion: string;
        severity: string;
      }>
    >
  >;
  showFeedback: boolean;
  setShowFeedback: React.Dispatch<React.SetStateAction<boolean>>;
  isCheckingWork: boolean;
  extractedWork: string;
  setExtractedWork: React.Dispatch<React.SetStateAction<string>>;
  showConfetti: boolean;
  showSuccessPopup: boolean;
  onToggleTommy: () => void;
}) {
  console.log("=".repeat(80));
  // Use backend result for correct/incorrect UI
  const isCorrect = answerCorrect;
  const [backgroundStyle, setBackgroundStyle] = useState<
    "blank" | "lined" | "grid"
  >("blank");
  const [windowDimensions, setWindowDimensions] = useState({
    width: 0,
    height: 0,
  });
  const mathInputRef =
    useRef<import("@/components/ui/math-input").MathInputHandle>(null);

  // Function to handle OCR when MathInput is used
  const handleOcrForMathInput = async (imageData: string) => {
    // If we're using MathInput, use its OCR handler
    if (currentProblem.type === "short_answer" && mathInputRef.current) {
      await mathInputRef.current.handleOcr(imageData);
    } else {
      // Otherwise use the regular check work function
      await handleCheckWork(imageData);
    }
  };

  // Get window dimensions for confetti
  useEffect(() => {
    if (typeof window !== "undefined") {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });

      const handleResize = () => {
        setWindowDimensions({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  const handleClearFeedback = () => {
    setFeedbackItems([]);
    setShowFeedback(false);
    setFeedback(null);
    setExtractedWork("");
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8">
      {/* Confetti overlay */}
      {showConfetti && windowDimensions.width > 0 && (
        <ReactConfetti
          width={windowDimensions.width}
          height={windowDimensions.height}
          recycle={false}
          numberOfPieces={200}
          gravity={0.2}
        />
      )}

      {/* Success popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-green-500 text-white p-4 rounded-lg shadow-lg text-center max-w-xs animate-bounce-in-up">
            <div className="text-2xl font-bold mb-2">🎉 Great Job! 🎉</div>
            <p>Your work is correct!</p>
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Practice Problems: {subtopic.title}
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Problem {currentProblemIndex + 1} of {totalProblems}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
          <div
            className="bg-orange-500 h-1 rounded-full"
            style={{
              width: `${((currentProblemIndex + 1) / totalProblems) * 100}%`,
            }}
          />
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Correct answers: {correctAnswers} /{" "}
          {currentProblemIndex + (showAnswer ? 1 : 0)}
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          {currentProblem.type === "short_answer"
            ? "Problem:"
            : "Multiple Choice Question:"}
        </h3>
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-lg mb-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <MathContent content={currentProblem.question} />
            </div>
            <div className="flex items-center gap-2">
              {currentProblem.hints && currentProblem.hints.length > 0 && (
                <button
                  onClick={() => {
                    if (hintLevel === 0) {
                      setHintLevel(1);
                    } else if (
                      currentProblem.hints &&
                      hintLevel < currentProblem.hints.length
                    ) {
                      setHintLevel(hintLevel + 1);
                    } else {
                      setHintLevel(0);
                    }
                  }}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  title="Get a hint"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Hint Display */}
        {hintLevel > 0 &&
          currentProblem.hints &&
          currentProblem.hints.length >= hintLevel && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-blue-500 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                    Hint {hintLevel} of {currentProblem.hints.length}:
                  </h4>
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    <MathContent
                      content={currentProblem.hints[hintLevel - 1]}
                    />
                  </div>
                  {hintLevel < currentProblem.hints.length && (
                    <button
                      onClick={() => setHintLevel(hintLevel + 1)}
                      className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 underline"
                    >
                      Need more help? Click for another hint
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

        {currentProblem.type === "short_answer" ? (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Your Answer:
            </label>
            <MathInput
              value={userAnswer}
              onChange={setUserAnswer}
              disabled={showAnswer}
              placeholder="Click Σ to open math editor"
              onSubmit={!showAnswer ? onAnswerSubmit : undefined}
              enableOcr={true}
              correctAnswer={currentProblem.answer}
              ref={mathInputRef}
            />
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Click the Σ button to enter mathematical expressions.
            </p>

            {/* Enhanced whiteboard for work checking */}
            <div className="mt-4">
              <div className="flex mb-3 items-center gap-2">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Whiteboard Style:
                </span>
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden">
                  <button
                    onClick={() => setBackgroundStyle("blank")}
                    className={`px-3 py-1 text-sm ${
                      backgroundStyle === "blank"
                        ? "bg-blue-500 text-white"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    Blank
                  </button>
                  <button
                    onClick={() => setBackgroundStyle("lined")}
                    className={`px-3 py-1 text-sm ${
                      backgroundStyle === "lined"
                        ? "bg-blue-500 text-white"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    Lined
                  </button>
                  <button
                    onClick={() => setBackgroundStyle("grid")}
                    className={`px-3 py-1 text-sm ${
                      backgroundStyle === "grid"
                        ? "bg-blue-500 text-white"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    Grid
                  </button>
                </div>
              </div>
              <Whiteboard
                onCheckWork={handleCheckWork}
                correctAnswer={currentProblem.answer}
                feedbackItems={feedbackItems}
                showFeedback={showFeedback}
                onClearFeedback={handleClearFeedback}
                backgroundStyle={backgroundStyle}
                className="mb-4"
              />
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select an answer:
            </label>
            <MultipleChoice
              options={currentProblem.options || []}
              selectedOption={selectedOption}
              onOptionSelect={setSelectedOption}
              disabled={showAnswer}
              correctOption={currentProblem.correct_option}
              correctAnswer={currentProblem.answer}
              explanation={currentProblem.explanation}
              showCorrectAnswer={showAnswer}
            />

            {/* Enhanced whiteboard for multiple choice work checking */}
            <div className="mt-4">
              <div className="flex mb-3 items-center gap-2">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Whiteboard Style:
                </span>
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-md overflow-hidden">
                  <button
                    onClick={() => setBackgroundStyle("blank")}
                    className={`px-3 py-1 text-sm ${
                      backgroundStyle === "blank"
                        ? "bg-blue-500 text-white"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    Blank
                  </button>
                  <button
                    onClick={() => setBackgroundStyle("lined")}
                    className={`px-3 py-1 text-sm ${
                      backgroundStyle === "lined"
                        ? "bg-blue-500 text-white"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    Lined
                  </button>
                  <button
                    onClick={() => setBackgroundStyle("grid")}
                    className={`px-3 py-1 text-sm ${
                      backgroundStyle === "grid"
                        ? "bg-blue-500 text-white"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                    }`}
                  >
                    Grid
                  </button>
                </div>
              </div>
              <Whiteboard
                onCheckWork={handleCheckWork}
                correctAnswer={currentProblem.answer}
                feedbackItems={feedbackItems}
                showFeedback={showFeedback}
                onClearFeedback={handleClearFeedback}
                backgroundStyle={backgroundStyle}
                className="mb-4"
              />
            </div>
          </div>
        )}

        {showAnswer && (
          <div
            className={`p-4 rounded-lg border ${
              isCorrect
                ? "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800"
            }`}
          >
            <div className="flex items-center mb-2">
              <span
                className={`font-medium ${
                  isCorrect
                    ? "text-green-800 dark:text-green-200"
                    : "text-red-800 dark:text-red-200"
                }`}
              >
                {isCorrect ? "✓ Correct!" : "✗ Incorrect"}
              </span>
            </div>
            <div className="mb-2">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Correct Answer:
              </span>
              <div className="text-gray-800 dark:text-gray-200 mt-1">
                <MathContent content={currentProblem.answer} />
              </div>
            </div>
            {validationExplanation && (
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {validationExplanation}
              </div>
            )}
            {!isCorrect && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Review the material and try the next problem.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
        {!showAnswer ? (
          <button
            onClick={onAnswerSubmit}
            disabled={
              currentProblem.type === "short_answer"
                ? !userAnswer.trim()
                : selectedOption === null
            }
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Submit Answer
          </button>
        ) : (
          <div className="flex space-x-2">
            {answerCorrect ? (
              <button
                onClick={onNext}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                {currentProblemIndex === totalProblems - 1
                  ? "Continue →"
                  : "Next Problem →"}
              </button>
            ) : null}
            {!answerCorrect && (
              <button
                onClick={onRetry}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Retry
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function CompletionView({
  topic,
  totalSubtopics,
  onBackToMain,
  onRestart,
}: {
  topic: string;
  totalSubtopics: number;
  onBackToMain: () => void;
  onRestart: () => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-center">
      <div className="mb-8">
        <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-12 h-12 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Congratulations! 🎉
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-2">
          You&apos;ve completed all {totalSubtopics} subtopics for
        </p>
        <p className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          {topic}
        </p>
        <p className="text-gray-600 dark:text-gray-300">
          You are now proficient in this topic!
        </p>
      </div>

      <div className="flex justify-center space-x-4">
        <button
          onClick={onRestart}
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Study Again
        </button>
        <button
          onClick={onBackToMain}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Choose New Topic
        </button>
      </div>
    </div>
  );
}
