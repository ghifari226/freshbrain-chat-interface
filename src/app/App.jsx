import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Sidebar from './layout/Sidebar.jsx'
import { ChatPanel, useChatFont, useChatSession, useTone } from '@features/chat'
import {
  AuthProvider,
  LoginPage,
  ResetPasswordPage,
  useAuth,
  useAuthSession,
} from '@features/authentication'
import { useLanguage, useTheme } from '@features/preferences'
import { LanguageProvider } from '@shared/i18n/LanguageProvider.jsx'

const MuiPage = lazy(() =>
  import('@features/design-system').then(({ MuiPage: component }) => ({ default: component })),
)
const AdminSection = lazy(() =>
  import('@features/administration').then(({ AdminSection: component }) => ({ default: component })),
)

function AuthenticatedApp({ language, setLanguage }) {
  const { session } = useAuth()
  const [theme, setTheme] = useTheme()
  const [tone, setTone] = useTone()
  const [chatFont, setChatFont] = useChatFont()
  const chat = useChatSession({ language, session })
  const chatPanel = (
    <ChatPanel
      conversation={chat.activeConversation}
      isLoading={chat.isLoading}
      streamingStatus={chat.streamingStatus}
      onSend={chat.sendMessage}
      onStop={chat.stopGenerating}
      onRetry={chat.retryLastMessage}
      onFeedback={(messageId, feedback) =>
        chat.submitFeedback(chat.activeConversationId, messageId, feedback)
      }
      onLoadOlderMessages={chat.loadOlderMessages}
      hasMoreOlder={Boolean(chat.activeConversation?.nextCursor)}
      isLoadingOlder={chat.isLoadingOlderMessages}
      inputRef={chat.inputRef}
    />
  )

  return (
    <div className="app">
      <Sidebar
        variant={chat.isChatRoute ? 'chat' : 'nav'}
        conversations={chat.conversations}
        activeConversationId={chat.activeConversationId}
        onSelectConversation={chat.selectConversation}
        onNewChat={chat.startNewChat}
        onRenameConversation={chat.renameConversation}
        onDeleteConversation={chat.removeConversation}
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
