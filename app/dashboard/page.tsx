//@ts-nocheck
"use client"

import { motion } from "framer-motion"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { BookOpen, Users, MessageSquare, Plus, ArrowRight } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { db } from "@/lib/firebase"
import { collection, query, where, getDocs } from "firebase/firestore"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [communities, setCommunities] = useState([])
  const [subCommunities, setSubCommunities] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // 🔒 Redirect if not logged in
  useEffect(() => {
    if (!user) router.push("/auth")
  }, [user, router])

  // 🔥 Fetch user communities from Firestore
  useEffect(() => {
    const fetchCommunities = async () => {
      if (!user) return
      try {
        setIsLoading(true)

        // 1️⃣ Fetch parent communities where user is a member
        const communitiesRef = collection(db, "communities")
        const communityQuery = query(communitiesRef, where("members", "array-contains", user.id))
        const communitySnap = await getDocs(communityQuery)

        const fetchedCommunities = communitySnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        // 2️⃣ Fetch subcommunities that belong to these parent communities
        const subCommunitiesRef = collection(db, "subCommunities")
        const subQuery = query(subCommunitiesRef, where("members", "array-contains", user.id))
        const subSnap = await getDocs(subQuery)

        const fetchedSubCommunities = subSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))

        setCommunities(fetchedCommunities)
        setSubCommunities(fetchedSubCommunities)
      } catch (error) {
        console.error("Error fetching communities:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchCommunities()
  }, [user])

  if (!user) return null
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen text-muted-foreground">
        Loading your dashboard...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-primary/5">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <h1 className="text-4xl font-bold mb-2">Welcome back, {user.name}! 👋</h1>
          <p className="text-muted-foreground">Here’s what’s happening in your learning journey</p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          className="grid md:grid-cols-3 gap-6 mb-12"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {[
            { icon: Users, label: "Communities", value: communities.length },
            { icon: BookOpen, label: "Subgroups", value: subCommunities.length },
            { icon: MessageSquare, label: "Messages", value: "142" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              className="glass rounded-2xl p-6 hover:bg-white/20 smooth-transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
                <stat.icon className="w-12 h-12 text-primary/50" />
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Communities Section */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Your Communities</h2>
            <Link
              href="/communities"
              className="flex items-center gap-2 px-4 py-2 rounded-lg gradient-primary text-white font-semibold smooth-transition hover:shadow-lg"
            >
              <Plus size={20} />
              Explore More
            </Link>
          </div>

          {communities.length === 0 ? (
            <p className="text-muted-foreground">You haven’t joined any communities yet.</p>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {communities.map((community) => (
                <motion.div
                  key={community.id}
                  variants={itemVariants}
                  className="glass rounded-2xl p-6 hover:bg-white/20 smooth-transition group cursor-pointer"
                >
                  <div className="w-12 h-12 gradient-primary rounded-lg mb-4 group-hover:scale-110 smooth-transition" />
                  <h3 className="text-lg font-semibold mb-2">{community.name}</h3>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{community.members?.length || 0} members</span>
                    <span>{community.subCommunities?.length || 0} subgroups</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Subcommunities Section */}
        <motion.div variants={containerVariants} initial="hidden" animate="visible">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Active Subgroups</h2>
            <Link
              href="/communities"
              className="text-primary font-semibold flex items-center gap-2 hover:gap-3 smooth-transition"
            >
              View All <ArrowRight size={20} />
            </Link>
          </div>

          {subCommunities.length === 0 ? (
            <p className="text-muted-foreground">No subgroups available yet.</p>
          ) : (
            <div className="space-y-4">
              {subCommunities.map((sub) => (
                <motion.div
                  key={sub.id}
                  variants={itemVariants}
                  className="glass rounded-xl p-4 flex items-center justify-between hover:bg-white/20 smooth-transition group cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    <div>
                      <h3 className="font-semibold">{sub.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Parent: {sub.parentCommunityId || "N/A"}
                      </p>
                    </div>
                  </div>
                  <button className="px-4 py-2 rounded-lg bg-primary/20 text-primary font-semibold group-hover:bg-primary/30 smooth-transition">
                    Join
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
