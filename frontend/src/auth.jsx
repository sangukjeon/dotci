import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import * as server from './server.js'

const AuthContext = createContext(null)

export const GUEST_HOME = '/place/booth'

export function AuthProvider({ children }) {
  // undefined = 확인 중, null = 로그인 안 함
  const [user, setUser] = useState(undefined)

  useEffect(() => {
    server.me().then(setUser, () => setUser(null))
  }, [])

  const login = useCallback(async (form) => setUser(await server.login(form)), [])
  const signup = useCallback(async (form) => setUser(await server.signup(form)), [])
  const guestLogin = useCallback(async () => setUser(await server.guestLogin()), [])
  const logout = useCallback(async () => {
    await server.logout()
    setUser(null)
  }, [])
  const withdraw = useCallback(async () => {
    await server.withdraw()
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, login, signup, guestLogin, logout, withdraw }),
    [user, login, signup, guestLogin, logout, withdraw],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)

// 로그인한 사람만. 아니면 로그인 화면으로 보내고, 로그인 후 원래 화면으로 돌아온다.
// 관람객(게스트)은 전시 부스 책상만 쓸 수 있다.
export function RequireAuth({ children, admin = false }) {
  const { user } = useAuth()
  const location = useLocation()
  // 로그인 확인 중 (빈 화면 대신)
  if (user === undefined) return <p className="auth-wait">서버에 연결하는 중이에요…</p>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  if (user.is_guest && location.pathname !== GUEST_HOME) return <Navigate to={GUEST_HOME} replace />
  if (admin && !user.is_admin) return <Navigate to="/" replace />
  return children
}
