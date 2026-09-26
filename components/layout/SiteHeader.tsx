"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useCartStore } from "@/store/cart-store";
import { useSession } from "next-auth/react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { usePathname } from "next/navigation";

export function SiteHeader() {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");
  const items = useCartStore((state) => state.items);

  const { data: session } = useSession();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setMounted(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  const count = mounted
    ? items.reduce((total, item) => total + item.quantity, 0)
    : 0;

  const role = session?.user?.role;
  const navLinkClass = `rounded-lg px-3 py-2 text-[#3b241b] transition hover:text-[#9f2f18] ${
    isAdminRoute
      ? "hover:bg-white"
      : "hover:bg-[#f6f8f1] focus-visible:outline-[#9f2f18]"
  }`;

  return (
    <header
      className={`sticky top-0 z-50 border-b shadow-sm backdrop-blur-xl ${
        isAdminRoute
          ? "border-[#ead8c1] bg-[#fff8ee]/92"
          : "border-[#ced8c8] bg-[#eef1e7]/94"
      }`}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-3 lg:flex-row lg:items-center lg:justify-between">
        <Link
          href="/"
          className="group flex items-center justify-center gap-3 text-center font-bold text-[#24130f] transition hover:text-[#9f2f18] lg:justify-start lg:text-left"
        >
          <span
            className={`relative h-20 w-20 overflow-hidden rounded-full border bg-white shadow-sm ${
              isAdminRoute ? "border-[#ead8c1]" : "border-[#ced8c8]"
            }`}
          >
            <Image
              src="/business logo/chef-rah-logo-transparent-180w.png"
              alt=""
              fill
              sizes="48px"
              className="object-contain p-1.5"
              priority
            />
          </span>
          <span className="leading-tight">
            <span className="block text-base">Chef Rah&apos;s</span>
            <span className="block text-sm font-semibold text-[#9f2f18]">
              Twisted Kitchen
            </span>
          </span>
        </Link>

        <nav className="flex flex-wrap items-center justify-center gap-2 text-sm font-semibold lg:justify-end">
          <Link
            href="/menu"
            className={navLinkClass}
          >
            Meal Plans
          </Link>
          <Link
            href="/catering"
            className={navLinkClass}
          >
            Catering
          </Link>
          <Link
            href="/personal-chef"
            className={navLinkClass}
          >
            Personal Chef
          </Link>
          <Link
            href="/gallery"
            className={navLinkClass}
          >
            Gallery
          </Link>
          <Link href="/about" className={navLinkClass}>
            About
          </Link>
          <Link
            href="/cart"
            className={`header-action inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[#24130f] shadow-sm transition hover:border-[#d99426] ${
              isAdminRoute
                ? "border-[#ead8c1] bg-white"
                : "border-[#ced8c8] bg-[#fffaf4]"
            }`}
          >
            Cart
            {count > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#9f2f18] px-1 text-xs text-white">
                {count}
              </span>
            )}
          </Link>

          {session?.user ? (
            <>
              <Link
                href="/account"
                className={navLinkClass}
              >
                Account
              </Link>

              <LogoutButton />
            </>
          ) : (
            <Link
              href="/login"
              className={navLinkClass}
            >
              Sign In
            </Link>
          )}

          {(role === "ADMIN" || role === "OWNER") && (
            <Link
              href="/admin"
              className={`header-action rounded-lg border px-4 py-2 text-sm text-[#24130f] shadow-sm transition hover:border-[#d99426] ${
                isAdminRoute
                  ? "border-[#ead8c1] bg-white"
                  : "border-[#ced8c8] bg-[#fffaf4]"
              }`}
            >
              Admin
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
