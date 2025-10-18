"use client";
import { cn } from "@/lib/utils";
import { Inter } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import React, { useEffect, useRef } from "react";
import { RoughNotation, RoughNotationGroup } from "react-rough-notation";
import { animate, useInView } from "motion/react";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Math symbols for animated background
const MathSymbol = ({
  symbol,
  className,
}: {
  symbol: string;
  className?: string;
}) => (
  <div
    className={cn(
      "absolute text-gray-200 pointer-events-none select-none",
      className,
    )}
  >
    {symbol}
  </div>
);

export function PlayfulHeroSection() {
  const ref = useRef(null);
  const isInView = useInView(ref);

  return (
    <div ref={ref} className="mb-20 w-full bg-white relative overflow-hidden">
      {/* Animated mathematical background */}
      <div className="absolute inset-0 overflow-hidden">
        <MathSymbol
          symbol="∫"
          className="text-4xl top-20 left-10 animate-pulse"
        />
        <MathSymbol
          symbol="∂"
          className="text-3xl top-40 right-20 animate-bounce"
        />
        <MathSymbol
          symbol="∑"
          className="text-5xl top-60 left-1/4 animate-pulse"
        />
        <MathSymbol
          symbol="∞"
          className="text-3xl top-80 right-1/3 animate-bounce"
        />
        <MathSymbol
          symbol="∆"
          className="text-4xl top-100 left-2/3 animate-pulse"
        />
        <MathSymbol
          symbol="π"
          className="text-3xl top-32 right-10 animate-bounce"
        />
        <MathSymbol
          symbol="√"
          className="text-4xl top-72 left-1/2 animate-pulse"
        />
        <MathSymbol
          symbol="θ"
          className="text-3xl top-52 right-1/2 animate-bounce"
        />
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-10 pt-10 sm:grid-cols-2 md:pt-20 lg:grid-cols-3 relative z-10">
        <div className="px-4 py-10 md:px-8 md:py-10 lg:col-span-2">
          <RoughNotationGroup show={isInView}>
            <h2
              className={cn(
                "text-center text-2xl font-bold tracking-tight text-primary sm:text-left sm:text-4xl lg:text-7xl",
                inter.className,
              )}
            >
              Conquer{" "}
              <RoughNotation
                type="highlight"
                animationDuration={2000}
                iterations={2}
                color="#10B98180"
                multiline
              >
                <span className="text-currentColor">Mathematics</span>
              </RoughNotation>{" "}
              with{" "}
              <RoughNotation
                type="underline"
                animationDuration={2000}
                iterations={10}
                color="#10B981"
              >
                AI-Powered Tutoring
              </RoughNotation>
            </h2>
            <p className="mt-4 max-w-2xl text-center text-sm text-foreground sm:text-left md:mt-10 md:text-lg font-[var(--font-inter)]">
              Get personalized explanations, interactive problem-solving, and
              structured learning modules designed just for you.{" "}
              <RoughNotation
                type="underline"
                animationDuration={2000}
                iterations={3}
                color="#10B981"
              >
                Start learning for free today.
              </RoughNotation>
            </p>
          </RoughNotationGroup>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <Link
              href="/learn"
              className="w-full origin-left rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all duration-200 hover:shadow-lg hover:[transform:perspective(500px)_rotateX(10deg)] sm:w-auto inline-block text-center"
            >
              Start Learning for Free
            </Link>
            <Link
              href="https://cal.com/nanda-guntupalli/bayes"
              target="_blank"
              className="w-full origin-left rounded-full bg-gray-200 px-6 py-3 text-sm font-semibold text-black transition-all duration-200 hover:shadow-lg hover:[transform:perspective(500px)_rotateX(-10deg)] sm:w-auto inline-block text-center"
            >
              Want to learn more?
            </Link>
          </div>
        </div>
        <div className="relative flex w-full flex-shrink-0 justify-end">
          <Skeleton />
        </div>
      </div>
    </div>
  );
}

