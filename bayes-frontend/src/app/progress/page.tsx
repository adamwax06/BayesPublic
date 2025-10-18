"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAllTopicProgress, deleteTopicProgress, resetTopicProgress, TopicProgress } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import {
  BookOpen,
  Trash2,
  Calendar,
  GraduationCap,
  ArrowLeft,
  Play,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProgressPage() {
  const [topicProgress, setTopicProgress] = useState<TopicProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchTopicProgress();
    }
  }, [user]);

  const fetchTopicProgress = async () => {
    try {
      setLoading(true);
      const response = await getAllTopicProgress();
      setTopicProgress(response.topic_progress);
    } catch (error) {
      console.error("Error fetching topic progress:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProgress = async (progress: TopicProgress) => {
    try {
      setDeleting(progress.id);
      await deleteTopicProgress(progress.topic_name, progress.course);
      setTopicProgress(topicProgress.filter((p) => p.id !== progress.id));
    } catch (error) {
      console.error("Error deleting progress:", error);
    } finally {
      setDeleting(null);
    }
  };

  const handleResetProgress = async (progress: TopicProgress) => {
    try {
      setResetting(progress.id);
      await resetTopicProgress(progress.topic_name, progress.course);
      // Refresh the list to get updated progress
      await fetchTopicProgress();
    } catch (error) {
      console.error("Error resetting progress:", error);
    } finally {
      setResetting(null);
    }
  };

  const handleProgressClick = (progress: TopicProgress) => {
    const params = new URLSearchParams({
      course: progress.course,
    });
    router.push(
      `/learn/${encodeURIComponent(progress.topic_name)}?${params.toString()}`,
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTimeSpent = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const calculateCompletionPercentage = (progress: TopicProgress) => {
    // This is a simplified calculation - you might want to make this more sophisticated
    const totalProblems = progress.total_problems_attempted + progress.completed_problems.length;
    if (totalProblems === 0) return 0;
    
    const completedProblems = progress.correct_answers + progress.completed_problems.length;
    return Math.round((completedProblems / totalProblems) * 100);
  };

  const getProgressStatus = (progress: TopicProgress) => {
    if (progress.current_step === 'article') {
      return 'Reading';
    } else if (progress.current_step === 'problems') {
      return 'Solving Problems';
    } else {
      return 'Completed';
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/learn")}
                  className="mr-4"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Learn
                </Button>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  My Learning Progress
                </h1>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {topicProgress.length} topic{topicProgress.length !== 1 ? 's' : ''} in progress
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-300">
                Loading progress...
              </span>
            </div>
          ) : topicProgress.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                No progress yet
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Start learning a topic to see your progress here
              </p>
              <Button onClick={() => router.push("/learn")}>
                Start Learning
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {topicProgress.map((progress) => (
                <Card
                  key={progress.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => handleProgressClick(progress)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center">
                        <BookOpen className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" />
                        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                          {progress.topic_name}
                        </CardTitle>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResetProgress(progress);
                          }}
                          disabled={resetting === progress.id}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-8 w-8 text-gray-400 hover:text-orange-500"
                        >
                          {resetting === progress.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
                          ) : (
                            <RotateCcw className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProgress(progress);
                          }}
                          disabled={deleting === progress.id}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-8 w-8 text-gray-400 hover:text-red-500"
                        >
                          {deleting === progress.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <GraduationCap className="w-4 h-4 mr-2" />
                        <span className="capitalize">{progress.course}</span>
                      </div>

                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>Last accessed {formatDate(progress.last_accessed)}</span>
                      </div>

                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Play className="w-4 h-4 mr-2" />
                        <span>{getProgressStatus(progress)}</span>
                      </div>

                      <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                        <div className="text-center">
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {calculateCompletionPercentage(progress)}%
                          </div>
                          <div className="text-xs">Complete</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {progress.correct_answers}
                          </div>
                          <div className="text-xs">Correct</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {formatTimeSpent(progress.total_time_spent)}
                          </div>
                          <div className="text-xs">Time</div>
                        </div>
                      </div>

                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${calculateCompletionPercentage(progress)}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
