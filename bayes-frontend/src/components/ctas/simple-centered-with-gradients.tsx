"use client";

import Link from "next/link";

export default function SimpleCenteredWithGradient() {
  return (
    <div className="relative isolate overflow-hidden bg-white">
      {/* Mathematical pattern background */}
      <div className="absolute inset-0 -z-10 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100" />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d1d5db' fill-opacity='0.3'%3E%3Ctext x='5' y='15' font-family='serif' font-size='12'%3E∫%3C/text%3E%3Ctext x='25' y='30' font-family='serif' font-size='10'%3Edx%3C/text%3E%3Ctext x='40' y='45' font-family='serif' font-size='8'%3E∂y%3C/text%3E%3Ctext x='10' y='50' font-family='serif' font-size='9'%3Elim%3C/text%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-4xl font-bold tracking-tight text-balance text-primary sm:text-5xl">
            Ready to Excel in Mathematics?
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg/8 text-pretty text-foreground font-[var(--font-inter)]">
            Join students who are mastering mathematics with Bayes AI tutoring.
            Start your free trial today and experience personalized learning
            like never before.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
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
      </div>
    </div>
  );
}
