import { createClient } from '@supabase/supabase-js';
// Auth handler for login
console.log('Request received at /api/auth');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  console.log('Request received at /api/auth');

  // Verificar variables de entorno
  console.log('Supabase URL:', process.env.SUPABASE_URL);
  console.log('Supabase Key exists:', !!process.env.SUPABASE_ANON_KEY);

  if (req.method !== 'POST') {
    console.error('Invalid HTTP method:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { workerId, password } = req.body;
  console.log('Worker ID received:', workerId);
  console.log('Password received:', password);

  if (!workerId || !password) {
    console.error('Missing workerId or password in request');
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .eq('id', workerId)
      .maybeSingle();

    console.log('User data retrieved:', data);
    if (error) {
      console.error('Supabase query error:', error);
      return res.status(500).json({ error: 'Database query error', details: error.message });
    }

    if (!data) {
      console.error(`Worker ID ${workerId} not found`);
      return res.status(401).json({ error: 'Invalid worker ID' });
    }

    console.log('Password from request:', password);
    console.log('Password from database:', data.password_hash);

    if (data.password_hash !== password) {
      console.error('Password mismatch for worker ID:', workerId);
      return res.status(401).json({ error: 'Invalid password' });
    }

    console.log('Authentication successful for worker ID:', workerId);
    return res.status(200).json({ message: 'Authenticated successfully', user: data });
  } catch (error) {
    console.error('Unexpected server error:', error);
    return res.status(500).json({ error: 'Server error', details: error.message });
  }
}


