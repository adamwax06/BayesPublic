// API functions for saved topics

export interface SavedTopic {
  id: string;
  user_id: string;
  topic: string;
  course: string;
  content: any; // This will be the GenerateContentResponse
  created_at: string;
  updated_at: string;
}

export interface SavedTopicsResponse {
  saved_topics: SavedTopic[];
  total: number;
}

// New Topic Progress interfaces
export interface TopicProgress {
  id: string;
  user_id: string;
  topic_name: string;
  course: string;
  current_subtopic_index: number;
  current_problem_index: number;
  current_step: 'article' | 'problems';
  correct_answers: number;
  total_problems_attempted: number;
  completed_subtopics: number[];
  completed_problems: number[];
  started_at: string;
  last_accessed: string;
  total_time_spent: number;
  created_at: string;
  updated_at: string;
}

export interface TopicProgressResponse {
  topic_progress: TopicProgress[];
  total: number;
}

export interface SaveProgressRequest {
  topic_name: string;
  course: string;
  current_subtopic_index: number;
  current_problem_index: number;
  current_step: 'article' | 'problems';
  correct_answers: number;
  total_problems_attempted: number;
  completed_subtopics: number[];
  completed_problems: number[];
  time_spent?: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Helper function to make authenticated API requests
async function makeAuthenticatedRequest(
  url: string,
  options: RequestInit = {},
) {
  // Get the session from Supabase
  const { supabase } = await import("./supabase");
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  // If no session or session error, try to refresh
  if (!session || error) {
    console.log("No active session, attempting to refresh...");
    const {
      data: { session: refreshedSession },
      error: refreshError,
    } = await supabase.auth.refreshSession();
    if (!refreshedSession || refreshError) {
      console.log("Session refresh failed, redirecting to home page");
      // If refresh fails, redirect to home page
      window.location.href = "/";
      throw new Error("Authentication required");
    }
    console.log("Session refreshed successfully");
  }

  const activeSession =
    session ||
    (await supabase.auth.getSession().then(({ data }) => data.session));

  const headers = {
    "Content-Type": "application/json",
    ...(activeSession?.access_token && {
      Authorization: `Bearer ${activeSession.access_token}`,
    }),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    // If 401, try to refresh token once more
    if (response.status === 401) {
      const {
        data: { session: newSession },
      } = await supabase.auth.refreshSession();
      if (newSession) {
        // Retry the request with new token
        const retryHeaders = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${newSession.access_token}`,
          ...options.headers,
        };

        const retryResponse = await fetch(url, {
          ...options,
          headers: retryHeaders,
        });

        if (retryResponse.ok) {
          return retryResponse.json();
        }
      }
      // If still failing, redirect to home page
      window.location.href = "/";
      throw new Error("Authentication required");
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Get all saved topics for the current user
export async function getSavedTopics(): Promise<SavedTopicsResponse> {
  try {
    return await makeAuthenticatedRequest(`${API_BASE_URL}/api/saved-topics`);
  } catch (error) {
    console.error("Error fetching saved topics:", error);
    throw error;
  }
}

// Get a specific saved topic by ID
export async function getSavedTopic(topicId: string): Promise<SavedTopic> {
  try {
    return await makeAuthenticatedRequest(
      `${API_BASE_URL}/api/saved-topics/${topicId}`,
    );
  } catch (error) {
    console.error("Error fetching saved topic:", error);
    throw error;
  }
}

// Delete a saved topic
export async function deleteSavedTopic(
  topicId: string,
): Promise<{ message: string }> {
  try {
    return await makeAuthenticatedRequest(
      `${API_BASE_URL}/api/saved-topics/${topicId}`,
      {
        method: "DELETE",
      },
    );
  } catch (error) {
    console.error("Error deleting saved topic:", error);
    throw error;
  }
}

// New Topic Progress API functions
export async function getAllTopicProgress(): Promise<TopicProgressResponse> {
  try {
    return await makeAuthenticatedRequest(`${API_BASE_URL}/api/topic-progress`);
  } catch (error) {
    console.error("Error fetching topic progress:", error);
    throw error;
  }
}

export async function getTopicProgress(
  topicName: string,
  course: string
): Promise<TopicProgress> {
  try {
    return await makeAuthenticatedRequest(
      `${API_BASE_URL}/api/topic-progress/${encodeURIComponent(topicName)}?course=${encodeURIComponent(course)}`
    );
  } catch (error) {
    console.error("Error fetching topic progress:", error);
    // 404 is expected for new topics - no progress exists yet
    if (error instanceof Error && error.message.includes("404")) {
      console.log(`No progress found for ${topicName} in ${course} - this is normal for new topics`);
      throw error; // Re-throw so the calling code can handle it
    }
    throw error;
  }
}

export async function saveTopicProgress(
  request: SaveProgressRequest
): Promise<{ message: string }> {
  try {
    return await makeAuthenticatedRequest(
      `${API_BASE_URL}/api/topic-progress`,
      {
        method: "POST",
        body: JSON.stringify(request),
      }
    );
  } catch (error) {
    console.error("Error saving topic progress:", error);
    throw error;
  }
}

export async function deleteTopicProgress(
  topicName: string,
  course: string
): Promise<{ message: string }> {
  try {
    return await makeAuthenticatedRequest(
      `${API_BASE_URL}/api/topic-progress/${encodeURIComponent(topicName)}?course=${encodeURIComponent(course)}`,
      {
        method: "DELETE",
      }
    );
  } catch (error) {
    console.error("Error deleting topic progress:", error);
    throw error;
  }
}

export async function resetTopicProgress(
  topicName: string,
  course: string
): Promise<{ message: string }> {
  try {
    return await makeAuthenticatedRequest(
      `${API_BASE_URL}/api/topic-progress/${encodeURIComponent(topicName)}/reset?course=${encodeURIComponent(course)}`,
      {
        method: "POST",
      }
    );
  } catch (error) {
    console.error("Error resetting topic progress:", error);
    throw error;
  }
}

// Generate content for a topic (this will automatically save if user is authenticated)
export async function generateContent(
  topic: string,
  course: string = "calc 1",
): Promise<any> {
  try {
    return await makeAuthenticatedRequest(
      `${API_BASE_URL}/api/generate-content`,
      {
        method: "POST",
        body: JSON.stringify({ topic, course }),
      },
    );
  } catch (error) {
    console.error("Error generating content:", error);
    throw error;
  }
}

// Email API functions
export interface EmailResponse {
  success: boolean;
  message: string;
  email_id?: string;
  error?: string;
}

// Send welcome email to a user
export async function sendWelcomeEmail(
  email: string,
  name?: string,
): Promise<EmailResponse> {
  try {
    return await makeAuthenticatedRequest(
      `${API_BASE_URL}/api/send-welcome-email`,
      {
        method: "POST",
        body: JSON.stringify({ email, name }),
      },
    );
  } catch (error) {
    console.error("Error sending welcome email:", error);
    throw error;
  }
}

// Check email service status
export async function getEmailServiceStatus(): Promise<{
  email_service_available: boolean;
  resend_api_configured: boolean;
  from_domain: string;
}> {
  try {
    return await makeAuthenticatedRequest(`${API_BASE_URL}/api/email/status`);
  } catch (error) {
    console.error("Error checking email service status:", error);
    throw error;
  }
}

// Subscription management
export interface SubscriptionStatus {
  plan: string;
  status: string;
  max_prompts_per_week: number;
  prompts_used_this_week: number;
  week_start_date?: string;
  created_at?: string;
  updated_at?: string;
}

// Get current user's subscription status and usage
export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  try {
    return await makeAuthenticatedRequest(
      `${API_BASE_URL}/api/subscription-status`,
    );
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    throw error;
  }
}

// Increment usage count (called when content is generated)
export async function incrementUsage(): Promise<{ message: string; new_count: number }> {
  try {
    return await makeAuthenticatedRequest(
      `${API_BASE_URL}/api/increment-usage`,
      {
        method: "POST",
      },
    );
  } catch (error) {
    console.error("Error incrementing usage:", error);
    throw error;
  }
}
