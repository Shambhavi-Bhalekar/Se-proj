//@ts-nocheck
"use client"

import { useEffect } from "react"
import { useSocket } from "@/context/socket-context"
import { SOCKET_EVENTS } from "@/lib/socket-events"

interface UseSocketEventsOptions {
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: any) => void
  events?: Record<string, (data: any) => void>
}

export function useSocketEvents(options: UseSocketEventsOptions) {
  const { socket, on, off } = useSocket()

  useEffect(() => {
    if (!socket) return

    // Connection events
    if (options.onConnect) {
      on(SOCKET_EVENTS.CONNECT, options.onConnect)
    }

    if (options.onDisconnect) {
      on(SOCKET_EVENTS.DISCONNECT, options.onDisconnect)
    }

    if (options.onError) {
      on(SOCKET_EVENTS.CONNECT_ERROR, options.onError)
    }

    // Custom events
    if (options.events) {
      Object.entries(options.events).forEach(([event, handler]) => {
        on(event, handler)
      })
    }

    // Cleanup
    return () => {
      if (options.onConnect) off(SOCKET_EVENTS.CONNECT, options.onConnect)
      if (options.onDisconnect) off(SOCKET_EVENTS.DISCONNECT, options.onDisconnect)
      if (options.onError) off(SOCKET_EVENTS.CONNECT_ERROR, options.onError)
      if (options.events) {
        Object.entries(options.events).forEach(([event, handler]) => {
          off(event, handler)
        })
      }
    }
  }, [socket, on, off, options])
}

// Hook for joining/leaving rooms
export function useSocketRoom(roomType: string, roomId: string) {
  const { joinRoom, leaveRoom } = useSocket()

  useEffect(() => {
    if (roomId) {
      joinRoom(roomType, roomId)
    }

    return () => {
      if (roomId) {
        leaveRoom(roomType, roomId)
      }
    }
  }, [roomType, roomId, joinRoom, leaveRoom])
}
