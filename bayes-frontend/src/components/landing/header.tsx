"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const navigation = [
  {
    title: "Pricing",
    href: "/pricing",
  },
  {
    title: "Learn",
    href: "/learn",
  },
];

export function Header() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const { signInWithGoogle, user, signOut } = useAuth();

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Sign in error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full pt-3 transition-all duration-300",
        inter.className,
      )}
    >
      <div
        className={cn(
          "mx-auto rounded-full border border-gray-200/50 backdrop-blur-md transition-all duration-300",
          isScrolled
            ? "bg-white/60 shadow-lg max-w-7xl"
            : "bg-white/95 max-w-6xl",
        )}
      >
        <div className="container flex h-14 items-center justify-between px-6">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center space-x-3 transition-all duration-200 hover:scale-105"
          >
            <Image
              src="/icons/favicon-192.png"
              alt="Bayes Logo"
              width={32}
              height={32}
              className="rounded-xl"
            />
            <span className="hidden font-bold text-xl text-black tracking-tight sm:inline-block">
              Bayes
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-1">
            <NavigationMenu>
              <NavigationMenuList className="space-x-1">
                {navigation.map((item) => (
                  <NavigationMenuItem key={item.title}>
                    <NavigationMenuLink asChild>
                      <Link
                        href={item.href}
                        className="group inline-flex h-9 w-max items-center justify-center rounded-full bg-transparent px-5 py-2 text-sm font-medium text-gray-700 transition-all duration-200 hover:bg-gray-100 hover:text-black hover:shadow-sm focus:bg-gray-100 focus:text-black focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                      >
                        {item.title}
                      </Link>
                    </NavigationMenuLink>
                  </NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex md:items-center md:space-x-3">
            {user ? (
              <div className="flex items-center space-x-2">
                {user.user_metadata?.avatar_url && (
                  <Image
                    src={user.user_metadata.avatar_url}
                    alt="Profile"
                    width={28}
                    height={28}
                    className="rounded-full"
                  />
                )}
                <Button
                  onClick={handleSignOut}
                  disabled={isLoading}
                  variant="outline"
                  size="sm"
                  className="rounded-full px-3 py-1 text-sm font-medium transition-all duration-200 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Signing out..." : "Sign Out"}
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                variant="outline"
                size="sm"
                className="rounded-full px-3 py-1 text-sm font-medium transition-all duration-200 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Signing in..." : "Sign in"}
              </Button>
            )}
            <Button
              asChild
              size="sm"
              className="rounded-full bg-black text-white hover:bg-gray-800 px-4 py-1 font-medium transition-all duration-200 hover:shadow-lg hover:scale-105"
            >
              <Link href="/learn">Get Started</Link>
            </Button>
          </div>

          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                className="mr-2 h-9 w-9 rounded-full text-base hover:bg-gray-100 focus-visible:bg-gray-100 focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden transition-all duration-200"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="pr-0 rounded-l-3xl">
              <div className="flex flex-col space-y-6 py-6">
                <Link
                  href="/"
                  className="flex items-center space-x-3 pb-6 transition-all duration-200 hover:scale-105"
                  onClick={() => setIsOpen(false)}
                >
                  <div className="relative h-10 w-10">
                    <Image
                      src="/icons/favicon-192.png"
                      alt="Bayes Logo"
                      width={40}
                      height={40}
                      className="rounded-xl shadow-sm"
                    />
                  </div>
                  <span className="font-bold text-2xl text-black tracking-tight">
                    Bayes
                  </span>
                </Link>

                <div className="flex flex-col space-y-2">
                  {navigation.map((item) => (
                    <Link
                      key={item.title}
                      href={item.href}
                      className="text-base font-medium text-gray-700 transition-all duration-200 hover:text-black hover:bg-gray-50 rounded-full px-4 py-3"
                      onClick={() => setIsOpen(false)}
                    >
                      {item.title}
                    </Link>
                  ))}
                </div>

                <div className="flex flex-col space-y-4 pt-6">
                  {user ? (
                    <div className="flex flex-col space-y-3">
                      {user.user_metadata?.avatar_url && (
                        <Image
                          src={user.user_metadata.avatar_url}
                          alt="Profile"
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                      )}
                      <Button
                        onClick={handleSignOut}
                        disabled={isLoading}
                        variant="outline"
                        className="rounded-full px-4 py-3 text-sm font-medium transition-all duration-200 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? "Signing out..." : "Sign Out"}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={handleGoogleSignIn}
                      disabled={isLoading}
                      variant="outline"
                      className="rounded-full px-4 py-3 text-sm font-medium transition-all duration-200 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? "Signing in..." : "Sign in"}
                    </Button>
                  )}
                  <Button
                    asChild
                    className="rounded-full bg-black text-white hover:bg-gray-800 px-6 py-3 font-medium transition-all duration-200 hover:shadow-lg"
                  >
                    <Link href="/learn" onClick={() => setIsOpen(false)}>
                      Get Started
                    </Link>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
