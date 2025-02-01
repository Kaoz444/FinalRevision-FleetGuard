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
    const { id } = req.query; // Capturar el ID desde la URL

    let query = supabase.from('workers').select('*').order('created_at', { ascending: false });

    // Si se pasa un ID, filtramos la consulta
    if (id) {
      query = query.eq('id', id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database query error:', error);
      return res.status(500).json({ error: error.message });
    }

    if (id) {
      if (!data || data.length === 0) {
        return res.status(404).json({ error: `No se encontró un usuario con id ${id}` });
      }
      return res.status(200).json({ worker: data[0] }); // Retornar solo el primer usuario
    }

    return res.status(200).json({ workers: data || [] });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: error.message });
  }
}*/
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
}
