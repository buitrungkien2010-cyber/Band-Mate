import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from './supabase'
import { setLang } from './i18n'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined) // undefined = dang tai
  const [member, setMember] = useState(null)
  const [noAccess, setNoAccess] = useState(false)

  const loadMember = useCallback(async (sess) => {
    if (!sess) { setMember(null); return }
    const uid = sess.user.id
    const { data } = await supabase
      .from('members')
      .select('*')
      .or(`google_user_id.eq.${uid},login_user_id.eq.${uid}`)
      .eq('is_active', true)
      .maybeSingle()
    if (!data) {
      setNoAccess(true)
      await supabase.auth.signOut()
      setMember(null)
      return
    }
    setNoAccess(false)
    setMember(data)
    setLang(data.ui_language)
  }, [])

  useEffect(() => {
    // Loi tu Auth hook (not_member) tra ve tren URL sau khi dang nhap Google / link Gmail
    const params = new URLSearchParams(window.location.search + '&' + window.location.hash.replace(/^#/, ''))
    const err = params.get('error_description') || params.get('error')
    if (err) {
      setNoAccess(true)
      window.history.replaceState(null, '', window.location.pathname)
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      loadMember(data.session)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setSession(sess)
      setTimeout(() => loadMember(sess), 0)
    })
    return () => sub.subscription.unsubscribe()
  }, [loadMember])

  const value = {
    session, member, noAccess, setNoAccess,
    isAdmin: member?.role === 'admin',
    refreshMember: () => loadMember(session),
    signOut: () => supabase.auth.signOut(),
  }
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}
