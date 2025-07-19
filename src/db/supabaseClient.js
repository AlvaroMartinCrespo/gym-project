import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://aelqfikprrhemqkervvt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlbHFmaWtwcnJoZW1xa2VydnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5MTIzNTksImV4cCI6MjA2ODQ4ODM1OX0.2RMcooBtKWP6WaOeQiInv_Q4EFGime53hv5WEV20LEo'

export const supabase = createClient(supabaseUrl, supabaseKey)