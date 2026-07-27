import { lazy, Suspense, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar.jsx'
import ChatPanel from './components/chat/ChatPanel.jsx'
import LoginPage from './pages/LoginPage.jsx'
import { sendMessage, generateTitle } from './services/apiClient.js'
import { makeMockConversations } from './mocks/mockConversations.js'
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

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

function AuthenticatedApp({ language, setLanguage }) {
  const { pathname: path } = useLocation()
  const navigate = useNavigate()
  const { session } = useAuth()

  const [theme, setTheme] = useTheme()
  const [tone, setTone] = useTone()
  const [chatFont, setChatFont] = useChatFont()
  const [conversations, setConversations] = useState(() => makeMockConversations())
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef(null)

  // The URL is the source of truth for which conversation is open —
  // /chat/<id> — rather than duplicating that as separate React state that
  // could drift out of sync with the address bar. The prefix (matching
  // ChatGPT's /c/ and Claude's /chat/) makes chat paths recognizable by
  // inclusion rather than isChatRoute having to exclude every known section
  // by name — a future top-level route doesn't risk silently being treated
  // as a conversation id.
  const isChatRoute = path === '/' || path.startsWith('/chat/')
  const activeConversationId = path.startsWith('/chat/') ? path.slice('/chat/'.length) : null
  const activeConversation = conversations.find((c) => c.id === activeConversationId) ?? null

  // No placeholder conversation gets created (and no title added to Recents)
  // until the user actually sends a first message — see handleSend, which is
  // the only place a conversation object is ever created. This just clears
  // the active selection so ChatPanel falls back to its blank welcome state.
  function handleNewChat() {
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
  }

  function handleDeleteConversation(conversationId) {
    setConversations((prev) => {
      const next = prev.filter((c) => c.id !== conversationId)
      if (conversationId === activeConversationId) {
        navigate(next[0] ? '/chat/' + next[0].id : '/')
      }
      return next
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
  }

  async function handleSend(text) {
    const userMessage = { id: makeId(), role: 'user', text, createdAt: new Date().toISOString() }
    const isFirstMessage = !activeConversation || activeConversation.messages.length === 0
    let conversationId = activeConversation?.id
    // The backend only assigns a real conversation id once it has persisted
    // the first message; until then this stays null so sendMessage knows to
    // start a new conversation server-side instead of reusing our local id.
    const backendConversationId = isFirstMessage ? null : activeConversation.backendId

    if (conversationId) {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, messages: [...c.messages, userMessage] } : c,
        ),
      )
    } else {
      conversationId = makeId()
      setConversations((prev) => [
        {
          id: conversationId,
          backendId: null,
          title: strings.sidebar.newChat[language],
          timestamp: new Date().toISOString(),
          messages: [userMessage],
        },
        ...prev,
      ])
      navigate('/chat/' + conversationId)
    }

    if (isFirstMessage) {
      generateTitle(text)
        .then((title) => {
          setConversations((prev) =>
            prev.map((c) => (c.id === conversationId ? { ...c, title } : c)),
          )
        })
        .catch(() => {
          // Chat delivery remains independent from optional title generation.
        })
    }

    setIsLoading(true)

    try {
      const response = await sendMessage({
        message: text,
        conversation_id: backendConversationId,
        user_id: session?.user_id,
        role: session?.role,
        allowed_scopes: session?.allowed_scopes,
        token: session?.token,
      })
      const assistantMessage = {
        id: makeId(),
        role: 'assistant',
        text: response.answer,
        createdAt: new Date().toISOString(),
      }
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? { ...c, backendId: response.conversation_id, messages: [...c.messages, assistantMessage] }
            : c,
        ),
      )
    } catch (error) {
      const errorMessage = {
        id: makeId(),
        role: 'assistant',
        text: error.message || 'Something went wrong. Please try again.',
        isError: true,
        createdAt: new Date().toISOString(),
      }
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId ? { ...c, messages: [...c.messages, errorMessage] } : c,
        ),
      )
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
