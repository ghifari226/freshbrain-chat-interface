import { useMemo } from 'react'
import { ThemeProvider, createTheme } from '@mui/material/styles'

export default function MuiPage({ mode, children }) {
  const theme = useMemo(
    () => createTheme({ palette: { mode: mode === 'dark' ? 'dark' : 'light' } }),
    [mode],
  )

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>
}
