//@ts-nocheck
"use client"

import { motion } from "framer-motion"
import { Navbar } from "@/components/navbar"
import { 
  Send, Users, Phone, Video, Settings, Loader, ArrowLeft, 
  Heart, MessageCircle, Share2, Plus, Trash2, Edit 
} from "lucide-react"
import { useState, useEffect } from "react"
import { useSocket } from "@/context/socket-context"
import { useAuth } from "@/context/auth-context"
import { db } from "@/lib/firebase"
import { 
  doc, getDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove,
  collection, addDoc, query, orderBy, deleteDoc, serverTimestamp,
  getDocs
} from "firebase/firestore"
import { useRouter } from "next/navigation"

export default function StudyRoomPage({ params }: { params: { id: string } }) {
  const roomId = params.id
  const router = useRouter()
  const { emit, isConnected } = useSocket()
  const { user } = useAuth()

  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [roomData, setRoomData] = useState(null)
  const [communityId, setCommunityId] = useState(null)
  const [participants, setParticipants] = useState([])
  
  // Discussion Posts
  const [posts, setPosts] = useState([])
  const [newPost, setNewPost] = useState("")
  const [showPostModal, setShowPostModal] = useState(false)
  
  // Resources/Notes
  const [resources, setResources] = useState([])
  const [showResourceModal, setShowResourceModal] = useState(false)
  const [newResourceTitle, setNewResourceTitle] = useState("")
  const [newResourceLink, setNewResourceLink] = useState("")
  const [newResourceDescription, setNewResourceDescription] = useState("")

  // Tab Management
  const [activeTab, setActiveTab] = useState<"chat" | "discussion" | "resources">("chat")

  // 🔥 Load room data from Firestore
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
            
            const unsub = onSnapshot(roomRef, (snap) => {
              if (snap.exists()) {
                const data = snap.data()
                setRoomData(data)
                setParticipants(data.participantsList || [])
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

  // 🔗 Realtime Discussion Posts
  useEffect(() => {
    if (!communityId) return
    const postsRef = collection(db, "communities", communityId, "studyRooms", roomId, "posts")
    const q = query(postsRef, orderBy("createdAt", "desc"))
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
    })
    return () => unsub()
  }, [communityId, roomId])

  // 📚 Realtime Resources
  useEffect(() => {
    if (!communityId) return
    const resourcesRef = collection(db, "communities", communityId, "studyRooms", roomId, "resources")
    const q = query(resourcesRef, orderBy("createdAt", "desc"))
    const unsub = onSnapshot(q, (snap) => {
      setResources(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
    })
    return () => unsub()
  }, [communityId, roomId])

  // Join room and update participants
  useEffect(() => {
    if (isConnected && user && communityId) {
      emit("room:join", { roomId, userId: user.id })
      
      const roomRef = doc(db, "communities", communityId, "studyRooms", roomId)
      
      const participantData = {
        id: user.id,
        name: user.displayName || user.name || "Anonymous",
        status: "active",
        joinedAt: new Date().toISOString()
      }
      
      updateDoc(roomRef, {
        participants: arrayUnion(user.id),
        participantsList: arrayUnion(participantData)
      })
    }

    return () => {
      if (user && communityId) {
        emit("room:leave", { roomId, userId: user?.id })
        
        const roomRef = doc(db, "communities", communityId, "studyRooms", roomId)
        updateDoc(roomRef, {
          participants: arrayRemove(user.id)
        })
      }
    }
  }, [isConnected, roomId, emit, user, communityId])

  // 📝 Create Discussion Post
  const handleCreatePost = async () => {
    if (!newPost.trim() || !user || !communityId) return
    setIsLoading(true)
    try {
      const ref = collection(db, "communities", communityId, "studyRooms", roomId, "posts")
      await addDoc(ref, {
        authorId: user.id,
        authorName: user.displayName || user.name || "Anonymous",
        content: newPost,
        likedBy: [],
        comments: [],
        createdAt: serverTimestamp(),
      })
      setNewPost("")
      setShowPostModal(false)
    } finally {
      setIsLoading(false)
    }
  }

  // ❤️ Toggle Like
  const toggleLike = async (postId: string, liked: boolean) => {
    if (!user || !communityId) return
    const ref = doc(db, "communities", communityId, "studyRooms", roomId, "posts", postId)
    await updateDoc(ref, {
      likedBy: liked ? arrayRemove(user.id) : arrayUnion(user.id),
    })
  }

  // 🗑️ Delete Post
  const handleDeletePost = async (postId: string, authorId: string) => {
    if (user?.id !== authorId) return alert("Only the author can delete this post.")
    if (!confirm("Delete this post?")) return
    
    try {
      await deleteDoc(doc(db, "communities", communityId, "studyRooms", roomId, "posts", postId))
    } catch (err) {
      console.error("Error deleting post:", err)
    }
  }

  // 📚 Add Resource
  const handleAddResource = async () => {
    if (!newResourceTitle.trim() || !user || !communityId) return
    setIsLoading(true)
    try {
      const ref = collection(db, "communities", communityId, "studyRooms", roomId, "resources")
      await addDoc(ref, {
        title: newResourceTitle,
        link: newResourceLink,
        description: newResourceDescription,
        addedBy: user.id,
        addedByName: user.displayName || user.name || "Anonymous",
        createdAt: serverTimestamp(),
      })
      setNewResourceTitle("")
      setNewResourceLink("")
      setNewResourceDescription("")
      setShowResourceModal(false)
    } finally {
      setIsLoading(false)
    }
  }

  // 🗑️ Delete Resource
  const handleDeleteResource = async (resourceId: string, addedBy: string) => {
    if (user?.id !== addedBy && user?.id !== roomData?.creatorId) {
      return alert("Only the creator or room owner can delete this resource.")
    }
    if (!confirm("Delete this resource?")) return
    
    try {
      await deleteDoc(doc(db, "communities", communityId, "studyRooms", roomId, "resources", resourceId))
    } catch (err) {
      console.error("Error deleting resource:", err)
    }
  }

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
          {/* Main Content Area */}
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
                <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
              </div>
              <div className="flex gap-2">
                <button className="p-2 rounded-lg hover:bg-white/10" title="Voice call">
                  <Phone size={20} />
                </button>
                <button className="p-2 rounded-lg hover:bg-white/10" title="Video call">
                  <Video size={20} />
                </button>
                <button className="p-2 rounded-lg hover:bg-white/10" title="Settings">
                  <Settings size={20} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b border-white/10">
              <button
                onClick={() => setActiveTab("chat")}
                className={`pb-3 px-4 font-semibold transition ${
                  activeTab === "chat"
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                💬 Live Chat
              </button>
              <button
                onClick={() => setActiveTab("discussion")}
                className={`pb-3 px-4 font-semibold transition ${
                  activeTab === "discussion"
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                📝 Discussions
              </button>
              <button
                onClick={() => setActiveTab("resources")}
                className={`pb-3 px-4 font-semibold transition ${
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
                  <p className="text-center text-muted-foreground text-sm py-4">
                    Real-time chat - messages appear here instantly
                  </p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreatePost()}
                    placeholder="Type a message..."
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 rounded-lg glass focus:outline-none"
                  />
                  <button
                    onClick={handleCreatePost}
                    disabled={isLoading || !newMessage.trim()}
                    className="p-2 rounded-lg gradient-primary text-white hover:shadow-lg disabled:opacity-50"
                  >
                    {isLoading ? <Loader size={20} className="animate-spin" /> : <Send size={20} />}
                  </button>
                </div>
              </div>
            )}

            {/* Discussion Tab */}
            {activeTab === "discussion" && (
              <div className="flex flex-col flex-1">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">Discussion Posts</h2>
                  <button
                    onClick={() => setShowPostModal(true)}
                    className="px-4 py-2 rounded-lg gradient-primary text-white font-semibold flex items-center gap-2"
                  >
                    <Plus size={18} /> New Post
                  </button>
                </div>

                <div className="space-y-4 overflow-y-auto max-h-[600px]">
                  {posts.map((post) => {
                    const liked = post.likedBy?.includes(user?.id)
                    return (
                      <motion.div
                        key={post.id}
                        className="glass rounded-lg p-4 hover:bg-white/20"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold">{post.authorName}</h3>
                            <p className="text-xs text-muted-foreground">
                              {post.createdAt?.toDate?.().toLocaleString?.() || "just now"}
                            </p>
                          </div>
                          {user?.id === post.authorId && (
                            <button
                              onClick={() => handleDeletePost(post.id, post.authorId)}
                              className="p-1 rounded hover:bg-red-500/20 text-red-500"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                        <p className="mb-3">{post.content}</p>
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
                  {posts.length === 0 && (
                    <p className="text-center text-muted-foreground py-12">
                      No posts yet. Start a discussion!
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Resources Tab */}
            {activeTab === "resources" && (
              <div className="flex flex-col flex-1">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">Study Resources</h2>
                  <button
                    onClick={() => setShowResourceModal(true)}
                    className="px-4 py-2 rounded-lg gradient-primary text-white font-semibold flex items-center gap-2"
                  >
                    <Plus size={18} /> Add Resource
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-4 overflow-y-auto max-h-[600px]">
                  {resources.map((resource) => (
                    <motion.div
                      key={resource.id}
                      className="glass rounded-lg p-4 hover:bg-white/20"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-lg">{resource.title}</h3>
                        {(user?.id === resource.addedBy || user?.id === roomData?.creatorId) && (
                          <button
                            onClick={() => handleDeleteResource(resource.id, resource.addedBy)}
                            className="p-1 rounded hover:bg-red-500/20 text-red-500"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      {resource.description && (
                        <p className="text-sm text-muted-foreground mb-3">{resource.description}</p>
                      )}
                      {resource.link && (
                        <a
                          href={resource.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-sm flex items-center gap-1"
                        >
                          🔗 Open Link
                        </a>
                      )}
                      <p className="text-xs text-muted-foreground mt-3">
                        Added by {resource.addedByName}
                      </p>
                    </motion.div>
                  ))}
                  {resources.length === 0 && (
                    <p className="text-center text-muted-foreground py-12 col-span-2">
                      No resources yet. Add study materials, links, or notes!
                    </p>
                  )}
                </div>
              </div>
            )}
          </motion.div>

          {/* Participants Sidebar */}
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
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full gradient-primary" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{p.name}</p>
                    <p className="text-xs text-muted-foreground">Active</p>
                  </div>
                </div>
              ))}
              {participants.length === 0 && (
                <p className="text-center text-muted-foreground text-sm py-8">
                  No participants yet
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Create Post Modal */}
      {showPostModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-2xl p-6 max-w-lg w-full mx-4"
          >
            <h2 className="text-xl font-bold mb-4">Create Discussion Post</h2>
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full px-4 py-3 rounded-lg glass mb-4"
              rows={5}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowPostModal(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePost}
                disabled={isLoading || !newPost.trim()}
                className="flex-1 px-4 py-2 rounded-lg gradient-primary text-white font-semibold flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader size={18} className="animate-spin" /> : "Post"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Add Resource Modal */}
      {showResourceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass rounded-2xl p-6 max-w-lg w-full mx-4"
          >
            <h2 className="text-xl font-bold mb-4">Add Study Resource</h2>
            <input
              type="text"
              value={newResourceTitle}
              onChange={(e) => setNewResourceTitle(e.target.value)}
              placeholder="Resource title"
              className="w-full px-4 py-2 rounded-lg glass mb-3"
            />
            <input
              type="url"
              value={newResourceLink}
              onChange={(e) => setNewResourceLink(e.target.value)}
              placeholder="Link (optional)"
              className="w-full px-4 py-2 rounded-lg glass mb-3"
            />
            <textarea
              value={newResourceDescription}
              onChange={(e) => setNewResourceDescription(e.target.value)}
              placeholder="Description (optional)"
              className="w-full px-4 py-3 rounded-lg glass mb-4"
              rows={3}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowResourceModal(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleAddResource}
                disabled={isLoading || !newResourceTitle.trim()}
                className="flex-1 px-4 py-2 rounded-lg gradient-primary text-white font-semibold flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader size={18} className="animate-spin" /> : "Add"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}