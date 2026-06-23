import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { io, type Socket } from 'socket.io-client'
import { api } from '../lib/api'
import { tokenStore } from '../lib/tokenStore'
import { useAuth } from '../context/AuthContext'
import type { Message, Conversation } from '../lib/types'
import BackArrowIcon from '../components/icons/BackArrowIcon'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function getOtherUser(conversation: Conversation, currentUserId: number) {
  if (conversation.buyerId === currentUserId) {
    return conversation.seller
  }
  return conversation.buyer
}

function formatTime(createdAt: string) {
  const date = new Date(createdAt)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function getInitials(name?: string, email?: string) {
  const str = name || email || '?'
  return str
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export default function Chat() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const currentUserId = user?.id ?? 0

  const [socketMessages, setSocketMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const socketRef = useRef<Socket | null>(null)

  const conversationId = id ? parseInt(id, 10) : 0

  const {
    data: messagesRes,
    isLoading: messagesLoading,
    error: messagesError,
  } = useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      const res = await api.get<Message[]>(`/messages/${conversationId}`)
      return res.data
    },
    enabled: conversationId > 0,
  })

  const {
    data: conversations,
    isLoading: conversationsLoading,
    error: conversationsError,
  } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await api.get<Conversation[]>('/conversations')
      return res.data
    },
  })

  const conversation = conversations?.find((c) => c.id === conversationId)
  const otherUser = conversation ? getOtherUser(conversation, currentUserId) : null

  const allMessages = useMemo(() => {
    const base = messagesRes ?? []
    if (socketMessages.length === 0) return base
    const existingIds = new Set(base.map((m) => m.id))
    return [...base, ...socketMessages.filter((m) => !existingIds.has(m.id))]
  }, [messagesRes, socketMessages])

  // Socket.IO setup
  useEffect(() => {
    if (!conversationId || conversationId <= 0) return

    const accessToken = tokenStore.getAccess()
    if (!accessToken) return

    const socket = io(API_URL, {
      transports: ['websocket'],
      auth: { token: accessToken },
    })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('joinConversation', { conversationId })
    })

    socket.on('messageCreated', (message: Message) => {
      if (message.conversationId === conversationId) {
        setSocketMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev
          return [...prev, message]
        })
      }
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [conversationId])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [allMessages])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || !conversationId || sending) return

    setInput('')
    setSending(true)
    try {
      await api.post('/messages', {
        conversationId,
        content: text,
      })
    } catch {
      // If the request fails, optionally we could restore the input here,
      // but per spec we clear optimistically and let the real-time listener catch it.
    } finally {
      setSending(false)
    }
  }, [input, conversationId, sending])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSend()
    }
  }

  const isLoading = messagesLoading || conversationsLoading
  const hasError = messagesError || conversationsError

  if (!conversationId) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center text-text-secondary px-4">
        <p>Invalid conversation</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (hasError || !conversation) {
    return (
      <div className="min-h-dvh bg-background flex flex-col items-center justify-center text-text-secondary px-4 gap-4">
        <p>Conversation not found</p>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium"
        >
          Go back
        </button>
      </div>
    )
  }

  const otherName = otherUser?.displayName || `User #${otherUser?.id}` || 'User'

  return (
    <div className="h-dvh bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3 bg-surface border-b border-card-border shrink-0 z-20">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-card-hover transition-colors text-text-primary"
          aria-label="Back"
        >
          <BackArrowIcon className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          {otherUser?.profileImage ? (
            <img
              src={otherUser.profileImage}
              alt={otherName}
              className="w-9 h-9 rounded-full object-cover"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
              {getInitials(otherUser?.displayName, undefined)}
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-text-primary leading-tight">
              {otherName}
            </span>
            {conversation.listing && (
              <span className="text-xs text-text-muted leading-tight">
                {conversation.listing.brand} {conversation.listing.model}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {allMessages.map((msg) => {
          const isMine = msg.senderId === currentUserId
          return (
            <div
              key={msg.id}
              className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                  isMine
                    ? 'bg-primary text-white rounded-br-md'
                    : 'bg-surface border border-card-border text-text-primary rounded-bl-md'
                }`}
              >
                {!isMine && msg.sender?.displayName && (
                  <p className="text-[11px] font-medium text-primary mb-0.5">
                    {msg.sender.displayName}
                  </p>
                )}
                <p className="text-sm leading-relaxed">{msg.content}</p>
                <p
                  className={`text-[10px] mt-1 text-right ${
                    isMine ? 'text-white/70' : 'text-text-muted'
                  }`}
                >
                  {formatTime(msg.createdAt)}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <div className="shrink-0 px-4 py-3 bg-surface border-t border-card-border flex items-center gap-3 safe-area-pb">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="flex-1 bg-background border border-card-border rounded-xl px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  )
}
