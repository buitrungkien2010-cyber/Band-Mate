import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
)

// Username -> email ao (Supabase Auth can email)
export const loginEmail = (username) => `${username.trim().toLowerCase()}@tamband.local`
