//@ts-nocheck
"use client"

import { motion } from "framer-motion"
import { Navbar } from "@/components/navbar"
import { Search, Plus, Users, MessageSquare, Lock } from "lucide-react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { db } from "@/lib/firebase"
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore"
import { useAuth } from "@/context/auth-context"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
}
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

export default function CommunitiesPage() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [communities, setCommunities] = useState([])
  const [newName, setNewName] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCommunities = async () => {
      const querySnapshot = await getDocs(collection(db, "communities"))
      setCommunities(querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
      setLoading(false)
    }
    fetchCommunities()
  }, [])

  const handleCreate = async () => {
    if (!user) return alert("Login to create a community.")
    await addDoc(collection(db, "communities"), {
      name: newName,
      description: newDesc,
      createdBy: user.id,
      members: [user.id],
      posts: 0,
      createdAt: serverTimestamp(),
      isPrivate: false,
    })
    setShowCreateModal(false)
    setNewName("")
    setNewDesc("")
    // refetch
    const querySnapshot = await getDocs(collection(db, "communities"))
    setCommunities(querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
  }

  const filteredCommunities = communities.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-primary/5">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
          <h1 className="text-4xl font-bold mb-2">Communities</h1>
          <p className="text-muted-foreground">Join or create learning groups</p>
        </motion.div>

        {/* Search and Create */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row gap-4 mb-12">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-muted-foreground" size={20} />
            <input
              type="text"
              placeholder="Search communities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg glass focus:outline-none focus:border-primary/50 smooth-transition"
            />
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 rounded-lg gradient-primary text-white font-semibold flex items-center justify-center gap-2 smooth-transition hover:shadow-lg"
          >
            <Plus size={20} /> Create Community
          </button>
        </motion.div>

        {/* Communities Grid */}
        {loading ? (
          <p>Loading communities...</p>
        ) : (
          <motion.div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6" variants={containerVariants} initial="hidden" animate="visible">
            {filteredCommunities.map((community) => (
              <motion.div key={community.id} variants={itemVariants} className="glass rounded-2xl p-6 hover:bg-white/20 smooth-transition group">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 gradient-primary rounded-lg" />
                  {community.isPrivate && <Lock size={18} className="text-muted-foreground" />}
                </div>
                <h3 className="text-lg font-semibold mb-2">{community.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{community.description}</p>
                <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1"><Users size={16} /><span>{community.members?.length || 0}</span></div>
                  <div className="flex items-center gap-1"><MessageSquare size={16} /><span>{community.posts}</span></div>
                </div>
                <Link href={`/community/${community.id}`} className="w-full py-2 rounded-lg bg-primary/20 text-primary font-semibold text-center smooth-transition">View</Link>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <motion.div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setShowCreateModal(false)}>
            <motion.div className="glass rounded-2xl p-8 max-w-md w-full" initial={{ scale: 0.95 }} animate={{ scale: 1 }} onClick={(e) => e.stopPropagation()}>
              <h2 className="text-2xl font-bold mb-4">Create Community</h2>
              <input
                type="text"
                placeholder="Community name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg glass mb-3"
              />
              <textarea
                placeholder="Description"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full px-4 py-2 rounded-lg glass mb-4 resize-none"
                rows={3}
              />
              <div className="flex gap-4">
                <button onClick={() => setShowCreateModal(false)} className="flex-1 border border-primary/30 px-4 py-2 rounded-lg font-semibold">Cancel</button>
                <button onClick={handleCreate} className="flex-1 px-4 py-2 rounded-lg gradient-primary text-white font-semibold">Create</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
