import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { worker_id, isAdmin } = req.query;
  console.log('GET /api/getInspections - Query params:', { worker_id, isAdmin });

  try {
    let query = supabase.from('inspections').select('*');

    // If not admin or specifically filtering by worker_id
    if (worker_id) {
      query = query.eq('worker_id', worker_id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase query error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`Found ${data?.length || 0} records for worker ${worker_id}`);
    return res.status(200).json({ inspections: data || [] });

  } catch (error) {
    console.error('Server error in getInspections:', error);
    return res.status(500).json({ error: error.message });
  }
}
/*import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    console.log('Invalid method used:', req.method); // Log del método de solicitud
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { worker_id, isAdmin } = req.query;

  // Logs iniciales de los parámetros recibidos
  console.log('GET Inspections Request');
  console.log('Worker ID received:', worker_id);
  console.log('Is Admin received:', isAdmin);

  try {
    let query = supabase.from('inspections').select('*');

    if (!isAdmin || isAdmin === 'false') {
      console.log('Non-admin user detected. Applying worker_id filter.');
      if (!worker_id) {
        console.log('Error: Worker ID is required for non-admin users.');
        return res.status(400).json({ error: 'worker_id is required for non-admin users' });
      }
      query = query.eq('worker_id', worker_id);
    } else {
      console.log('Admin user detected.');
      if (worker_id) {
        console.log('Applying additional filter for worker_id:', worker_id);
        query = query.eq('worker_id', worker_id);
      }
    }

    // Log para la consulta generada
    console.log('Executing query...');

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error executing query:', error);
      throw error;
    }

    // Log de los datos obtenidos
    console.log('Data fetched successfully:', data);

    return res.status(200).json({ inspections: data });
  } catch (error) {
    console.error('Unexpected error in handler:', error);
    return res.status(500).json({ error: error.message });
  }
}*/

