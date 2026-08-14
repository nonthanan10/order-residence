import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bpwuahacuymlycszlzuz.supabase.co'
const supabaseAnonKey = 'sb_publishable_aN7xCZhN8pf3nh2U6YwdHQ_-oCLknSR'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
