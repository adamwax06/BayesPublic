import Image from "next/image";
import Link from "next/link";
import React from "react";
import { Instagram, Twitter } from "lucide-react";

export function SimpleFooterWithFourGrids() {
  return (
    <div className="border-t border-gray-200 bg-white pb-8 py-12 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-6 md:space-y-0">
          {/* Left Side: Logo + Copyright */}
          <div className="flex flex-col space-y-2">
            <div className="flex items-center space-x-3">
              <div className="relative h-6 w-6">
                <Image
                  src="/icons/favicon-192.png"
                  alt="Bayes Logo"
                  width={24}
                  height={24}
                  className="rounded-lg"
                />
              </div>
              <span className="font-bold text-lg text-black">Bayes</span>
            </div>
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} Bayes. All rights reserved.
            </p>
          </div>

          {/* Right Side: Social Media & Legal Links */}
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-12">
            <div className="flex items-center space-x-4">
              <Link
                href="https://instagram.com/trybayes"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-black transition-colors duration-200"
                aria-label="Instagram"
              >
                <Instagram size={20} />
              </Link>
              <Link
                href="https://twitter.com/trybayes"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 hover:text-black transition-colors duration-200"
                aria-label="Twitter"
              >
                <Twitter size={20} />
              </Link>
              <Link
                href="/privacy"
                className="hover:text-black transition-colors duration-200 text-sm"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                className="hover:text-black transition-colors duration-200 text-sm"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
