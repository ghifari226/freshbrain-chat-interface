import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  deleteConversation,
  generateTitle,
  listConversationMessages,
  listConversations,
  renameConversation,
  sendFeedback,
  streamChat,
} from '../api/chatApi.ts'
import { isCanceled } from '@integrations/http/httpClient.ts'
import { strings } from '@shared/i18n/strings.js'
import { updateById } from '@shared/lib/collections.js'

// Satu halaman memuat pasangan pesan pengguna dan jawaban LLM agar batas percakapan tetap alami.
const MESSAGES_PER_PAGE = 40

export function useChatSession({ language, session }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [conversations, setConversations] = useState([])
  const [pendingMessages, setPendingMessages] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [streamingStatus, setStreamingStatus] = useState(null)
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false)
  const inputRef = useRef(null)
  const abortControllerRef = useRef(null)
  const isChatRoute = pathname === '/' || pathname.startsWith('/chat/')
  const activeConversationId = pathname.startsWith('/chat/') ? pathname.slice('/chat/'.length) : null
  const activeConversation = activeConversationId
    ? conversations.find((conversation) => conversation.id === activeConversationId) ?? null
    : pendingMessages
      ? { title: strings.sidebar.newChat[language], timestamp: null, messages: pendingMessages }
      : null

  useEffect(() => {
    listConversations({ user_id: session?.id, role: session?.role, token: session?.token })
      .then((response) => {
        // Gabungkan metadata baru tanpa menghapus riwayat percakapan yang sudah dimuat bertahap.
        setConversations((previous) => {
          const existingById = new Map(previous.map((conversation) => [conversation.id, conversation]))
          return response.conversations.map((incoming) => {
            const existing = existingById.get(incoming.id)
            return existing?.messages !== undefined
              ? { ...incoming, messages: existing.messages, nextCursor: existing.nextCursor }
              : incoming
          })
        })
      })
      .catch(() => {})
  }, [session?.id, session?.role, session?.token])

  useEffect(() => {
    if (!activeConversationId) return
    const conversation = conversations.find((item) => item.id === activeConversationId)
    if (!conversation || conversation.messages !== undefined) return

    const controller = new AbortController()
    listConversationMessages({
      conversation_id: activeConversationId,
      limit: MESSAGES_PER_PAGE,
      token: session?.token,
      signal: controller.signal,
    })
      .then((response) => {
        setConversations((previous) =>
          updateById(previous, activeConversationId, (item) => ({
            ...item,
            messages: [...response.messages].reverse(),
            nextCursor: response.next_cursor,
          })),
        )
      })
      .catch((error) => {
        if (!isCanceled(error)) console.error('Failed to load messages', error)
      })
    return () => controller.abort()
  }, [activeConversationId, conversations, session?.token])

  function loadOlderMessages() {
    if (!activeConversation?.nextCursor || isLoadingOlderMessages) return
    setIsLoadingOlderMessages(true)
    listConversationMessages({
      conversation_id: activeConversationId,
      limit: MESSAGES_PER_PAGE,
      before: activeConversation.nextCursor,
      token: session?.token,
    })
      .then((response) => {
        const olderMessages = [...response.messages].reverse()
        setConversations((previous) =>
          updateById(previous, activeConversationId, (conversation) => ({
            ...conversation,
            messages: [...olderMessages, ...conversation.messages],
            nextCursor: response.next_cursor,
          })),
        )
      })
      .catch((error) => console.error('Failed to load older messages', error))
      .finally(() => setIsLoadingOlderMessages(false))
  }

  function startNewChat() {
    setPendingMessages(null)
    navigate('/')
    inputRef.current?.focus()
  }

  function selectConversation(conversationId) {
    if (conversationId !== activeConversationId) navigate(`/chat/${conversationId}`)
  }

  function renameSelectedConversation(conversationId, title) {
    setConversations((previous) =>
      updateById(previous, conversationId, (conversation) => ({ ...conversation, title })),
    )
    renameConversation({
      conversation_id: conversationId,
      title,
      user_id: session?.id,
      role: session?.role,
      token: session?.token,
    }).catch((error) => console.error('Failed to rename conversation', error))
  }

  function removeConversation(conversationId) {
    setConversations((previous) => {
      const next = previous.filter((conversation) => conversation.id !== conversationId)
      if (conversationId === activeConversationId) navigate(next[0] ? `/chat/${next[0].id}` : '/')
      return next
    })
    deleteConversation({
      conversation_id: conversationId,
      user_id: session?.id,
      role: session?.role,
      token: session?.token,
    }).catch((error) => console.error('Failed to delete conversation', error))
  }

  function submitFeedback(conversationId, messageId, feedback) {
    setConversations((previous) =>
      updateById(previous, conversationId, (conversation) => ({
        ...conversation,
        messages: updateById(conversation.messages, messageId, (message) => ({ ...message, feedback })),
      })),
    )
    const isComplete = feedback?.rating === 'up' || (feedback?.rating === 'down' && feedback.reason)
    if (!isComplete) return

    const conversation = conversations.find((item) => item.id === conversationId)
    const message = conversation?.messages.find((item) => item.id === messageId)
    if (!message?.backendMessageId) return

    sendFeedback({
      message_id: message.backendMessageId,
      conversation_id: conversationId,
      user_id: session?.id,
      role: session?.role,
      rating: feedback.rating,
      reason: feedback.reason,
      comment: feedback.comment,
      token: session?.token,
    }).catch((error) => console.error('Failed to submit feedback', error))
  }

  async function runSend(text, isNewConversation, priorMessages) {
    setIsLoading(true)
    setStreamingStatus(null)
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const response = await streamChat(
        {
          message: text,
          conversation_id: isNewConversation ? null : activeConversationId,
          user_id: session?.id,
          role: session?.role,
          allowed_scopes: session?.allowed_scopes,
          token: session?.token,
          signal: controller.signal,
        },
        { onStatus: setStreamingStatus },
      )
      const assistantMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: response.answer,
        createdAt: new Date().toISOString(),
        backendMessageId: response.message_id,
      }

      if (isNewConversation) {
        setConversations((previous) => [
          {
            id: response.conversation_id,
            title: strings.sidebar.newChat[language],
            timestamp: new Date().toISOString(),
            messages: [...priorMessages, assistantMessage],
          },
          ...previous,
        ])
        setPendingMessages(null)
        navigate(`/chat/${response.conversation_id}`)
        generateTitle({ message: text, conversation_id: response.conversation_id, token: session?.token })
          .then((title) => {
            setConversations((previous) =>
              updateById(previous, response.conversation_id, (conversation) => ({ ...conversation, title })),
            )
          })
          .catch(() => {})
      } else {
        setConversations((previous) =>
          updateById(previous, activeConversationId, (conversation) => ({
            ...conversation,
            ...(response.title ? { title: response.title } : {}),
            messages: [...conversation.messages, assistantMessage],
          })),
        )
      }
    } catch (error) {
      if (!isCanceled(error)) {
        const errorMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: error.message || 'Something went wrong. Please try again.',
          isError: true,
          createdAt: new Date().toISOString(),
        }
        if (isNewConversation) {
          setPendingMessages((previous) => [...(previous ?? []), errorMessage])
        } else {
          setConversations((previous) =>
            updateById(previous, activeConversationId, (conversation) => ({
              ...conversation,
              messages: [...conversation.messages, errorMessage],
            })),
          )
        }
      }
    } finally {
      setIsLoading(false)
      setStreamingStatus(null)
      abortControllerRef.current = null
    }
  }

  function sendMessage(text) {
    const userMessage = { id: crypto.randomUUID(), role: 'user', text, createdAt: new Date().toISOString() }
    const isNewConversation = !activeConversationId
    if (isNewConversation) {
      setPendingMessages((previous) => [...(previous ?? []), userMessage])
    } else {
      setConversations((previous) =>
        updateById(previous, activeConversationId, (conversation) => ({
          ...conversation,
          messages: [...conversation.messages, userMessage],
        })),
      )
    }
    runSend(text, isNewConversation, [...(pendingMessages ?? []), userMessage])
  }

  function retryLastMessage() {
    const isNewConversation = !activeConversationId
    const messages = isNewConversation ? pendingMessages ?? [] : activeConversation?.messages ?? []
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role === 'user') runSend(lastMessage.text, isNewConversation, messages)
  }

  function stopGenerating() {
    abortControllerRef.current?.abort()
  }

  return {
    activeConversation,
    activeConversationId,
    conversations,
    inputRef,
    isChatRoute,
    isLoading,
    isLoadingOlderMessages,
    loadOlderMessages,
    removeConversation,
    renameConversation: renameSelectedConversation,
    retryLastMessage,
    selectConversation,
    sendMessage,
    startNewChat,
    stopGenerating,
    streamingStatus,
    submitFeedback,
  }
}
