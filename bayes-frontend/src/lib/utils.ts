"use client";

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Force the use of localhost for now to fix the fetch error
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function mathOcr(imageData: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ocr/math`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_data: imageData,
      }),
      credentials: "same-origin",
    });

    if (!response.ok) {
      throw new Error(`OCR failed with status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error in mathOcr:", error);
    throw error;
  }
}

export async function checkAnswerOcr(
  imageData: string,
  correctAnswer: string,
  problemType: string = "general",
) {
  try {
    console.log(
      "Making check-answer-ocr request with correct answer:",
      correctAnswer,
    );

    const response = await fetch(`${API_BASE_URL}/api/check-answer-ocr`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_data: imageData,
        correct_answer: correctAnswer,
        problem_type: problemType,
      }),
      credentials: "same-origin",
    });

    if (!response.ok) {
      throw new Error(`Answer checking failed with status: ${response.status}`);
    }

    // Get the raw response text for debugging
    const responseText = await response.text();
    console.log("Raw response text:", responseText);

    // Parse the JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse JSON response:", e);
      throw new Error("Invalid JSON response from server");
    }

    console.log("Raw check-answer-ocr response:", data);

    // Ensure recognized_latex is properly handled
    const result = {
      ...data,
      is_correct: !!data.is_correct,
      confidence: data.confidence || 0,
      explanation: data.explanation || "",
      error_message: data.error_message || null,
      recognized_latex: data.recognized_latex || "",
    };

    console.log("Processed check-answer-ocr response:", result);
    return result;
  } catch (error) {
    console.error("Error in checkAnswerOcr:", error);
    throw error;
  }
}

export async function checkWorkWithFeedback(
  imageData: string,
  question: string,
  correctAnswer: string,
  problemType: string = "general",
) {
  try {
    console.log("Making check-work-with-feedback request");

    const response = await fetch(
      `${API_BASE_URL}/api/check-work-with-feedback`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_data: imageData,
          question: question,
          correct_answer: correctAnswer,
          problem_type: problemType,
        }),
        credentials: "same-origin",
      },
    );

    if (!response.ok) {
      throw new Error(`Work checking failed with status: ${response.status}`);
    }

    // Get the raw response text for debugging
    const responseText = await response.text();
    console.log("Raw response text:", responseText);

    // Parse the JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error("Failed to parse JSON response:", e);
      throw new Error("Invalid JSON response from server");
    }

    console.log("Raw check-work-with-feedback response:", data);

    // Ensure all fields are properly handled
    const restoreLatex = (s: string): string =>
      typeof s === "string" ? s.replace(/\\\\/g, "\\") : s;

    const processedFeedbackItems = (data.feedback_items || []).map(
      (item: any) => ({
        ...item,
        issue: restoreLatex(item.issue),
        suggestion: restoreLatex(item.suggestion),
      }),
    );

    const result = {
      overall_correct: !!data.overall_correct,
      feedback_items: processedFeedbackItems,
      general_feedback: data.general_feedback || "",
      confidence: data.confidence || 0,
      error_message: data.error_message || null,
      extracted_work: data.extracted_work || "", // Add extracted work from Mathpix
      math_expressions: data.math_expressions || [],
    };

    console.log("Processed check-work-with-feedback response:", result);
    return result;
  } catch (error) {
    console.error("Error in checkWorkWithFeedback:", error);
    throw error;
  }
}
