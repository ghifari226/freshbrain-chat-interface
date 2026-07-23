import { useMemo, useRef, useState } from 'react'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import Sidebar from './components/layout/Sidebar.jsx'
import ChatPanel from './components/chat/ChatPanel.jsx'
import LoginPage from './pages/LoginPage.jsx'
import ConfigSection from './pages/config/ConfigSection.jsx'
import FreshpediaPage from './pages/FreshpediaPage.jsx'
import ToolCatalogPage from './pages/ToolCatalogPage.jsx'
import { sendMessage, generateTitle } from './services/apiClient.js'
import { makeMockConversations } from './mocks/mockConversations.js'
import { useTheme } from './hooks/useTheme.js'
import { useTone } from './hooks/useTone.js'
import { useChatFont } from './hooks/useChatFont.js'
import { useLanguage } from './hooks/useLanguage.js'
import { useAuthSession } from './hooks/useAuthSession.js'
import { useAuth } from './hooks/useAuth.js'
import { useRoute } from './hooks/useRoute.js'
import { LanguageProvider } from './contexts/LanguageProvider.jsx'
import { AuthProvider } from './contexts/AuthProvider.jsx'
import { strings } from './i18n/strings.js'

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

function AuthenticatedApp({ language, setLanguage }) {
  const [path] = useRoute()
  const { session } = useAuth()

  const [theme, setTheme] = useTheme()
  const [tone, setTone] = useTone()
  const [chatFont, setChatFont] = useChatFont()
  // Config/Freshpedia/Tool Catalog are the only pages using MUI components
  // (Chip, Autocomplete, TextField, Dialog, DataGrid). Without a
  // ThemeProvider they always render MUI's light-mode defaults, so in dark
  // mode their text/borders (near-black) sit directly on our dark page
  // background instead of MUI's own paper — this keeps MUI's palette in
  // sync with ours so that doesn't happen.
  const muiTheme = useMemo(
    () => createTheme({ palette: { mode: theme === 'dark' ? 'dark' : 'light' } }),
    [theme],
  )

  const [conversations, setConversations] = useState(() => makeMockConversations())
  const [activeConversationId, setActiveConversationId] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef(null)

  const activeConversation = conversations.find((c) => c.id === activeConversationId) ?? null

  function handleNewChat() {
    if (activeConversation && activeConversation.messages.length === 0) {
      inputRef.current?.focus()
      return
    }

    const newConversation = {
      id: makeId(),
      title: strings.sidebar.newChat[language],
      timestamp: new Date().toISOString(),
      messages: [],
    }
    setConversations((prev) => [newConversation, ...prev])
    setActiveConversationId(newConversation.id)
  }

  function handleSelectConversation(nextConversationId) {
    if (nextConversationId === activeConversationId) return

    if (activeConversation && activeConversation.messages.length === 0) {
      const abandonedId = activeConversation.id
      setConversations((prev) => prev.filter((c) => c.id !== abandonedId))
    }
    setActiveConversationId(nextConversationId)
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
        setActiveConversationId(next[0]?.id ?? null)
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
      setActiveConversationId(conversationId)
    }

    if (isFirstMessage) {
      generateTitle(text).then((title) => {
        setConversations((prev) =>
          prev.map((c) => (c.id === conversationId ? { ...c, title } : c)),
        )
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

  const isChatRoute = path === '/'

  let content
  if (path.startsWith('/config')) {
    content = (
      <ThemeProvider theme={muiTheme}>
        <ConfigSection />
      </ThemeProvider>
    )
  } else if (path === '/freshpedia') {
    content = (
      <ThemeProvider theme={muiTheme}>
        <FreshpediaPage language={language} />
      </ThemeProvider>
    )
  } else if (path === '/tool-catalog') {
    content = (
      <ThemeProvider theme={muiTheme}>
        <ToolCatalogPage />
      </ThemeProvider>
    )
  } else {
    content = (
      <ChatPanel
        conversation={activeConversation}
        isLoading={isLoading}
        onSend={handleSend}
        onFeedback={(messageId, feedback) => handleMessageFeedback(activeConversationId, messageId, feedback)}
        inputRef={inputRef}
      />
    )
  }

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
      {content}
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
