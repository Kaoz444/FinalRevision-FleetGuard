import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { workerId } = req.body

  try {
    const { error } = await supabase
      .from('workers')
      .update({ 
        last_login: new Date().toISOString(),
        last_activity: new Date().toISOString()
      })
      .eq('id', workerId)

    if (error) throw error

    return res.status(200).json({ message: 'Updated successfully' })
  } catch (error) {
    return res.status(500).json({ error: 'Server error' })
  }
}
