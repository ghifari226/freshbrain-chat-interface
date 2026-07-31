import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar.jsx'
import ChatPanel from './components/chat/ChatPanel.jsx'
import LoginPage from './pages/LoginPage.jsx'
import {
  sendMessage,
  sendFeedback,
  generateTitle,
  listConversations,
  renameConversation,
  deleteConversation,
} from './services/apiClient.ts'
import { useTheme } from './hooks/useTheme.js'
import { useTone } from './hooks/useTone.js'
import { useChatFont } from './hooks/useChatFont.js'
import { useLanguage } from './hooks/useLanguage.js'
import { useAuthSession } from './hooks/useAuthSession.js'
import { useAuth } from './hooks/useAuth.js'
import { LanguageProvider } from './contexts/LanguageProvider.jsx'
import { AuthProvider } from './contexts/AuthProvider.jsx'
import { strings } from './i18n/strings.js'

const MuiPage = lazy(() => import('./pages/MuiPage.jsx'))
const ConfigSection = lazy(() => import('./pages/config/ConfigSection.jsx'))
const FreshpediaPage = lazy(() => import('./pages/FreshpediaPage.jsx'))
const ToolCatalogPage = lazy(() => import('./pages/ToolCatalogPage.jsx'))

function AuthenticatedApp({ language, setLanguage }) {
  const { pathname: path } = useLocation()
  const navigate = useNavigate()
  const { session } = useAuth()

  const [theme, setTheme] = useTheme()
  const [tone, setTone] = useTone()
  const [chatFont, setChatFont] = useChatFont()
  const [conversations, setConversations] = useState([])
  // The first exchange of a brand-new conversation, held here (not in
  // `conversations`) until POST /chat's response assigns a real id — the
  // frontend never invents a conversation id (see domain.ts's
  // Conversation.id doc comment), so there's nothing to add to the sidebar
  // or route to yet. null when there's no in-flight new conversation.
  const [pendingMessages, setPendingMessages] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef(null)

  // Fires once on mount — conversations aren't seeded locally anymore, they
  // come from GET /conversations (mocked).
  useEffect(() => {
    listConversations({ user_id: session?.id, role: session?.role, token: session?.token })
      .then((response) => {
        setConversations(response.conversations)
      })
      .catch(() => {
        // Best-effort — an empty sidebar is a safe, visible-enough failure
        // mode; nothing else in the app depends on this resolving.
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The URL is the source of truth for which conversation is open —
  // /chat/<id> — rather than duplicating that as separate React state that
  // could drift out of sync with the address bar. The prefix (matching
  // ChatGPT's /c/ and Claude's /chat/) makes chat paths recognizable by
  // inclusion rather than isChatRoute having to exclude every known section
  // by name — a future top-level route doesn't risk silently being treated
  // as a conversation id.
  const isChatRoute = path === '/' || path.startsWith('/chat/')
  const activeConversationId = path.startsWith('/chat/') ? path.slice('/chat/'.length) : null
  // While a brand-new conversation's first exchange is in flight (no real
  // id yet, still on '/'), fall back to pendingMessages so ChatPanel shows
  // it in place rather than the welcome screen — see handleSend.
  const activeConversation = activeConversationId
    ? conversations.find((c) => c.id === activeConversationId) ?? null
    : pendingMessages
      ? { title: strings.sidebar.newChat[language], timestamp: null, messages: pendingMessages }
      : null

  // No placeholder conversation gets created (and no title added to Recents)
  // until the user actually sends a first message — see handleSend, which is
  // the only place a conversation object is ever created. This just clears
  // the active selection so ChatPanel falls back to its blank welcome state.
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
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, title } : c)),
    )

    // Every conversation in `conversations` already has a real backend id
    // (see domain.ts's Conversation.id doc comment) — nothing to guard
    // here, unlike before backendId was removed.
    renameConversation({
      conversation_id: conversationId,
      title,
      user_id: session?.id,
      role: session?.role,
      token: session?.token,
    }).catch((error) => {
      // Best-effort — the rename already applied optimistically above; a
      // failed server-side rename doesn't roll it back in this mock.
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

    // Every conversation in `conversations` already has a real backend id —
    // same rationale as handleRenameConversation above.
    deleteConversation({
      conversation_id: conversationId,
      user_id: session?.id,
      role: session?.role,
      token: session?.token,
    }).catch((error) => {
      // Best-effort — same rationale as handleRenameConversation above.
      console.error('Failed to delete conversation', error)
    })
  }

  function handleMessageFeedback(conversationId, messageId, feedback) {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              messages: c.messages.map((m) => (m.id === messageId ? { ...m, feedback } : m)),
            }
          : c,
      ),
    )

    // Only submit complete feedback — never the intermediate "down clicked,
    // reason not yet chosen" state, and never a cancel/toggle-off (feedback
    // is an append-only log, toggling the UI off doesn't retract a row).
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
      // Best-effort — MessageFeedback.jsx has no error slot, a failed
      // submission must never disrupt the chat UI.
      console.error('Failed to submit feedback', error)
    })
  }

  async function handleSend(text) {
    const userMessage = { id: crypto.randomUUID(), role: 'user', text, createdAt: new Date().toISOString() }
    // No route/id exists yet for a brand-new conversation — see
    // pendingMessages' declaration above and Conversation.id's doc comment
    // in domain.ts. `activeConversationId` (not activeConversation) is the
    // right check: it's the URL, which stays null for the whole pending
    // window regardless of what pendingMessages holds.
    const isNewConversation = !activeConversationId

    if (isNewConversation) {
      setPendingMessages((prev) => [...(prev ?? []), userMessage])
    } else {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId ? { ...c, messages: [...c.messages, userMessage] } : c,
        ),
      )
    }

    setIsLoading(true)

    try {
      const response = await sendMessage({
        message: text,
        conversation_id: isNewConversation ? null : activeConversationId,
        user_id: session?.id,
        role: session?.role,
        allowed_scopes: session?.allowed_scopes,
        token: session?.token,
      })
      const assistantMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: response.answer,
        createdAt: new Date().toISOString(),
        backendMessageId: response.message_id,
      }

      if (isNewConversation) {
        // response.conversation_id is the first real id this conversation
        // has ever had — only now does it become a routable, listable
        // conversation.
        setConversations((prev) => [
          {
            id: response.conversation_id,
            title: strings.sidebar.newChat[language],
            timestamp: new Date().toISOString(),
            messages: [userMessage, assistantMessage],
          },
          ...prev,
        ])
        setPendingMessages(null)
        navigate('/chat/' + response.conversation_id)

        // Title generation only makes sense once the conversation has a
        // real id to attach it to — fires after navigate() above, so it
        // never delays the answer that's already rendered/routed to.
        generateTitle({ message: text, conversation_id: response.conversation_id, token: session?.token })
          .then((title) => {
            setConversations((prev) =>
              prev.map((c) => (c.id === response.conversation_id ? { ...c, title } : c)),
            )
          })
          .catch(() => {
            // Chat delivery remains independent from optional title generation.
          })
      } else {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversationId
              ? {
                  ...c,
                  // Only ever set on a message after the first one — see
                  // ChatResponse.title's doc comment in types/api.ts. Applied
                  // unconditionally whenever present; no separate rename
                  // endpoint or confirmation step, ai-engine's response is
                  // the source of truth for the title from here on.
                  ...(response.title ? { title: response.title } : {}),
                  messages: [...c.messages, assistantMessage],
                }
              : c,
          ),
        )
      }
    } catch (error) {
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
          prev.map((c) =>
            c.id === activeConversationId ? { ...c, messages: [...c.messages, errorMessage] } : c,
          ),
        )
      }
    } finally {
      setIsLoading(false)
    }
  }

  const chatPanel = (
    <ChatPanel
      conversation={activeConversation}
      isLoading={isLoading}
      onSend={handleSend}
      onFeedback={(messageId, feedback) =>
        handleMessageFeedback(activeConversationId, messageId, feedback)
      }
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
          path="/config/*"
          element={
            <Suspense fallback={<div className="config-page" />}>
              <MuiPage mode={theme}>
                <ConfigSection />
              </MuiPage>
            </Suspense>
          }
        />
        <Route
          path="/freshpedia"
          element={
            <Suspense fallback={<div className="config-page" />}>
              <MuiPage mode={theme}>
                <FreshpediaPage language={language} />
              </MuiPage>
            </Suspense>
          }
        />
        <Route
          path="/tool-catalog"
          element={
            <Suspense fallback={<div className="config-page" />}>
              <MuiPage mode={theme}>
                <ToolCatalogPage />
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

  return (
    <LanguageProvider language={language}>
      <AuthProvider session={session} setSession={setSession}>
        {session ? (
          <AuthenticatedApp language={language} setLanguage={setLanguage} />
        ) : (
          <LoginPage language={language} setLanguage={setLanguage} />
        )}
      </AuthProvider>
    </LanguageProvider>
  )
}
