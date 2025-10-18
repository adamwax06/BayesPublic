"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSavedTopics, deleteSavedTopic, SavedTopic } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import {
  BookOpen,
  Trash2,
  Calendar,
  GraduationCap,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SavedTopicsPage() {
  const [savedTopics, setSavedTopics] = useState<SavedTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchSavedTopics();
    }
  }, [user]);

  const fetchSavedTopics = async () => {
    try {
      setLoading(true);
      const response = await getSavedTopics();
      setSavedTopics(response.saved_topics);
    } catch (error) {
      console.error("Error fetching saved topics:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    try {
      setDeleting(topicId);
      await deleteSavedTopic(topicId);
      setSavedTopics(savedTopics.filter((topic) => topic.id !== topicId));
    } catch (error) {
      console.error("Error deleting topic:", error);
    } finally {
      setDeleting(null);
    }
  };

  const handleTopicClick = (savedTopic: SavedTopic) => {
    const params = new URLSearchParams({
      course: savedTopic.course,
      saved: "true",
    });
    router.push(
      `/learn/${encodeURIComponent(savedTopic.topic)}?${params.toString()}`,
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getSubtopicCount = (content: any) => {
    return content?.subtopics?.length || 0;
  };

  const getProblemCount = (content: any) => {
    return (
      content?.subtopics?.reduce(
        (total: number, subtopic: any) =>
          total + (subtopic?.problems?.length || 0),
        0,
      ) || 0
    );
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
                  Saved Topics
                </h1>
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {savedTopics.length} saved{" "}
                {savedTopics.length === 1 ? "topic" : "topics"}
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
                Loading saved topics...
              </span>
            </div>
          ) : savedTopics.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                No saved topics yet
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Generate some topics to see them saved here automatically
              </p>
              <Button onClick={() => router.push("/learn")}>
                Start Learning
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {savedTopics.map((savedTopic) => (
                <Card
                  key={savedTopic.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer group"
                  onClick={() => handleTopicClick(savedTopic)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center">
                        <BookOpen className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" />
                        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                          {savedTopic.topic}
                        </CardTitle>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTopic(savedTopic.id);
                        }}
                        disabled={deleting === savedTopic.id}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-8 w-8 text-gray-400 hover:text-red-500"
                      >
                        {deleting === savedTopic.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-500"></div>
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <GraduationCap className="w-4 h-4 mr-2" />
                        <span className="capitalize">{savedTopic.course}</span>
                      </div>

                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>Saved {formatDate(savedTopic.created_at)}</span>
                      </div>

                      <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                        <div className="text-center">
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {getSubtopicCount(savedTopic.content)}
                          </div>
                          <div className="text-xs">Subtopics</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {getProblemCount(savedTopic.content)}
                          </div>
                          <div className="text-xs">Problems</div>
                        </div>
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
