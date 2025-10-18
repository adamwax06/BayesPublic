"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Transition } from "@headlessui/react";
import { motion } from "motion/react";

export function TestimonialsGridWithCenteredCarousel() {
  return (
    <div className="relative w-full max-w-7xl mx-auto px-4 md:px-8 pt-20 overflow-hidden h-full bg-white">
      <div className="pb-20">
        <h1 className="pt-4 font-bold text-primary text-lg md:text-2xl">
          Students Love Learning with Bayes
        </h1>
        <p className="text-base text-[#6B7280] font-[var(--font-inter)]">
          See how AI-powered tutoring is transforming math education.
        </p>
      </div>

      <div className=" relative">
        <TestimonialsSlider />
        <div className="h-full max-h-screen md:max-h-none overflow-hidden w-full bg-muted opacity-30 [mask-image:radial-gradient(circle_at_center,transparent_10%,white_99%)]">
          <TestimonialsGrid />
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 h-40 w-full bg-gradient-to-t from-white to-transparent"></div>
    </div>
  );
}

export const TestimonialsGrid = () => {
  const first = testimonials.slice(0, 3);
  const second = testimonials.slice(3, 6);
  const third = testimonials.slice(6, 9);
  const fourth = testimonials.slice(9, 12);

  const grid = [first, second, third, fourth];
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl mx-auto ">
      {grid.map((testimonialsCol, index) => (
        <div key={`testimonials-col-${index}`} className="grid gap-4">
          {testimonialsCol.map((testimonial, cardIndex) => (
            <motion.div
              key={`testimonial-${testimonial.src}-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: index * 0.1 + cardIndex * 0.05,
                ease: "easeOut",
              }}
              whileHover={{
                scale: 1.02,
                transition: { duration: 0.2 },
              }}
            >
              <Card>
                <Quote>{testimonial.quote}</Quote>
                <div className="flex gap-2 items-center mt-8">
                  <Image
                    src={testimonial.src}
                    alt={testimonial.name}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                  <div className="flex flex-col">
                    <QuoteDescription className="text-[#10B981] font-semibold">
                      {testimonial.name}
                    </QuoteDescription>
                    <QuoteDescription className="text-[10px]">
                      {testimonial.designation}
                    </QuoteDescription>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      ))}
    </div>
  );
};

export const Card = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "p-8 rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow duration-300",
        className,
      )}
    >
      {children}
    </div>
  );
};

export const Quote = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <h3 className={cn("text-xs font-semibold text-[#6B7280] py-2", className)}>
      {children}
    </h3>
  );
};

export const QuoteDescription = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <p className={cn("text-xs font-normal text-[#6B7280] max-w-sm", className)}>
      {children}
    </p>
  );
};

interface Testimonial {
  src: string;
  quote: string;
  name: string;
  designation?: string;
}

export const testimonials: Testimonial[] = [
  {
    name: "Sarah M.",
    quote:
      "Bayes made calculus click for me! The AI explanations were exactly what I needed to understand derivatives.",
    src: "https://i.pravatar.cc/150?img=1",
    designation: "College Sophomore",
  },
  {
    name: "Marcus L.",
    quote:
      "I went from failing calculus to getting A's. The personalized approach really works.",
    src: "https://i.pravatar.cc/150?img=2",
    designation: "High School Senior",
  },
  {
    name: "Emma K.",
    quote:
      "The interactive chat feature feels like having a patient tutor available 24/7. Game changer!",
    src: "https://i.pravatar.cc/150?img=3",
    designation: "Engineering Student",
  },
  {
    name: "James R.",
    quote:
      "Finally, a calculus tutor that adapts to my learning style. Bayes helped me master integration techniques.",
    src: "https://i.pravatar.cc/150?img=4",
    designation: "Pre-Med Student",
  },
  {
    name: "Aisha P.",
    quote:
      "The step-by-step explanations are incredible. I understand limits and continuity like never before.",
    src: "https://i.pravatar.cc/150?img=5",
    designation: "Mathematics Major",
  },
  {
    name: "David C.",
    quote:
      "Bayes turned my calculus nightmare into a manageable subject. The AI knows exactly how to explain complex concepts.",
    src: "https://i.pravatar.cc/150?img=6",
    designation: "Computer Science Student",
  },
  {
    name: "Lily T.",
    quote:
      "The practice problems adapt to my skill level. I'm finally confident in my calculus abilities.",
    src: "https://i.pravatar.cc/150?img=7",
    designation: "Physics Student",
  },
  {
    name: "Michael H.",
    quote:
      "Best investment in my education. Bayes helped me ace my calculus final exam.",
    src: "https://i.pravatar.cc/150?img=8",
    designation: "Business Student",
  },
  {
    name: "Sophia W.",
    quote:
      "The AI tutor never gets impatient, no matter how many times I ask the same question. Perfect for learning.",
    src: "https://i.pravatar.cc/150?img=9",
    designation: "Biology Student",
  },
  {
    name: "Ryan J.",
    quote:
      "Bayes made optimization problems actually fun to solve. Who knew calculus could be enjoyable?",
    src: "https://i.pravatar.cc/150?img=10",
    designation: "Economics Student",
  },
  {
    name: "Zoe L.",
    quote:
      "The visual explanations for derivatives and integrals are amazing. I'm a visual learner and this works perfectly.",
    src: "https://i.pravatar.cc/150?img=11",
    designation: "Art & Sciences Student",
  },
  {
    name: "Alex M.",
    quote:
      "From struggling with basic limits to mastering advanced calculus concepts. Bayes is a lifesaver.",
    src: "https://i.pravatar.cc/150?img=12",
    designation: "Engineering Student",
  },
  {
    name: "Maya S.",
    quote:
      "The personalized learning path helped me build confidence in calculus step by step. Highly recommended!",
    src: "https://i.pravatar.cc/150?img=13",
    designation: "Chemistry Student",
  },
  {
    name: "Jordan B.",
    quote:
      "Bayes helped me understand the practical applications of calculus. Now I see how it connects to real-world problems.",
    src: "https://i.pravatar.cc/150?img=14",
    designation: "Applied Mathematics Student",
  },
];

export const TestimonialsSlider = () => {
  const [active, setActive] = useState<number>(0);
  const [autorotate, setAutorotate] = useState<boolean>(true);
  const testimonialsRef = useRef<HTMLDivElement>(null);

  const slicedTestimonials = testimonials.slice(0, 3);

  useEffect(() => {
    if (!autorotate) return;
    const interval = setInterval(() => {
      setActive(
        active + 1 === slicedTestimonials.length ? 0 : (active) => active + 1,
      );
    }, 7000);
    return () => clearInterval(interval);
  }, [active, autorotate, slicedTestimonials.length]);

  const heightFix = () => {
    if (testimonialsRef.current && testimonialsRef.current.parentElement)
      testimonialsRef.current.parentElement.style.height = `${testimonialsRef.current.clientHeight}px`;
  };

  useEffect(() => {
    heightFix();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        heightFix();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <section className="absolute inset-0 mt-20 md:mt-60">
      <div className="max-w-3xl mx-auto  relative z-40 h-80">
        <div className="relative pb-12 md:pb-20">
          {/* Particles animation */}

          {/* Carousel */}
          <div className="text-center">
            {/* Testimonial image */}
            <div className="relative h-40 [mask-image:_linear-gradient(0deg,transparent,#FFFFFF_30%,#FFFFFF)] md:[mask-image:_linear-gradient(0deg,transparent,#FFFFFF_40%,#FFFFFF)]">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[480px] h-[480px] -z-10 pointer-events-none before:rounded-full rounded-full before:absolute before:inset-0 before:bg-gradient-to-b before:from-[#10B981]/20 before:to-transparent before:to-20% after:rounded-full after:absolute after:inset-0 after:bg-white after:m-px before:-z-20 after:-z-20">
                {slicedTestimonials.map((item, index) => (
                  <Transition
                    key={index}
                    show={active === index}
                    enter="transition ease-&lsqb;cubic-bezier(0.68,-0.3,0.32,1)&rsqb; duration-700 order-first"
                    enterFrom="opacity-0 -translate-x-10"
                    enterTo="opacity-100 translate-x-0"
                    leave="transition ease-&lsqb;cubic-bezier(0.68,-0.3,0.32,1)&rsqb; duration-700"
                    leaveFrom="opacity-100 translate-x-0"
                    leaveTo="opacity-0 translate-x-10"
                    beforeEnter={() => heightFix()}
                    as="div"
                  >
                    <div className="absolute inset-0 h-full -z-10">
                      <Image
                        className="relative top-11 left-1/2 -translate-x-1/2 rounded-full"
                        src={item.src}
                        width={56}
                        height={56}
                        alt={item.name}
                      />
                    </div>
                  </Transition>
                ))}
              </div>
            </div>
            {/* Text */}
            <div className="mb-10 transition-all duration-150 delay-300 ease-in-out px-8 sm:px-6">
              <div className="relative flex flex-col" ref={testimonialsRef}>
                {slicedTestimonials.map((item, index) => (
                  <Transition
                    key={index}
                    show={active === index}
                    enter="transition ease-in-out duration-500 delay-200 order-first"
                    enterFrom="opacity-0 -translate-x-4"
                    enterTo="opacity-100 translate-x-0"
                    leave="transition ease-out duration-300 delay-300 absolute"
                    leaveFrom="opacity-100 translate-x-0"
                    leaveTo="opacity-0 translate-x-4"
                    beforeEnter={() => heightFix()}
                    as="div"
                  >
                    <div className="text-base text-[#6B7280] md:text-xl font-bold">
                      {item.quote}
                    </div>
                  </Transition>
                ))}
              </div>
            </div>
            {/* Buttons */}
            <div className="flex flex-wrap justify-center -m-1.5 px-8 sm:px-6">
              {slicedTestimonials.map((item, index) => (
                <button
                  className={cn(
                    `px-2 py-1 rounded-full m-1.5 text-xs border transition duration-150 ease-in-out font-[var(--font-inter)] ${
                      active === index
                        ? "border-primary bg-primary text-white"
                        : "border-border bg-card text-[#6B7280] hover:border-primary/50"
                    }`,
                  )}
                  key={index}
                  onClick={() => {
                    setActive(index);
                    setAutorotate(false);
                  }}
                >
                  <span className="relative">
                    <span className="font-bold">{item.name}</span>{" "}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
