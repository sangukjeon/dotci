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
    const off = () => show('연결이 끊겼어요. 인터넷을 확인해 주세요')
    const on = () => show('다시 연결됐어요', { success: true })
    window.addEventListener('offline', off)
    window.addEventListener('online', on)
    return () => {
      window.removeEventListener('offline', off)
      window.removeEventListener('online', on)
    }
  }, [show])
  return null
}
