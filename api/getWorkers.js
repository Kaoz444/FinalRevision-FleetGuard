import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { id } = req.query; // Capturar el ID desde la URL

    let query = supabase.from('workers').select('*').order('created_at', { ascending: false });

    // Si se pasa un ID, filtramos la consulta
    if (id) {
      query = query.eq('id', id).single(); // `.single()` devuelve solo un objeto en lugar de un array
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database query error:', error)
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json(id ? { worker: data } : { workers: data || [] });

  } catch (error) {
    console.error('Server error:', error)
    return res.status(500).json({ error: error.message })
  }
}

/*import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { data: workers, error } = await supabase
      .from('workers')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database query error:', error)
      return res.status(500).json({ error: error.message })
    }

    return res.status(200).json({ workers: workers || [] })
  } catch (error) {
    console.error('Server error:', error)
    return res.status(500).json({ error: error.message })
  }
}*/
