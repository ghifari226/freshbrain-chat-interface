import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar.jsx'
import ChatPanel from './components/chat/ChatPanel.jsx'
import LoginPage from './pages/LoginPage.jsx'
import ResetPasswordPage from './pages/ResetPasswordPage.jsx'
import {
  streamChat,
  sendFeedback,
  generateTitle,
  listConversations,
  listConversationMessages,
  renameConversation,
  deleteConversation,
} from './services/apiClient.ts'
import { isCanceled } from './services/api.ts'
import { useTheme } from './hooks/useTheme.js'
import { useTone } from './hooks/useTone.js'
import { useChatFont } from './hooks/useChatFont.js'
import { useLanguage } from './hooks/useLanguage.js'
import { useAuthSession } from './hooks/useAuthSession.js'
import { useAuth } from './hooks/useAuth.js'
import { LanguageProvider } from './contexts/LanguageProvider.jsx'
import { AuthProvider } from './contexts/AuthProvider.jsx'
import { strings } from './i18n/strings.js'
import { updateById } from './utils/collections.js'

const MuiPage = lazy(() => import('./pages/MuiPage.jsx'))
const AdminSection = lazy(() => import('./pages/admin/AdminSection.jsx'))

// Messages paginate by count, not turns, but an even limit keeps pages
// turn-aligned for normal text-only conversations.
const TURNS_PER_PAGE = 20
const MESSAGES_PER_PAGE = TURNS_PER_PAGE * 2

