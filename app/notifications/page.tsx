//@ts-nocheck
"use client"

import { motion } from "framer-motion"
import { Navbar } from "@/components/navbar"
import { Bell, Check, Trash2, Users, X } from "lucide-react"
import { useEffect, useState } from "react"
import { db } from "@/lib/firebase"
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  setDoc,
} from "firebase/firestore"
import { useAuth } from "@/context/auth-context"
import Link from "next/link"

export default function NotificationsPage() {
  const { user } = useAuth()
  const [adminNotifications, setAdminNotifications] = useState([])
  const [userNotifications, setUserNotifications] = useState([])

  // 🔄 Real-time listener for admin + user notifications
  useEffect(() => {
    if (!user) return

    const notifRef = collection(db, "notifications")

    const adminQuery = query(notifRef, where("communityCreatorId", "==", user.id))
    const userQuery = query(notifRef, where("senderId", "==", user.id))

    const unsub1 = onSnapshot(adminQuery, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      // Only show join requests that are still pending
      setAdminNotifications(
        data
          .filter((n) => n.type === "join_request" && !n.read)
          .sort((a, b) => b.timestamp?.toMillis?.() - a.timestamp?.toMillis?.())
      )
    })

    const unsub2 = onSnapshot(userQuery, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
      setUserNotifications(
        data.sort((a, b) => b.timestamp?.toMillis?.() - a.timestamp?.toMillis?.())
      )
    })

    return () => {
      unsub1()
      unsub2()
    }
  }, [user])

  // ✅ Mark as read
  const handleMarkAsRead = async (id) => {
    try {
      await updateDoc(doc(db, "notifications", id), { read: true })
    } catch (err) {
      console.error("Error marking as read:", err)
    }
  }

  // ✅ Delete
  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, "notifications", id))
    } catch (err) {
      console.error("Error deleting notification:", err)
    }
  }

  // ✅ Approve request
  const handleApproveJoin = async (n) => {
    try {
      const communityRef = doc(db, "communities", n.communityId)
      const snap = await getDoc(communityRef)
      if (!snap.exists()) return
      const data = snap.data()

      const updatedMembers = [...(data.members || []), n.senderId]
      const updatedRequests = (data.joinRequests || []).filter((id) => id !== n.senderId)

      await updateDoc(communityRef, { members: updatedMembers, joinRequests: updatedRequests })

      // Notify sender
      const newNotifRef = doc(collection(db, "notifications"))
      await setDoc(newNotifRef, {
        notificationId: newNotifRef.id,
        userId: n.senderId,
        senderId: user.id,
        communityId: n.communityId,
        communityCreatorId: n.communityCreatorId,
        type: "approval",
        message: `request to join "${data.name}" was approved.`,
        timestamp: new Date(),
        read: false,
      })

      // Mark admin's copy as read (so it disappears)
      await updateDoc(doc(db, "notifications", n.id), { read: true })

      // Remove from local list instantly
      setAdminNotifications((prev) => prev.filter((item) => item.id !== n.id))
    } catch (err) {
      console.error("Error approving join request:", err)
    }
  }

  // ❌ Reject request
  const handleRejectJoin = async (n) => {
    try {
      const communityRef = doc(db, "communities", n.communityId)
      const snap = await getDoc(communityRef)
      if (!snap.exists()) return
      const data = snap.data()

      const updatedRequests = (data.joinRequests || []).filter((id) => id !== n.senderId)
      await updateDoc(communityRef, { joinRequests: updatedRequests })

      const newNotifRef = doc(collection(db, "notifications"))
      await setDoc(newNotifRef, {
        notificationId: newNotifRef.id,
        userId: n.senderId,
        senderId: user.id,
        communityId: n.communityId,
        communityCreatorId: n.communityCreatorId,
        type: "rejection",
        message: `request to join "${data.name}" was rejected.`,
        timestamp: new Date(),
        read: false,
      })

      await updateDoc(doc(db, "notifications", n.id), { read: true })
      setAdminNotifications((prev) => prev.filter((item) => item.id !== n.id))
    } catch (err) {
      console.error("Error rejecting join request:", err)
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  }

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5 } },
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading your notifications...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-background to-primary/5">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold flex items-center gap-3 mb-2">
            <Bell size={32} />
            Notifications
          </h1>
          <p className="text-muted-foreground">
            Manage your community join requests and updates.
          </p>
        </motion.div>

        {/* 🧭 Admin Section */}
        {adminNotifications.length > 0 && (
          <>
            <h2 className="text-2xl font-semibold mb-4">Requests to Approve</h2>
            <motion.div
              className="space-y-4 mb-10"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {adminNotifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  n={n}
                  user={user}
                  onApprove={handleApproveJoin}
                  onReject={handleRejectJoin}
                  onMarkAsRead={handleMarkAsRead}
                  onDelete={handleDelete}
                  itemVariants={itemVariants}
                />
              ))}
            </motion.div>
          </>
        )}

        {/* 🧍 User Section */}
        {userNotifications.length > 0 && (
          <>
            <h2 className="text-2xl font-semibold mb-4">Your Requests & Updates</h2>
            <motion.div
              className="space-y-4"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {userNotifications.map((n) => (
                <NotificationItem
                  key={n.id}
                  n={n}
                  user={user}
                  onApprove={handleApproveJoin}
                  onReject={handleRejectJoin}
                  onMarkAsRead={handleMarkAsRead}
                  onDelete={handleDelete}
                  itemVariants={itemVariants}
                />
              ))}
            </motion.div>
          </>
        )}

        {adminNotifications.length === 0 && userNotifications.length === 0 && (
          <motion.div
            className="text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Bell size={48} className="mx-auto text-muted-foreground mb-4 opacity-50" />
            <p className="text-muted-foreground">No notifications yet</p>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// 🧩 Notification Item
function NotificationItem({ n, user, onApprove, onReject, onMarkAsRead, onDelete, itemVariants }) {
  // Differentiate messages clearly
  const renderMessage = () => {
    if (n.type === "join_request" && n.communityCreatorId === user.id) {
      return `${n.senderName || "Someone"} requested to join "${n.communityName || "your community"}".`
    }
    return n.message
  }

  return (
    <motion.div
      variants={itemVariants}
      className={`glass rounded-xl p-6 flex items-start justify-between hover:bg-white/20 transition-all ${
        !n.read ? "border-l-4 border-primary" : ""
      }`}
    >
      <div className="flex-1">
        <p className={!n.read ? "font-semibold" : ""}>{renderMessage()}</p>

        {n.communityId && (
          <Link
            href={`/community/${n.communityId}`}
            className="text-primary text-sm flex items-center gap-1 mt-2 hover:underline"
          >
            <Users size={14} /> View Community
          </Link>
        )}

        <p className="text-xs text-muted-foreground mt-2">
          {n.timestamp?.toDate?.().toLocaleString?.() || ""}
        </p>
      </div>

      <div className="flex items-center gap-2 ml-4">
        {user && n.type === "join_request" && n.communityCreatorId === user.id && (
          <>
            <button
              onClick={() => onApprove(n)}
              className="p-2 rounded-lg hover:bg-green-100 text-green-600"
              title="Approve Request"
            >
              <Check size={18} />
            </button>
            <button
              onClick={() => onReject(n)}
              className="p-2 rounded-lg hover:bg-red-100 text-red-600"
              title="Reject Request"
            >
              <X size={18} />
            </button>
          </>
        )}

        {!n.read && (
          <button
            onClick={() => onMarkAsRead(n.id)}
            className="p-2 rounded-lg hover:bg-white/10"
            title="Mark as read"
          >
            <Check size={18} className="text-primary" />
          </button>
        )}

        <button
          onClick={() => onDelete(n.id)}
          className="p-2 rounded-lg hover:bg-destructive/10"
          title="Delete"
        >
          <Trash2 size={18} className="text-destructive" />
        </button>
      </div>
    </motion.div>
  )
}
