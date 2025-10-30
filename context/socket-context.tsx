// @ts-nocheck
"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { db } from "@/lib/firebase"
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from "firebase/firestore"
import { useAuth } from "./auth-context"

interface SocketContextType {
  isConnected: boolean
  socket: any // Placeholder for API compatibility
  emit: (event: string, data: any) => Promise<void>
  on: (event: string, callback: (data: any) => void) => () => void
  off: (event: string, callback?: (data: any) => void) => void
  joinRoom: (roomType: string, roomId: string) => Promise<void>
  leaveRoom: (roomType: string, roomId: string) => Promise<void>
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const { user } = useAuth()

  // 🔌 Firestore handles realtime updates automatically — connection = ready state
  useEffect(() => {
    if (!user) return
    // Simulate connection detection using Firestore snapshot
    const unsub = onSnapshot(collection(db, "_heartbeat"), () => {
      setIsConnected(true)
    })
    return unsub
  }, [user])

  // ✅ "Emit" = Write a document to Firestore (e.g., send message/event)
  const emit = useCallback(
    async (event: string, data: any) => {
      if (!user) return console.warn("[v0] User not logged in, cannot emit")

      try {
        // All events stored in "events" collection
        await addDoc(collection(db, "events"), {
          event,
          data,
          senderId: user.id,
          timestamp: serverTimestamp(),
        })
      } catch (err) {
        console.error("[v0] Firestore emit error:", err)
      }
    },
    [user]
  )

  // ✅ "on" = Subscribe to Firestore collection filtered by event type
  const on = useCallback((event: string, callback: (data: any) => void) => {
    const eventsRef = collection(db, "events")
    const unsub = onSnapshot(eventsRef, (snapshot) => {
      const filtered = snapshot.docs
        .map((doc) => doc.data())
        .filter((d) => d.event === event)
      if (filtered.length) callback(filtered)
    })
    return unsub
  }, [])

  // ✅ "off" = Just call the unsubscribe returned by `on()`
  const off = useCallback((event: string, callback?: (data: any) => void) => {
    // Firestore doesn’t need explicit off; handled by returned `unsub`
    console.debug(`[v0] Firestore off() called for event: ${event}`)
  }, [])

  // ✅ Join a room = Add user to Firestore document’s `members`
  const joinRoom = useCallback(
    async (roomType: string, roomId: string) => {
      if (!user) return
      const roomRef = doc(db, "rooms", `${roomType}_${roomId}`)
      try {
        await setDoc(
          roomRef,
          {
            members: arrayUnion(user.id),
            lastJoined: serverTimestamp(),
          },
          { merge: true }
        )
        console.log(`[v0] Joined room: ${roomType}_${roomId}`)
      } catch (err) {
        console.error("[v0] Error joining room:", err)
      }
    },
    [user]
  )

  // ✅ Leave room = Remove user from `members` list
  const leaveRoom = useCallback(
    async (roomType: string, roomId: string) => {
      if (!user) return
      const roomRef = doc(db, "rooms", `${roomType}_${roomId}`)
      try {
        await updateDoc(roomRef, {
          members: arrayRemove(user.id),
        })
        console.log(`[v0] Left room: ${roomType}_${roomId}`)
      } catch (err) {
        console.error("[v0] Error leaving room:", err)
      }
    },
    [user]
  )

  // 🔄 "socket" is just a placeholder to preserve existing API
  const socket = {
    connected: isConnected,
    emit,
    on,
    off,
  }

  return (
    <SocketContext.Provider
      value={{
        isConnected,
        socket,
        emit,
        on,
        off,
        joinRoom,
        leaveRoom,
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  const context = useContext(SocketContext)
  if (!context) throw new Error("useSocket must be used within SocketProvider")
  return context
}