function AuthenticatedApp({ language, setLanguage }) {
  const { pathname: path } = useLocation()
  const navigate = useNavigate()
  const { session } = useAuth()

  const [theme, setTheme] = useTheme()
  const [tone, setTone] = useTone()
  const [chatFont, setChatFont] = useChatFont()
  const [conversations, setConversations] = useState([])
  const [pendingMessages, setPendingMessages] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [streamingStatus, setStreamingStatus] = useState(null)
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false)
  const inputRef = useRef(null)
  const abortControllerRef = useRef(null)
  useEffect(() => {
    listConversations({ user_id: session?.id, role: session?.role, token: session?.token })
      .then((response) => {
        // Merge rather than replace — this list endpoint no longer carries
        // messages, so a naive replace would wipe out any message window
        // already hydrated per-conversation by the pagination effect below
        // (including across React StrictMode's double-invoked dev effects).
        setConversations((prev) => {
          const existingById = new Map(prev.map((conversation) => [conversation.id, conversation]))
          return response.conversations.map((incoming) => {
            const existing = existingById.get(incoming.id)
            return existing?.messages !== undefined
              ? { ...incoming, messages: existing.messages, nextCursor: existing.nextCursor }
              : incoming
          })
        })
      })
      .catch(() => {
      })
  }, [session?.id, session?.role, session?.token])
  const isChatRoute = path === '/' || path.startsWith('/chat/')
  const activeConversationId = path.startsWith('/chat/') ? path.slice('/chat/'.length) : null
  const activeConversation = activeConversationId
    ? conversations.find((c) => c.id === activeConversationId) ?? null
    : pendingMessages
      ? { title: strings.sidebar.newChat[language], timestamp: null, messages: pendingMessages }
      : null

  useEffect(() => {
    if (!activeConversationId) return
    const conversation = conversations.find((c) => c.id === activeConversationId)
    if (!conversation || conversation.messages !== undefined) return

    const controller = new AbortController()
    listConversationMessages({
      conversation_id: activeConversationId,
      limit: MESSAGES_PER_PAGE,
      token: session?.token,
      signal: controller.signal,
    })
      .then((response) => {
        setConversations((prev) =>
          updateById(prev, activeConversationId, (c) => ({
            ...c,
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

  function handleLoadOlderMessages() {
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
        setConversations((prev) =>
          updateById(prev, activeConversationId, (c) => ({
            ...c,
            messages: [...olderMessages, ...c.messages],
            nextCursor: response.next_cursor,
          })),
        )
      })
      .catch((error) => {
        console.error('Failed to load older messages', error)
      })
      .finally(() => {
        setIsLoadingOlderMessages(false)
      })
  }

  function handleNewChat() {
    setPendingMessages(null)
    navigate('/')
    inputRef.current?.focus()
  }

  function handleSelectConversation(nextConversationId) {
    if (nextConversationId === activeConversationId) return
    navigate('/chat/' + nextConversationId)
  }

  function handleRenameConversation(conversationId, title) {
    setConversations((prev) => updateById(prev, conversationId, (conversation) => ({ ...conversation, title })))
    renameConversation({
      conversation_id: conversationId,
      title,
      user_id: session?.id,
      role: session?.role,
      token: session?.token,
    }).catch((error) => {
      console.error('Failed to rename conversation', error)
    })
  }

  function handleDeleteConversation(conversationId) {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== conversationId)
      if (conversationId === activeConversationId) {
        navigate(next[0] ? '/chat/' + next[0].id : '/')
      }
      return next
    })
    deleteConversation({
      conversation_id: conversationId,
      user_id: session?.id,
      role: session?.role,
      token: session?.token,
    }).catch((error) => {
      console.error('Failed to delete conversation', error)
    })
  }

  function handleMessageFeedback(conversationId, messageId, feedback) {
    setConversations((prev) =>
      updateById(prev, conversationId, (conversation) => ({
        ...conversation,
        messages: updateById(conversation.messages, messageId, (message) => ({ ...message, feedback })),
      })),
    )
    const isComplete = feedback?.rating === 'up' || (feedback?.rating === 'down' && feedback.reason)
    if (!isComplete) return

    const conversation = conversations.find((c) => c.id === conversationId)
    const message = conversation?.messages.find((m) => m.id === messageId)
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
    }).catch((error) => {
      console.error('Failed to submit feedback', error)
    })
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
        setConversations((prev) => [
          {
            id: response.conversation_id,
            title: strings.sidebar.newChat[language],
            timestamp: new Date().toISOString(),
            messages: [...priorMessages, assistantMessage],
          },
          ...prev,
        ])
        setPendingMessages(null)
        navigate('/chat/' + response.conversation_id)
        generateTitle({ message: text, conversation_id: response.conversation_id, token: session?.token })
          .then((title) => {
            setConversations((prev) =>
              updateById(prev, response.conversation_id, (conversation) => ({ ...conversation, title })),
            )
          })
          .catch(() => {
          })
      } else {
        setConversations((prev) =>
          updateById(prev, activeConversationId, (conversation) => ({
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
          setPendingMessages((prev) => [...(prev ?? []), errorMessage])
        } else {
          setConversations((prev) =>
            updateById(prev, activeConversationId, (conversation) => ({
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

  function handleSend(text) {
    const userMessage = { id: crypto.randomUUID(), role: 'user', text, createdAt: new Date().toISOString() }
    const isNewConversation = !activeConversationId

    if (isNewConversation) {
      setPendingMessages((prev) => [...(prev ?? []), userMessage])
    } else {
      setConversations((prev) =>
        updateById(prev, activeConversationId, (conversation) => ({
          ...conversation,
          messages: [...conversation.messages, userMessage],
        })),
      )
    }

    runSend(text, isNewConversation, [...(pendingMessages ?? []), userMessage])
  }
  function handleRetry() {
    const isNewConversation = !activeConversationId
    const messages = isNewConversation ? pendingMessages ?? [] : activeConversation?.messages ?? []
    const lastMessage = messages[messages.length - 1]
    if (!lastMessage || lastMessage.role !== 'user') return
    runSend(lastMessage.text, isNewConversation, messages)
  }

  function handleStopGenerating() {
    abortControllerRef.current?.abort()
  }

  const chatPanel = (
    <ChatPanel
      conversation={activeConversation}
      isLoading={isLoading}
      streamingStatus={streamingStatus}
      onSend={handleSend}
      onStop={handleStopGenerating}
      onRetry={handleRetry}
      onFeedback={(messageId, feedback) =>
        handleMessageFeedback(activeConversationId, messageId, feedback)
      }
      onLoadOlderMessages={handleLoadOlderMessages}
      hasMoreOlder={Boolean(activeConversation?.nextCursor)}
      isLoadingOlder={isLoadingOlderMessages}
      inputRef={inputRef}
    />
  )

  return (
    <div className="app">
      <Sidebar
        variant={isChatRoute ? 'chat' : 'nav'}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
        theme={theme}
        setTheme={setTheme}
        tone={tone}
        setTone={setTone}
        chatFont={chatFont}
        setChatFont={setChatFont}
        language={language}
        setLanguage={setLanguage}
      />
      <Routes>
        <Route path="/" element={chatPanel} />
        <Route path="/chat/:conversationId" element={chatPanel} />
        <Route
          path="/admin/*"
          element={
            <Suspense fallback={<div className="config-page" />}>
              <MuiPage mode={theme}>
                <AdminSection language={language} />
              </MuiPage>
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  )
}

export default function App() {
  const [language, setLanguage] = useLanguage()
  const [session, setSession] = useAuthSession()
  const location = useLocation()
  const resetMatch = location.pathname.match(/^\/reset\/(.+)$/)

  return (
    <LanguageProvider language={language}>
      <AuthProvider session={session} setSession={setSession}>
        {resetMatch ? (
          <ResetPasswordPage
            token={decodeURIComponent(resetMatch[1])}
            language={language}
            setLanguage={setLanguage}
          />
        ) : session ? (
          <AuthenticatedApp language={language} setLanguage={setLanguage} />
        ) : (
          <LoginPage
            language={language}
            setLanguage={setLanguage}
            passwordResetSuccess={Boolean(location.state?.passwordResetSuccess)}
          />
        )}
      </AuthProvider>
    </LanguageProvider>
  )
}
