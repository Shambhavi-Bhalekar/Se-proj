// lib/firebase-hooks.ts
//@ts-nocheck
import { useEffect, useState } from "react"
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore"
import { db } from "@/lib/firebase"

export function useFirestoreMessages(roomId: string) {
  const [messages, setMessages] = useState([])

  useEffect(() => {
    if (!roomId) return
    const q = query(collection(db, "studyRooms", roomId, "messages"), orderBy("createdAt", "asc"))
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
    return unsubscribe
  }, [roomId])

  const sendMessage = async (messageData) => {
    await addDoc(collection(db, "studyRooms", roomId, "messages"), {
      ...messageData,
      createdAt: serverTimestamp(),
    })
  }

  return { messages, sendMessage }
}

export function useFirestoreParticipants(roomId: string) {
  const [participants, setParticipants] = useState([])

  useEffect(() => {
    if (!roomId) return
    const q = collection(db, "studyRooms", roomId, "participants")
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setParticipants(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
    return unsubscribe
  }, [roomId])

  const addParticipant = async (user) => {
    await setDoc(doc(db, "studyRooms", roomId, "participants", user.id), {
      name: user.name,
      status: "active",
      joinedAt: serverTimestamp(),
    })
  }

  const removeParticipant = async (userId) => {
    await deleteDoc(doc(db, "studyRooms", roomId, "participants", userId))
  }

  return { participants, addParticipant, removeParticipant }
}
