"use client";

import { UserCheck, BarChart3, Globe } from "lucide-react";

const features = [
  {
    name: "Personalized Support",
    description:
      "AI-powered tutoring that adapts to your unique learning style and pace, providing customized explanations and practice problems.",
    icon: UserCheck,
  },
  {
    name: "Topic History Sidebar",
    description:
      "Track your progress across different mathematics topics with an organized sidebar showing your learning journey.",
    icon: BarChart3,
  },
  {
    name: "Comprehensive Topic Coverage",
    description: "From algebra to calculus, Bayes grows with your skills.",
    icon: Globe,
  },
];

export default function WithProductScreenshot() {
  return (
    <div className="overflow-hidden bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2 lg:items-center">
          <div className="lg:pt-4 lg:pr-8">
            <div className="lg:max-w-lg">
              <h2 className="text-base/7 font-semibold text-primary">
                See Bayes in Action
              </h2>
              <p className="mt-2 text-4xl font-semibold tracking-tight text-pretty text-gray-900 sm:text-5xl">
                Experience personalized math tutoring that adapts to your
                learning style
              </p>
              <p className="mt-6 text-lg/8 text-gray-700">
                Interactive problem-solving with step-by-step guidance, progress
                tracking, and AI-powered explanations tailored to help you
                master math concepts.
              </p>
            </div>
          </div>

          <div
            className="relative w-full rounded-xl shadow-xl ring-1 ring-gray-400/10 overflow-hidden lg:mt-16"
            style={{ aspectRatio: "2052 / 1316" }}
          >
            {/* Demo Video */}
            <video
              className="absolute inset-0 w-full h-full object-cover"
              controls
              autoPlay
              loop
              muted
              playsInline
            >
              <source src="/BayesDemo.mov" type="video/quicktime" />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      </div>
    </div>
  );
}