export const Skeleton = () => {
  const ref = useRef(null);
  const isInView = useInView(ref);
  useEffect(() => {
    const sequence = [
      [".question", { opacity: [0, 1] }, { duration: 1, ease: "easeOut" }],
      [".handwriting", { opacity: [0, 1] }, { duration: 1, ease: "easeOut" }],
      [".feedback", { opacity: [0, 1] }, { duration: 1, ease: "easeOut" }],
    ];

    //@ts-expect-error - TODO: fix this type error
    if (isInView) animate(sequence);
  }, [isInView]);

  return (
    <div ref={ref} className="relative m-auto w-full max-w-md">
      {/* Short answer interface mockup -  looks like actual app */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-visible">
        {/* App header */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 flex items-center justify-center">
                <Image
                  src="/logo-small.png"
                  alt="Bayes Logo"
                  width={32}
                  height={32}
                  className="w-full h-full object-contain"
                />
              </div>
              <h3 className="font-semibold text-gray-900">Bayes</h3>
            </div>
            <div className="text-sm text-gray-500 font-[var(--font-inter)]">
              Problem 1 of 3
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="p-6 space-y-6 pb-8">
          {/* Question */}
          <div className="question opacity-0">
            <h4 className="font-semibold text-gray-900 mb-3 ">Problem:</h4>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-lg text-gray-800 font-[var(--font-inter)]">
                f(x) = 3x² + 2x - 1
              </div>
            </div>
          </div>

          {/* Handwriting area with red highlighting */}
          <div className="handwriting opacity-0">
            <h4 className="font-semibold text-gray-900 mb-3">Your Work:</h4>
            <div className="bg-white border-2 border-gray-200 rounded-lg p-4 relative overflow-hidden">
              {/* Actual handwriting image with animated highlight */}
              <div className="w-full h-32 bg-white rounded flex items-center justify-center relative overflow-hidden">
                <Image
                  src="/handwriting-mockup.png"
                  alt="Handwritten work"
                  width={300}
                  height={128}
                  className="w-full h-full object-contain relative z-10"
                />

                {/* Animated red highlight overlay */}
                <div className="absolute inset-0 bg-red-500/20 border-2 border-red-500 rounded-md animate-pulse z-20 pointer-events-none"></div>
              </div>
            </div>
          </div>

          {/* Feedback tooltip */}
          <div className="feedback opacity-0">
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 max-w-sm">
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0">
                  <svg
                    className="w-4 h-4 text-red-500 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div className="space-y-1">
                  <p className="font-semibold mb-1">Step 1</p>
                  <p className="text-sm mb-1 font-semibold text-red-600">
                    Issue:
                  </p>
                  <p className="text-sm text-gray-700 font-[var(--font-inter)]">
                    You took the integral instead of the derivative
                  </p>
                  <p className="text-sm mt-2 mb-1 font-semibold text-green-600">
                    Suggestion:
                  </p>
                  <p className="text-sm text-gray-700 font-[var(--font-inter)]">
                    Use d/dx instead of ∫ for derivatives
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const MobileMockup = ({ className }: { className?: string }) => {
  return (
    <svg
      width="421"
      height="852"
      viewBox="0 0 421 852"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        "absolute inset-0 mx-auto h-full w-full flex-shrink-0 object-cover object-top text-neutral-900 dark:text-neutral-50",
        className,
      )}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M73 0H348C386.66 0 418 31.3401 418 70V782C418 820.66 386.66 852 348 852H73C34.3401 852 3 820.66 3 782V70C3 31.3401 34.3401 0 73 0ZM348 6H73C37.6538 6 9 34.6538 9 70V782C9 817.346 37.6538 846 73 846H348C383.346 846 412 817.346 412 782V70C412 34.6538 383.346 6 348 6Z"
        fill="currentColor"
      />
      <rect
        x="318"
        width="10"
        height="6"
        fill="currentColor"
        fillOpacity="0.2"
      />
      <rect
        x="93"
        y="846"
        width="10"
        height="6"
        fill="currentColor"
        fillOpacity="0.2"
      />
      <rect
        x="3"
        y="90"
        width="6"
        height="10"
        fill="currentColor"
        fillOpacity="0.2"
      />
      <rect
        x="412"
        y="90"
        width="6"
        height="10"
        fill="currentColor"
        fillOpacity="0.2"
      />
      <rect
        x="3"
        y="752"
        width="6"
        height="10"
        fill="currentColor"
        fillOpacity="0.2"
      />
      <rect
        x="412"
        y="752"
        width="6"
        height="10"
        fill="currentColor"
        fillOpacity="0.2"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M417.971 266H418.981C420.096 266 421 266.895 421 268V364C421 365.105 420.096 366 418.981 366H417.971V266Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 302C0 300.895 0.90402 300 2.01918 300H3.02878V363H2.01918C0.90402 363 0 362.105 0 361V302Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 223C0 221.895 0.90402 221 2.01918 221H3.02878V284H2.01918C0.90402 284 0 283.105 0 282V223Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 162C0 160.895 0.90402 160 2.01918 160H3.02878V193H2.01918C0.90402 193 0 192.105 0 191V162Z"
        fill="currentColor"
      />
      <rect
        x="150"
        y="30"
        width="120"
        height="35"
        rx="17.5"
        fill="currentColor"
      />
      <rect
        x="244"
        y="41"
        width="13"
        height="13"
        rx="6.5"
        fill="currentColor"
        fillOpacity="0.1"
      />
    </svg>
  );
};
