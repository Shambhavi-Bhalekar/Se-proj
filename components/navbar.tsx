//@ts-nocheck
"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTheme } from "@/context/theme-context"
import { motion } from "framer-motion"
import { Menu, X, LogOut, User, Moon, Sun } from "lucide-react"
import { useEffect, useState } from "react"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged, signOut, type User } from "firebase/auth"

export function Navbar() {
  // ────── Auth (direct from Firebase) ──────
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u))
    return () => unsub()
  }, [])

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/auth") // 👈 Redirect to /auth after logout
    } catch (e) {
      console.error("Logout error:", e)
    }
  }

  // ────── Theme ──────
  const { isDark, toggleTheme } = useTheme()

  // ────── Mobile menu ──────
  const [isOpen, setIsOpen] = useState(false)

  // Helper to show a friendly name
  const displayName = user?.displayName || user?.email?.split("@")[0] || "User"

  return (
    <motion.nav
      className="sticky top-0 z-50 glass border-b border-primary/10"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center text-white font-bold">
              SB
            </div>
            <span className="font-bold text-lg hidden sm:inline">StudyBuddy</span>
          </Link>

          {/* ────── Desktop Menu ────── */}
          <div className="hidden md:flex items-center gap-8">
            {user ? (
              <>
                <Link href="/dashboard" className="smooth-transition hover:text-primary">
                  Dashboard
                </Link>
                <Link href="/communities" className="smooth-transition hover:text-primary">
                  Communities
                </Link>
                <Link href="/notifications" className="smooth-transition hover:text-primary">
                  Notifications
                </Link>

                <div className="flex items-center gap-4">
                  {/* Profile */}
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 smooth-transition hover:text-primary"
                  >
                    <User size={20} />
                    <span className="text-sm">{displayName}</span>
                  </Link>

                  {/* Theme toggle */}
                  <button
                    onClick={toggleTheme}
                    className="p-2 rounded-lg hover:bg-primary/10 smooth-transition"
                    aria-label="Toggle dark mode"
                  >
                    {isDark ? <Sun size={20} /> : <Moon size={20} />}
                  </button>

                  {/* Logout */}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 smooth-transition"
                  >
                    <LogOut size={18} />
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link href="/auth" className="smooth-transition hover:text-primary">
                  Login
                </Link>

                {/* Theme toggle (guest) */}
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg hover:bg-primary/10 smooth-transition"
                  aria-label="Toggle dark mode"
                >
                  {isDark ? <Sun size={20} /> : <Moon size={20} />}
                </button>

                <Link
                  href="/auth"
                  className="px-6 py-2 rounded-lg gradient-primary text-white font-semibold smooth-transition hover:shadow-lg hover:shadow-primary/50"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* ────── Mobile controls ────── */}
          <div className="md:hidden flex items-center gap-2">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-primary/10 smooth-transition"
              aria-label="Toggle dark mode"
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Hamburger */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg hover:bg-primary/10 smooth-transition"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* ────── Mobile Menu ────── */}
        {isOpen && (
          <motion.div
            className="md:hidden pb-4 space-y-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="block px-4 py-2 rounded-lg hover:bg-primary/10 smooth-transition"
                >
                  Dashboard
                </Link>
                <Link
                  href="/communities"
                  className="block px-4 py-2 rounded-lg hover:bg-primary/10 smooth-transition"
                >
                  Communities
                </Link>
                <Link
                  href="/notifications"
                  className="block px-4 py-2 rounded-lg hover:bg-primary/10 smooth-transition"
                >
                  Notifications
                </Link>
                <Link
                  href="/profile"
                  className="block px-4 py-2 rounded-lg hover:bg-primary/10 smooth-transition"
                >
                  Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 smooth-transition"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth"
                  className="block px-4 py-2 rounded-lg hover:bg-primary/10 smooth-transition"
                >
                  Login
                </Link>
                <Link
                  href="/auth"
                  className="block px-4 py-2 rounded-lg gradient-primary text-white font-semibold smooth-transition"
                >
                  Sign Up
                </Link>
              </>
            )}
          </motion.div>
        )}
      </div>
    </motion.nav>
  )
}
