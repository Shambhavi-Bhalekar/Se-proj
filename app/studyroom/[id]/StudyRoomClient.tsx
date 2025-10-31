//@ts-nocheck
"use client"

import { motion } from "framer-motion"
import { Navbar } from "@/components/navbar"
import { Send, Users, Loader, ArrowLeft, Heart } from "lucide-react"
import { useState, useEffect, useRef, useMemo } from "react"
import { useSocket } from "@/context/socket-context"
import { useAuth } from "@/context/auth-context"
import { db } from "@/lib/firebase"
import {
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  addDoc,
  query,
  orderBy,
  serverTimestamp,
  getDocs,
} from "firebase/firestore"
import { useRouter } from "next/navigation"

export default function StudyRoomClient({ roomId }: { roomId: string }) {
  const router = useRouter()
  const { emit, isConnected } = useSocket()
  const { user } = useAuth()

  const [isLoading, setIsLoading] = useState(false)
  const [roomData, setRoomData] = useState(null)
  const [communityId, setCommunityId] = useState(null)
  const [participants, setParticipants] = useState([])
  const [activeTab, setActiveTab] = useState<"chat" | "discussion" | "resources">("chat")

  // Chat
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const chatEndRef = useRef(null)

  // 🔥 Load room data
  useEffect(() => {
    const loadRoomData = async () => {
      try {
        const communitiesRef = collection(db, "communities")
        const communitiesSnap = await getDocs(communitiesRef)
        for (const communityDoc of communitiesSnap.docs) {
          const roomRef = doc(db, "communities", communityDoc.id, "studyRooms", roomId)
          const roomSnap = await getDoc(roomRef)
          if (roomSnap.exists()) {
            setRoomData(roomSnap.data())
            setCommunityId(communityDoc.id)

            // Real-time room updates
            const unsub = onSnapshot(roomRef, async (snap) => {
              if (snap.exists()) {
                const data = snap.data()
                let list = data.participantsList || []

                // 🧩 Remove duplicates (keep unique by `id`)
                const uniqueParticipants = Array.from(
                  new Map(list.map((p) => [p.id, p])).values()
                )
                setParticipants(uniqueParticipants)

                // Optional: fix Firestore data if duplicates exist
                if (list.length !== uniqueParticipants.length) {
                  await updateDoc(roomRef, {
                    participantsList: uniqueParticipants,
                  })
                }

                setRoomData(data)
              }
            })
            return () => unsub()
          }
        }
      } catch (err) {
        console.error("Error loading room:", err)
      }
    }
    loadRoomData()
  }, [roomId])

  // 💬 Real-time Chat Messages
  useEffect(() => {
    if (!communityId) return
    const messagesRef = collection(db, "communities", communityId, "studyRooms", roomId, "messages")
    const q = query(messagesRef, orderBy("createdAt", "asc"))
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
    })
    return () => unsub()
  }, [communityId, roomId])

  // 👥 Join / Leave room
  useEffect(() => {
    if (isConnected && user && communityId) {
      emit("room:join", { roomId, userId: user.id })

      const roomRef = doc(db, "communities", communityId, "studyRooms", roomId)
      const participantData = {
        id: user.id,
        name: user.displayName || user.name || "Anonymous",
        status: "active",
        joinedAt: new Date().toISOString(),
      }

      updateDoc(roomRef, {
        participants: arrayUnion(user.id),
        participantsList: arrayUnion(participantData),
      })
    }

    return () => {
      if (user && communityId) {
        emit("room:leave", { roomId, userId: user.id })
        const roomRef = doc(db, "communities", communityId, "studyRooms", roomId)
        updateDoc(roomRef, {
          participants: arrayRemove(user.id),
        })
      }
    }
  }, [isConnected, roomId, emit, user, communityId])

  // 💬 Send Chat Message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !communityId) return
    setIsLoading(true)
    try {
      const ref = collection(db, "communities", communityId, "studyRooms", roomId, "messages")
      await addDoc(ref, {
        senderId: user.id,
        senderName: user.displayName || user.name || "Anonymous",
        content: newMessage,
        createdAt: serverTimestamp(),
        likes: [], // 👈 initialize empty likes array
      })
      setNewMessage("")
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
    } finally {
      setIsLoading(false)
    }
  }

  // ❤️ Like / Unlike a message
  const toggleLikeMessage = async (messageId: string, likedBy: string[]) => {
    if (!user || !communityId) return
    const msgRef = doc(db, "communities", communityId, "studyRooms", roomId, "messages", messageId)
    const hasLiked = likedBy?.includes(user.id)
    try {
      await updateDoc(msgRef, {
        likes: hasLiked ? arrayRemove(user.id) : arrayUnion(user.id),
      })
    } catch (error) {
      console.error("Error updating like:", error)
    }
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  if (!roomData) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader className="animate-spin" size={32} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* ---------- MAIN CONTENT ---------- */}
          <motion.div
            className="lg:col-span-3 glass rounded-2xl p-6 flex flex-col"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => communityId && router.push(`/community/${communityId}`)}
                  className="p-2 rounded-lg hover:bg-white/10"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h1 className="text-2xl font-bold">{roomData.name}</h1>
                  {roomData.description && (
                    <p className="text-sm text-muted-foreground">{roomData.description}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-white/10">
              <button
                onClick={() => setActiveTab("chat")}
                className={`pb-3 px-4 font-semibold ${
                  activeTab === "chat"
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                💬 Chat
              </button>
              <button
                onClick={() => setActiveTab("discussion")}
                className={`pb-3 px-4 font-semibold ${
                  activeTab === "discussion"
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                📝 Discussions
              </button>
              <button
                onClick={() => setActiveTab("resources")}
                className={`pb-3 px-4 font-semibold ${
                  activeTab === "resources"
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                📚 Resources
              </button>
            </div>

            {/* Chat Tab */}
            {activeTab === "chat" && (
              <div className="flex flex-col flex-1">
                <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 max-h-[500px]">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3 rounded-lg max-w-[75%] ${
                        msg.senderId === user?.id ? "ml-auto bg-primary/20" : "bg-white/10"
                      }`}
                    >
                      <p className="text-sm font-semibold">{msg.senderName}</p>
                      <p>{msg.content}</p>

                      <div className="flex items-center justify-between mt-1">
                        <p className="text-[10px] text-muted-foreground">
                          {msg.createdAt?.toDate?.().toLocaleTimeString?.([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          }) || ""}
                        </p>

                        {/* ❤️ Like Button */}
                        <button
                          onClick={() => toggleLikeMessage(msg.id, msg.likes || [])}
                          className={`flex items-center gap-1 text-xs ${
                            msg.likes?.includes(user?.id)
                              ? "text-pink-500"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Heart
                            size={14}
                            fill={msg.likes?.includes(user?.id) ? "currentColor" : "none"}
                          />
                          <span>{msg.likes?.length || 0}</span>
                        </button>
                      </div>
                    </motion.div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder="Type a message..."
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 rounded-lg glass focus:outline-none"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={isLoading || !newMessage.trim()}
                    className="p-2 rounded-lg gradient-primary text-white hover:shadow-lg disabled:opacity-50"
                  >
                    {isLoading ? <Loader size={20} className="animate-spin" /> : <Send size={20} />}
                  </button>
                </div>
              </div>
            )}

            {/* Discussion Tab (placeholder) */}
            {activeTab === "discussion" && (
              <div className="text-center text-muted-foreground py-20">
                📝 Discussion feature coming soon...
              </div>
            )}

            {/* Resources Tab (placeholder) */}
            {activeTab === "resources" && (
              <div className="text-center text-muted-foreground py-20">
                📚 Resource sharing feature coming soon...
              </div>
            )}
          </motion.div>

          {/* ---------- PARTICIPANTS SIDEBAR ---------- */}
          <motion.div
            className="glass rounded-2xl p-6 flex flex-col"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Users size={20} /> Participants ({participants.length})
            </h2>
            <div className="space-y-3 flex-1 overflow-y-auto">
              {participants.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10"
                >
                  <div className="w-10 h-10 rounded-full gradient-primary" />
                  <div>
                    <p className="font-semibold text-sm">{p.name}</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
