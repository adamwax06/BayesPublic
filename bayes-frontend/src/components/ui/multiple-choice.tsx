"use client";

import React, { useState } from "react";
import { MathContent } from "./math-content";
import { RadioGroup, RadioGroupItem } from "./radio-group";
import { Label } from "./label";
import { Button } from "./button";
import { checkAnswerOcr } from "@/lib/utils";
import { Lightbulb, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface MultipleChoiceProps {
  options: string[];
  selectedOption: number | null;
  onOptionSelect: (optionIndex: number) => void;
  correctOption?: number;
  correctAnswer?: string;
  disabled?: boolean;
  showCorrectAnswer?: boolean;
  explanation?: string;
}

export function MultipleChoice({
  options,
  selectedOption,
  onOptionSelect,
  correctOption,
  correctAnswer,
  disabled = false,
  showCorrectAnswer = false,
  explanation,
}: MultipleChoiceProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<{
    isCorrect?: boolean;
    explanation?: string;
    recognizedLatex?: string;
  } | null>(null);

  // We no longer need the handleCheckWork function since we're not displaying a whiteboard here
  // The whiteboard is now only in the page component

  return (
    <div className="w-full space-y-4">
      {/* Options */}
      <RadioGroup
        value={selectedOption?.toString() || ""}
        onValueChange={(value) => onOptionSelect(parseInt(value))}
        disabled={disabled}
        className="space-y-3"
      >
        {options.map((option, index) => (
          <div key={index} className="flex items-center space-x-3">
            <RadioGroupItem
              value={index.toString()}
              id={`option-${index}`}
              className="mt-1"
            />
            <Label
              htmlFor={`option-${index}`}
              className={`flex-1 cursor-pointer text-base leading-relaxed ${
                showCorrectAnswer && correctOption === index
                  ? "text-green-600 font-medium"
                  : ""
              }`}
            >
              <MathContent content={option} />
            </Label>
          </div>
        ))}
      </RadioGroup>

      {/* No longer need whiteboard-related UI here */}

      {/* Result explanation - keep this part */}
      {checkResult && (
        <div
          className={`p-4 rounded-lg mt-4 ${
            checkResult.isCorrect
              ? "bg-green-50 border border-green-200"
              : "bg-amber-50 border border-amber-200"
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb
              className={`w-5 h-5 ${checkResult.isCorrect ? "text-green-600" : "text-amber-600"}`}
            />
            <h3 className="font-medium">Feedback</h3>
          </div>
          <p>{checkResult.explanation}</p>

          {checkResult.recognizedLatex && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-1">
                Recognized from your handwriting:
              </p>
              <div className="bg-white p-2 rounded border border-gray-200">
                <MathContent content={checkResult.recognizedLatex} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Show explanation when answer is revealed */}
      {showCorrectAnswer && explanation && (
        <div className="p-4 rounded-lg mt-4 bg-blue-50 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium">Explanation</h3>
          </div>
          <MathContent content={explanation} />
        </div>
      )}
    </div>
  );
}
