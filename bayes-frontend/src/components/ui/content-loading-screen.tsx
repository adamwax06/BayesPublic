"use client";

import { useState, useEffect } from "react";

const FUN_MESSAGES = [
  "Teaching AI to speak math...",
  "Digging through ancient calculus scrolls...",
  "Charging up the learning neurons...",
  "Crafting the perfect practice problems...",
  "Analyzing the mysteries of derivatives...",
  "Mixing the perfect formula for learning...",
  "Launching your mathematical journey...",
  "Summoning the math wizards...",
  "Preparing your personalized math show...",
  "Predicting your learning success...",
];

export function ContentLoadingScreen({
  topic,
  firstGen = false,
}: {
  topic: string;
  firstGen?: boolean;
}) {
  const [currentMessage, setCurrentMessage] = useState(FUN_MESSAGES[0]);

  useEffect(() => {
    const interval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * FUN_MESSAGES.length);
      setCurrentMessage(FUN_MESSAGES[randomIndex]);
    }, 12000); // Change every 12 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        {firstGen ? (
          <p className="text-gray-600 dark:text-gray-300 transition-opacity duration-500">
            This topic hasn’t been generated before – this may take a few
            minutes.
          </p>
        ) : (
          <p className="text-gray-600 dark:text-gray-300 transition-opacity duration-500">
            {currentMessage}
          </p>
        )}
      </div>
    </div>
  );
}
