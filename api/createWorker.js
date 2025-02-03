import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id, name, email, password_hash, role } = req.body;

  try {
    // Validate required fields
    if (!id || !name || !email || !password_hash || !role) {
      return res.status(400).json({ error: 'All fields are required' })
    }

    // Create new worker
    const { data, error } = await supabase
      .from('workers')
      .insert([{
        id,
        name,
        email,
        password_hash,
        role,
        status: 'active',
        created_at: new Date().toISOString(),
      }])
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ worker: data })
  } catch (error) {
    console.error('Server error:', error)
    return res.status(500).json({ error: error.message })
  }
}
