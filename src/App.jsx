import { useRef, useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import ChatPanel from './components/ChatPanel.jsx'
import LoginPage from './pages/LoginPage.jsx'
import ConfigSection from './pages/config/ConfigSection.jsx'
import { sendMessage, generateTitle } from './lib/api.js'
import { makeMockConversations } from './lib/mockConversations.js'
import { useTheme } from './hooks/useTheme.js'
import { useTone } from './hooks/useTone.js'
import { useChatFont } from './hooks/useChatFont.js'
import { useLanguage } from './hooks/useLanguage.js'
import { useAuthSession } from './hooks/useAuthSession.js'
import { useAuth } from './hooks/useAuth.js'
import { useRoute } from './hooks/useRoute.js'
import { LanguageProvider } from './lib/i18n.jsx'
import { AuthProvider } from './lib/AuthProvider.jsx'
import { strings } from './lib/strings.js'

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

function ChatWorkspace({ language, setLanguage }) {
  const [conversations, setConversations] = useState(() => makeMockConversations())
  const [activeConversationId, setActiveConversationId] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef(null)

  const [theme, setTheme] = useTheme()
  const [tone, setTone] = useTone()
  const [chatFont, setChatFont] = useChatFont()
  const { session } = useAuth()

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

  return (
    <div className="app">
      <Sidebar
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
      <ChatPanel
        conversation={activeConversation}
        isLoading={isLoading}
        onSend={handleSend}
        onFeedback={(messageId, feedback) =>
          handleMessageFeedback(activeConversationId, messageId, feedback)
        }
        inputRef={inputRef}
      />
    </div>
  )
}

export default function App() {
  const [language, setLanguage] = useLanguage()
  const [session, setSession] = useAuthSession()
  const [path] = useRoute()

  return (
    <LanguageProvider language={language}>
      <AuthProvider session={session} setSession={setSession}>
        {session ? (
          path.startsWith('/config') ? (
            <ConfigSection language={language} setLanguage={setLanguage} />
          ) : (
            <ChatWorkspace language={language} setLanguage={setLanguage} />
          )
        ) : (
          <LoginPage language={language} setLanguage={setLanguage} />
        )}
      </AuthProvider>
    </LanguageProvider>
  )
}
