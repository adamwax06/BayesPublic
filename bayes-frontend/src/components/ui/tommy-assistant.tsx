"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { MathContent } from "@/components/ui/math-content";
import { cn } from "@/lib/utils";
import { X, ArrowUp } from "lucide-react";
import { BsRobot } from "react-icons/bs";
import { supabase } from "@/lib/supabase";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface TommyAssistantProps {
  problem: {
    question: string;
    answer: string;
    type: string;
    hints?: string[];
  };
  topic: string;
  subtopic: string;
  userWork?: string;
  hintLevel?: number;
  isOpen: boolean;
  onToggle: () => void;
}

export function TommyAssistant({
  problem,
  topic,
  subtopic,
  userWork,
  hintLevel = 0,
  isOpen,
  onToggle,
}: TommyAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I'm Tommy, your math assistant. I'm here to help you with this problem. What would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    const userInput = input; // Store input before clearing
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Create a placeholder message for streaming
    const assistantMessage: Message = {
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      // Get the current session
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("No active session");
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/tommy/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            message: userInput,
            problem_context: {
              problem,
              topic,
              subtopic,
              user_work: userWork,
              hint_level: hintLevel,
            },
            conversation_history: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to get response from Tommy");
      }

      // Read the stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let accumulatedContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulatedContent += chunk;

          // Update the last assistant message with accumulated content
          setMessages((prev) => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage && lastMessage.role === "assistant") {
              lastMessage.content = accumulatedContent;
            }
            return newMessages;
          });
        }
      }
    } catch (error) {
      console.error("Error sending message to Tommy:", error);
      // Update the last message with error
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.role === "assistant") {
          lastMessage.content =
            "I'm having trouble understanding right now. Please try again!";
        }
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Toggle button when closed - positioned at top right */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed top-20 right-4 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 p-2.5 rounded-lg shadow-md hover:shadow-lg border border-gray-200 dark:border-gray-700 transition-all duration-200 z-50 flex items-center gap-2"
          title="Ask Tommy for help"
        >
          <BsRobot className="w-4 h-4" />
          <span className="text-sm font-medium">Ask Tommy</span>
        </button>
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed right-0 top-0 h-full bg-white dark:bg-gray-900 shadow-2xl transition-all duration-300 z-40",
          isOpen ? "w-80 sm:w-96" : "w-0",
        )}
      >
        {isOpen && (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                    <BsRobot className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Tommy
                  </h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onToggle}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white dark:bg-gray-900">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex gap-2",
                    message.role === "user" ? "justify-end" : "justify-start",
                  )}
                >
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0 w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center">
                      <BsRobot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] px-4 py-2.5 rounded-lg",
                      message.role === "user"
                        ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                        : "bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white",
                    )}
                  >
                    {message.role === "assistant" ? (
                      isLoading &&
                      index === messages.length - 1 &&
                      !message.content ? (
                        <div className="flex space-x-1.5">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                          <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          />
                          <div
                            className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          />
                        </div>
                      ) : (
                        <MathContent content={message.content} />
                      )
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
              <div className="relative flex items-center bg-gray-100 dark:bg-gray-800 rounded-full">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask Tommy..."
                  className="flex-1 bg-transparent px-6 py-4 text-gray-700 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none text-base"
                  disabled={isLoading}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  className="mr-2 p-2 bg-gray-800 hover:bg-black disabled:bg-gray-400 text-white rounded-full transition-colors"
                >
                  <ArrowUp className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
