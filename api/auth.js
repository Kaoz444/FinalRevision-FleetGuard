/*import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { workerId, password } = req.body

  try {
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .eq('id', workerId)
      .single()

    if (error || !data) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Compare password_hash (implement proper password comparison)
       const passwords = {
      '9999': 'admin123',
      '1234': 'abcd1234', 
      '9876': 'carlos9876'
    };
    
    if (passwords[workerId] !== password) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    return res.status(200).json({ 
      user: {
        id: data.id,
        name: data.name,
        role: data.role,
        status: data.status
      }
    })
  } catch (error) {
    return res.status(500).json({ error: 'Server error' })
  }
}*/
// api/auth.js
/*import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { workerId, password } = req.body;
  console.log('Login attempt for:', workerId); // Debug log

  try {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return res.status(500).json({ error: 'Database connection error' });
    }

    const { data: user, error } = await supabase
      .from('workers')
      .select('*')
      .eq('id', workerId)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Database query error' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.password_hash !== `hashed_${password}`) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}*/
/*import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Test connection
    const { data, error } = await supabase
      .from('workers')
      .select('count')
      .single();

    if (error) {
      console.error('Connection error:', error);
      return res.status(500).json({ 
        error: 'Database connection error',
        details: error.message,
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'URL exists' : 'No URL',
        key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Key exists' : 'No key'
      });
    }

    return res.status(200).json({ message: 'Connection successful', data });

  } catch (error) {
    console.error('Unexpected error:', error);
    return res.status(500).json({ 
      error: 'Server error', 
      details: error.message 
    });
  }
}*/
// api/auth.js
/*import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials:', { 
    hasUrl: !!supabaseUrl, 
    hasKey: !!supabaseKey 
  })
}

const supabase = createClient(supabaseUrl, supabaseKey)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { workerId, password } = req.body

  try {
    console.log('Testing connection to:', supabaseUrl)
    
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .eq('id', workerId)
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return res.status(500).json({ 
        error: 'Database query error', 
        details: error.message,
        code: error.code
      })
    }

    if (!data) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    console.log('Query successful, user found:', !!data)
    return res.status(200).json({ message: 'Connection working' })

  } catch (error) {
    console.error('Server error:', error)
    return res.status(500).json({ 
      error: 'Server error',
      details: error.message 
    })
  }
}*/
/*import { createClient } from '@supabase/supabase-js';

// Configurar Supabase con las variables de entorno
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

  // Extraer workerId y password del cuerpo de la solicitud
  const { workerId, password } = req.body;
  console.log('Worker ID received:', workerId);
  console.log('Password received:', password);

  // Validar si los campos están presentes
  if (!workerId || !password) {
    console.error('Missing workerId or password in request');
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Consulta a Supabase para obtener los datos del usuario
    const { data, error } = await supabase
      .from('workers')
      .select('*')
      .eq('id', workerId)
      .maybeSingle(); // Espera un único resultado o null

    // Log resultados de la consulta
    console.log('User data retrieved:', data);
    console.log('Supabase query error:', error);

    // Verificar si hubo un error en la consulta
    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        error: 'Database query error',
        details: error.message,
      });
    }

    // Verificar si el workerId no fue encontrado
    if (!data) {
      console.error(`Worker ID ${workerId} not found`);
      return res.status(401).json({ error: 'Invalid worker ID' });
    }

    // Registrar contraseñas para depuración
    console.log('Password from request:', password);
    console.log('Password from database:', data.password_hash);

    // Comparar la contraseña ingresada con la almacenada
    if (data.password_hash !== password) {
      console.error('Password mismatch for worker ID:', workerId);
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Si todo es correcto, autenticación exitosa
    console.log('Authentication successful for worker ID:', workerId);
    return res.status(200).json({
      message: 'Authenticated successfully',
      user: data,
    });
  } catch (error) {
    // Manejar errores del servidor
    console.error('Unexpected server error:', error);
    return res.status(500).json({
      error: 'Server error',
      details: error.message,
    });
  }
}*/
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


