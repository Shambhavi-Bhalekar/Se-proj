//@ts-nocheck
"use client"

import { motion } from "framer-motion"
import { Navbar } from "@/components/navbar"
import { MessageSquare, Users, Heart, MessageCircle, Share2, Loader, Video, Plus, ExternalLink } from "lucide-react"
import { useState, useEffect } from "react"
import { db } from "@/lib/firebase"
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore"
import { useAuth } from "@/context/auth-context"
import { useRouter } from "next/navigation"

export default function CommunityClientPage({ communityId }: { communityId: string }) {
  const { user } = useAuth()
  const router = useRouter()

  const [community, setCommunity] = useState(null)
  const [posts, setPosts] = useState([])
  const [studyRooms, setStudyRooms] = useState([])
  const [newPost, setNewPost] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [members, setMembers] = useState([])
  const [joinStatus, setJoinStatus] = useState<"none" | "joined" | "pending">("none")
  const [showRoomModal, setShowRoomModal] = useState(false)
  const [newRoomName, setNewRoomName] = useState("")
  const [newRoomDescription, setNewRoomDescription] = useState("")

  // 🔥 Realtime community listener
  useEffect(() => {
    if (!communityId) return
    const ref = doc(db, "communities", communityId)
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data()
        setCommunity(data)
        setMembers(data.members || [])

        if (user) {
          if (data.members?.includes(user.id)) setJoinStatus("joined")
          else if (data.joinRequests?.includes(user.id)) setJoinStatus("pending")
          else setJoinStatus("none")
        }
      }
    })
    return () => unsub()
  }, [communityId, user])

  // 🔗 Realtime posts
  useEffect(() => {
    if (!communityId) return
    const postsRef = collection(db, "communities", communityId, "posts")
    const q = query(postsRef, orderBy("createdAt", "desc"))
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
    })
    return () => unsub()
  }, [communityId])

  // 📺 Realtime Study Rooms
  useEffect(() => {
    if (!communityId) return
    const roomsRef = collection(db, "communities", communityId, "studyRooms")
    const q = query(roomsRef, orderBy("createdAt", "desc"))
    const unsub = onSnapshot(q, (snap) => {
      setStudyRooms(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
    })
    return () => unsub()
  }, [communityId])

  // 🧠 Join Community Handler
  const handleJoinCommunity = async () => {
    if (!user) return alert("Please login first.")

    try {
      const communityRef = doc(db, "communities", communityId)
      const communitySnap = await getDoc(communityRef)

      if (!communitySnap.exists()) {
        alert("Community not found.")
        return
      }

      const data = communitySnap.data()
      const creatorId = data.createdBy

      if (data.members?.includes(user.id)) {
        setJoinStatus("joined")
        return
      }
      if (data.joinRequests?.includes(user.id)) {
        setJoinStatus("pending")
        return
      }

      await updateDoc(communityRef, {
        joinRequests: arrayUnion(user.id),
      })

      const notificationRef = await addDoc(collection(db, "notifications"), {
        userId: creatorId,
        senderId: user.id,
        communityId,
        type: "join_request",
        message: `${user.name || "Someone"} requested to join ${data.name}`,
        timestamp: new Date(),
        read: false,
        communityCreatorId: creatorId,
      })

      await updateDoc(notificationRef, { id: notificationRef.id })

      setJoinStatus("pending")
      alert("Join request sent!")
    } catch (err) {
      console.error("Error joining community:", err)
    }
  }

  // 📝 Create Post
  const handlePost = async () => {
    if (!newPost.trim() || !user) return
    setIsLoading(true)
    try {
      const ref = collection(db, "communities", communityId, "posts")
      const newData = {
        authorId: user.id,
        authorName: user.name || "Anonymous",
        content: newPost,
        likedBy: [],
        comments: [],
        createdAt: serverTimestamp(),
      }
      await addDoc(ref, newData)
      setNewPost("")
    } finally {
      setIsLoading(false)
    }
  }

  // 🎥 Create Study Room
  const handleCreateRoom = async () => {
    if (!newRoomName.trim() || !user) return
    setIsLoading(true)
    try {
      const ref = collection(db, "communities", communityId, "studyRooms")
      const newData = {
        name: newRoomName,
        description: newRoomDescription,
        creatorId: user.id,
        creatorName: user.name || "Anonymous",
        participants: [],
        isActive: true,
        createdAt: serverTimestamp(),
      }
      await addDoc(ref, newData)
      setNewRoomName("")
      setNewRoomDescription("")
      setShowRoomModal(false)
      alert("Study room created!")
    } catch (err) {
      console.error("Error creating room:", err)
    } finally {
      setIsLoading(false)
    }
  }

  // 🗑️ Delete Study Room
  const handleDeleteRoom = async (roomId: string, creatorId: string) => {
    if (user?.id !== creatorId) return alert("Only the creator can delete this room.")
    if (!confirm("Delete this study room?")) return
    
    try {
      await deleteDoc(doc(db, "communities", communityId, "studyRooms", roomId))
    } catch (err) {
      console.error("Error deleting room:", err)
    }
  }

  // ❤️ Like Toggle
  const toggleLike = async (postId, liked) => {
    if (!user) return
    const ref = doc(db, "communities", communityId, "posts", postId)
    await updateDoc(ref, {
      likedBy: liked ? arrayRemove(user.id) : arrayUnion(user.id),
    })
  }

  if (!community)
    return (
      <div className="flex justify-center items-center h-screen text-muted-foreground">
        Loading community...
      </div>
    )

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* 🏠 Community Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-8 mb-12"
        >
          <div className="flex justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">{community.name}</h1>
              <p className="text-muted-foreground">
                {community.description || "No description provided"}
              </p>
            </div>

            <button
              onClick={joinStatus === "none" ? handleJoinCommunity : undefined}
              disabled={joinStatus !== "none"}
              className={`px-6 py-2 rounded-lg font-semibold ${
                joinStatus === "joined"
                  ? "bg-green-600 text-white"
                  : joinStatus === "pending"
                  ? "bg-yellow-500 text-white"
                  : "gradient-primary text-white"
              }`}
            >
              {joinStatus === "joined"
                ? "Joined"
                : joinStatus === "pending"
                ? "Pending"
                : "Join"}
            </button>
          </div>

          <div className="flex gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <Users size={18} />
              <span>{members.length} members</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare size={18} />
              <span>{posts.length} posts</span>
            </div>
            <div className="flex items-center gap-2">
              <Video size={18} />
              <span>{studyRooms.length} study rooms</span>
            </div>
          </div>
        </motion.div>

        {/* 🎥 Study Rooms Section */}
        {joinStatus === "joined" && (
          <motion.div
            className="glass rounded-2xl p-6 mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Video size={20} /> Study Rooms
              </h2>
              <button
                onClick={() => setShowRoomModal(true)}
                className="px-4 py-2 rounded-lg gradient-primary text-white font-semibold flex items-center gap-2"
              >
                <Plus size={18} /> Create Room
              </button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {studyRooms.map((room) => (
                <div key={room.id} className="p-4 rounded-lg bg-white/10 hover:bg-white/20 transition">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold">{room.name}</h3>
                    {room.isActive && (
                      <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full">Active</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{room.description}</p>
                  <div className="text-xs text-muted-foreground mb-3">
                    Created by {room.creatorName}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/studyroom/${room.id}`)}
                      className="flex-1 px-3 py-2 rounded-lg bg-primary text-white font-semibold flex items-center justify-center gap-2"
                    >
                      <ExternalLink size={16} /> Join
                    </button>
                    {user?.id === room.creatorId && (
                      <button
                        onClick={() => handleDeleteRoom(room.id, room.creatorId)}
                        className="px-3 py-2 rounded-lg bg-red-500 text-white font-semibold"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {studyRooms.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No study rooms yet. Create one to get started!
              </p>
            )}
          </motion.div>
        )}

        {/* Create Room Modal */}
        {showRoomModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass rounded-2xl p-6 max-w-md w-full mx-4"
            >
              <h2 className="text-xl font-bold mb-4">Create Study Room</h2>
              <input
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Room name"
                className="w-full px-4 py-2 rounded-lg glass mb-3"
              />
              <textarea
                value={newRoomDescription}
                onChange={(e) => setNewRoomDescription(e.target.value)}
                placeholder="Description (optional)"
                className="w-full px-4 py-2 rounded-lg glass mb-4"
                rows={3}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRoomModal(false)}
                  className="flex-1 px-4 py-2 rounded-lg bg-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateRoom}
                  disabled={isLoading || !newRoomName.trim()}
                  className="flex-1 px-4 py-2 rounded-lg gradient-primary text-white font-semibold"
                >
                  {isLoading ? <Loader size={18} className="animate-spin mx-auto" /> : "Create"}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 🧵 Post Composer */}
        {joinStatus === "joined" && (
          <motion.div
            className="glass rounded-2xl p-6 mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="Share something..."
              disabled={isLoading}
              className="w-full px-4 py-3 rounded-lg glass mb-4"
              rows={3}
            />
            <div className="flex justify-end">
              <button
                onClick={handlePost}
                disabled={isLoading || !newPost.trim()}
                className="px-6 py-2 rounded-lg gradient-primary text-white font-semibold flex items-center gap-2"
              >
                {isLoading && <Loader size={18} className="animate-spin" />}
                {isLoading ? "Posting..." : "Post"}
              </button>
            </div>
          </motion.div>
        )}

        {/* 🗞️ Posts Feed */}
        <div className="space-y-4">
          {posts.map((post, i) => {
            const liked = post.likedBy?.includes(user?.id)
            return (
              <motion.div
                key={post.id}
                className="glass rounded-2xl p-6 hover:bg-white/20"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <h3 className="font-semibold">{post.authorName}</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {post.createdAt?.toDate?.().toLocaleString?.() || "just now"}
                </p>
                <p className="mb-4">{post.content}</p>
                <div className="flex gap-6 text-muted-foreground">
                  <button
                    onClick={() => toggleLike(post.id, liked)}
                    className={`flex items-center gap-2 ${
                      liked ? "text-red-500" : "hover:text-primary"
                    }`}
                  >
                    <Heart size={18} fill={liked ? "currentColor" : "none"} />
                    <span>{post.likedBy?.length || 0}</span>
                  </button>
                  <button className="flex items-center gap-2 hover:text-primary">
                    <MessageCircle size={18} />
                    <span>{post.comments?.length || 0}</span>
                  </button>
                  <button className="flex items-center gap-2 hover:text-primary">
                    <Share2 size={18} />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}