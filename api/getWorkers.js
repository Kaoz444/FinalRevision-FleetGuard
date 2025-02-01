import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            const { data: workers, error } = await supabase
                .from('workers')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Database query error:', error);
                return res.status(500).json({ error: error.message });
            }

            return res.status(200).json({ workers: workers || [] });
        } catch (error) {
            console.error('Server error:', error);
            return res.status(500).json({ error: error.message });
        }
    } 
    
    if (req.method === 'PUT') {
        try {
            const { id, name, email, password_hash, role } = req.body;

            // 🔹 Verificar si el usuario con ese ID existe
            const { data: existingUser, error: fetchError } = await supabase
                .from('workers')
                .select('*')
                .eq('id', id)
                .single();

            if (fetchError || !existingUser) {
                console.error('User not found:', fetchError || `ID ${id} does not exist.`);
                return res.status(404).json({ error: `User with ID ${id} not found.` });
            }

            // 🔹 Actualizar el usuario en la base de datos
            const { data, error } = await supabase
                .from('workers')
                .update({ name, email, password_hash, role })
                .eq('id', id)
                .select('*') // ⬅️ Devuelve el usuario actualizado
                .single();

            if (error) {
                console.error('Error updating user:', error);
                return res.status(500).json({ error: error.message });
            }

            return res.status(200).json({ message: 'User updated successfully', user: data });

        } catch (error) {
            console.error('Server error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    // 📌 (Opcional) Manejo de `POST` para crear usuarios
    if (req.method === 'POST') {
        try {
            const { id, name, email, password_hash, role } = req.body;

            // 🔹 Verificar si el ID ya existe antes de crearlo
            const { data: existingUser } = await supabase
                .from('workers')
                .select('id')
                .eq('id', id)
                .single();

            if (existingUser) {
                return res.status(409).json({ error: `User with ID ${id} already exists.` });
            }

            // 🔹 Insertar nuevo usuario
            const { data, error } = await supabase
                .from('workers')
                .insert([{ id, name, email, password_hash, role }])
                .select('*') // ⬅️ Devuelve el usuario recién creado
                .single();

            if (error) {
                console.error('Error creating user:', error);
                return res.status(500).json({ error: error.message });
            }

            return res.status(201).json({ message: 'User created successfully', user: data });

        } catch (error) {
            console.error('Server error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}

/*import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
    if (req.method === 'GET') {
        try {
            const { data: workers, error } = await supabase
                .from('workers')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Database query error:', error);
                return res.status(500).json({ error: error.message });
            }

            return res.status(200).json({ workers: workers || [] });
        } catch (error) {
            console.error('Server error:', error);
            return res.status(500).json({ error: error.message });
        }
    } 
    
    if (req.method === 'PUT') {
        try {
            const { id, name, email, password_hash, role } = req.body;

            // 🔹 Verificar si el usuario con ese ID existe
            const { data: existingUser, error: fetchError } = await supabase
                .from('workers')
                .select('*')
                .eq('id', id)
                .single();

            if (fetchError) {
                console.error('Error checking for existing user:', fetchError);
                return res.status(500).json({ error: 'Database error while checking user ID' });
            }

            if (!existingUser) {
                return res.status(404).json({ error: `User with ID ${id} not found.` });
            }

            // 🔹 Actualizar el usuario en la base de datos
            const { data, error } = await supabase
                .from('workers')
                .update({ name, email, password_hash, role })
                .eq('id', id);

            if (error) {
                console.error('Error updating user:', error);
                return res.status(500).json({ error: error.message });
            }

            return res.status(200).json({ message: 'User updated successfully', user: data });

        } catch (error) {
            console.error('Server error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}*/

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
