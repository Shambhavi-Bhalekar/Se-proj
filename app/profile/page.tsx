//@ts-nocheck
"use client"

import { motion } from "framer-motion"
import { useAuth } from "@/context/auth-context"
import { Navbar } from "@/components/navbar"
import { Mail, MapPin, Calendar, Edit2, Save, Loader } from "lucide-react"
import { useEffect, useState } from "react"
import { db } from "@/lib/firebase"
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  getDocs,
} from "firebase/firestore"

export default function ProfilePage() {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [communityCount, setCommunityCount] = useState(0)
  const [joinedCommunities, setJoinedCommunities] = useState([])
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    bio: "",
    location: "",
    joinedAt: null,
  })

  // 🔥 Fetch user data from Firestore
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id) return
      setIsLoading(true)
      try {
        const userRef = doc(db, "users", user.id)
        const userSnap = await getDoc(userRef)
        if (userSnap.exists()) {
          setFormData({
            name: userSnap.data().name || user.name || "",
            email: userSnap.data().email || user.email || "",
            bio: userSnap.data().bio || "Passionate learner and developer",
            location: userSnap.data().location || "Unknown",
            joinedAt: userSnap.data().joinedAt?.toDate?.() || new Date(),
          })
        } else {
          setFormData({
            name: user.name || "",
            email: user.email || "",
            bio: "Passionate learner and developer",
            location: "Unknown",
            joinedAt: new Date(),
          })
        }
      } catch (err) {
        console.error("Error fetching user data:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserData()
  }, [user])

  // 📊 Fetch communities the user has joined
  useEffect(() => {
    const fetchUserCommunities = async () => {
      if (!user?.id) return
      try {
        const communitiesRef = collection(db, "communities")
        const snapshot = await getDocs(communitiesRef)
        const joined = snapshot.docs
          .filter((doc) => (doc.data().members || []).includes(user.id))
          .map((doc) => ({
            id: doc.id,
            name: doc.data().name,
            description: doc.data().description || "",
          }))
        setJoinedCommunities(joined)
        setCommunityCount(joined.length)
      } catch (err) {
        console.error("Error fetching user communities:", err)
      }
    }

    fetchUserCommunities()
  }, [user])

  // 💾 Save user data to Firestore
  const handleSave = async () => {
    if (!user?.id) return
    setIsSaving(true)
    try {
      const userRef = doc(db, "users", user.id)
      await updateDoc(userRef, {
        name: formData.name,
        email: formData.email,
        bio: formData.bio,
        location: formData.location,
        updatedAt: serverTimestamp(),
      })
      setIsEditing(false)
    } catch (err) {
      console.error("Error saving user data:", err)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen text-muted-foreground">
        <Loader className="animate-spin mr-2" /> Loading profile...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-primary/5">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Profile Header */}
        <motion.div
          className="glass rounded-2xl p-8 mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6">
            <div className="flex items-center gap-6 mb-6 sm:mb-0">
              <div className="w-24 h-24 gradient-primary rounded-full" />
              <div>
                <h1 className="text-3xl font-bold">{formData.name}</h1>
                <p className="text-muted-foreground">Student</p>
              </div>
            </div>
            <button
              onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2 rounded-lg gradient-primary text-white font-semibold smooth-transition hover:shadow-lg disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader size={20} className="animate-spin" /> Saving...
                </>
              ) : isEditing ? (
                <>
                  <Save size={20} /> Save
                </>
              ) : (
                <>
                  <Edit2 size={20} /> Edit Profile
                </>
              )}
            </button>
          </div>

          {isEditing ? (
            <div className="space-y-4">
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 rounded-lg glass focus:outline-none focus:border-primary/50 smooth-transition"
              />
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full px-4 py-2 rounded-lg glass focus:outline-none focus:border-primary/50 smooth-transition resize-none"
                rows={3}
              />
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-2 rounded-lg glass focus:outline-none focus:border-primary/50 smooth-transition"
              />
            </div>
          ) : (
            <>
              <p className="text-muted-foreground mb-4">{formData.bio}</p>
              <div className="flex flex-col sm:flex-row gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Mail size={18} className="text-primary" />
                  <span>{formData.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-primary" />
                  <span>{formData.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={18} className="text-primary" />
                  <span>
                    Joined{" "}
                    {formData.joinedAt
                      ? new Date(formData.joinedAt).toLocaleDateString()
                      : "Recently"}
                  </span>
                </div>
              </div>
            </>
          )}
        </motion.div>

        {/* Stats Section */}
        <motion.div
          className="grid md:grid-cols-3 gap-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {[
            { label: "Communities", value: communityCount.toString() },
            { label: "Study Hours", value: "24.5" },
            { label: "Posts", value: "18" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              className="glass rounded-2xl p-6 text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + i * 0.05 }}
            >
              <p className="text-3xl font-bold gradient-primary bg-clip-text text-transparent mb-2">
                {stat.value}
              </p>
              <p className="text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Communities Section */}
        <motion.div
          className="glass rounded-2xl p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-2xl font-bold mb-6">Your Communities</h2>
          {joinedCommunities.length > 0 ? (
            <div className="space-y-3">
              {joinedCommunities.map((community, i) => (
                <motion.div
                  key={community.id}
                  className="flex items-center justify-between p-4 rounded-lg hover:bg-white/10 smooth-transition"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.05 }}
                >
                  <div className="flex flex-col">
                    <span className="font-semibold">{community.name}</span>
                    <p className="text-sm text-muted-foreground truncate max-w-xs">
                      {community.description || "No description available"}
                    </p>
                  </div>
                  <a
                    href={`/community/${community.id}`}
                    className="text-primary font-semibold hover:underline"
                  >
                    View
                  </a>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-6">
              You haven't joined any communities yet.
            </p>
          )}
        </motion.div>
      </div>
    </div>
  )
}
