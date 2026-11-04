import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { CircleCheck } from 'lucide-react'

const ToastContext = createContext(() => {})
const SHOW_MS = 2400

// 화면 아래에 잠깐 뜨는 알림. 성공은 체크 아이콘, 나머지는 글자만.
export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)

  const show = useCallback((text, { success = false } = {}) => {
    clearTimeout(timer.current)
    setToast({ text, success, key: Date.now() })
    timer.current = setTimeout(() => setToast(null), SHOW_MS)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toast-zone" role="status" aria-live="polite">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.key}
              className="toast"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {toast.success && <CircleCheck size={18} aria-hidden="true" />}
              {toast.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)

// 인터넷이 끊기거나 다시 연결되면 알려 준다
export function OfflineNotice() {
  const show = useToast()
  useEffect(() => {
    // 끊겼을 때는 OfflineScreen이 화면 전체로 알려 주고, 다시 연결되면 여기서 짧게 알려 준다
    const on = () => show('다시 연결됐어요', { success: true })
    window.addEventListener('online', on)
    return () => window.removeEventListener('online', on)
  }, [show])
  return null
}
