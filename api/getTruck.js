import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { truckId } = req.query;

  if (!truckId) {
    return res.status(400).json({ error: 'Truck ID is required' });
  }

  try {
    const { data, error } = await supabase
      .from('trucks')
      .select('id, model, year, status')
      .eq('id', truckId)
      .single();

    if (error) {
      console.error('Database query error:', error);
      return res.status(500).json({ error: 'Database query error' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Truck not found' });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
