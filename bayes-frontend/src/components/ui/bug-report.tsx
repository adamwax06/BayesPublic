"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Bug } from "lucide-react";

interface BugReportProps {
  className?: string;
}

export function BugReport({ className }: BugReportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current page URL for context
      const currentUrl = window.location.href;
      const userAgent = navigator.userAgent;

      // Create issue body with additional context
      const issueBody = `${description}

---
**Additional Context:**
- Page: ${currentUrl}
- User Agent: ${userAgent}
- Timestamp: ${new Date().toISOString()}`;

      // Use backend API to create issue
      const apiUrl =
        process.env.NEXT_PUBLIC_DEVELOPMENT_MODE === "true"
          ? "http://localhost:8000"
          : "https://bayes-backend.onrender.com";

      const response = await fetch(`${apiUrl}/api/github/create-issue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: `Bug Report: ${title}`,
          body: issueBody,
          labels: ["bug", "user-reported"],
        }),
      });

      if (response.ok) {
        const result = await response.json();

        if (result.success) {
          toast.success(
            "Bug report submitted successfully! Our team will review it shortly.",
          );
          setTitle("");
          setDescription("");
          setIsOpen(false);
        } else {
          throw new Error(
            result.error_message || "Failed to submit bug report",
          );
        }
      } else {
        const error = await response.json();
        throw new Error(
          error.error_message || error.message || "Failed to submit bug report",
        );
      }
    } catch (error) {
      console.error("Error submitting bug report:", error);
      toast.error("Failed to submit bug report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={`fixed bottom-4 left-4 z-50 h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 ${className}`}
          title="Report a bug"
        >
          <Bug className="h-6 w-6 text-gray-600 dark:text-gray-400" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-red-500" />
            Report a Bug
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Bug Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the bug"
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please describe the bug in detail. Include steps to reproduce, expected behavior, and actual behavior."
              rows={4}
              disabled={isSubmitting}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Bug Report"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
