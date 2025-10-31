// @ts-nocheck
"use client"

import { useEffect } from "react"
import { useSocket } from "@/context/socket-context"
import { SOCKET_EVENTS } from "@/lib/socket-events"
import { db } from "@/lib/firebase"
import { collection, doc, onSnapshot, setDoc, updateDoc, serverTimestamp, arrayUnion, arrayRemove } from "firebase/firestore"

/**
 * Hook to bind Firebase-based socket events to lifecycle and custom event handlers.
 * Keeps the same API as Socket.IO but implemented through Firestore real-time updates.
 */

interface UseSocketEventsOptions {
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: any) => void
  events?: Record<string, (data: any) => void>
}

export function useSocketEvents(options: UseSocketEventsOptions) {
  const { socket, on, off, isConnected } = useSocket()

  useEffect(() => {
    if (!socket) return

    // 🔌 Simulate connection event via Firestore heartbeat
    if (isConnected && options.onConnect) {
      options.onConnect()
    }

    // 🔄 Listen for Firestore heartbeat disconnection
    let unsubHeartbeat: any
    try {
      const heartbeatRef = collection(db, "_heartbeat")
      unsubHeartbeat = onSnapshot(heartbeatRef, () => {
        // simulate "connected"
        if (!isConnected && options.onConnect) options.onConnect()
      })
    } catch (err) {
      console.error("Firebase heartbeat error:", err)
      if (options.onError) options.onError(err)
    }

    // Bind Firestore event listeners (custom “socket-like” events)
    const unsubs: (() => void)[] = []
    if (options.events) {
      Object.entries(options.events).forEach(([event, handler]) => {
        const eventsRef = collection(db, "events")
        const unsub = onSnapshot(eventsRef, (snapshot) => {
          const filtered = snapshot.docs
            .map((doc) => doc.data())
            .filter((d) => d.event === event)
          if (filtered.length) handler(filtered)
        })
        unsubs.push(unsub)
      })
    }

    // Cleanup
    return () => {
      unsubHeartbeat && unsubHeartbeat()
      if (options.onDisconnect) options.onDisconnect()
      unsubs.forEach((fn) => fn())
    }
  }, [socket, on, off, options, isConnected])
}

/**
 * Hook for joining/leaving a Firestore-backed “room”.
 * Keeps identical API to useSocketRoom() from Socket.IO.
 */

export function useSocketRoom(roomType: string, roomId: string) {
  const { joinRoom, leaveRoom } = useSocket()

  useEffect(() => {
    if (!roomId) return

    // 🟢 Join Firestore room
    joinRoom(roomType, roomId)

    // 🔴 Leave room on unmount
    return () => {
      leaveRoom(roomType, roomId)
    }
  }, [roomType, roomId, joinRoom, leaveRoom])
}
