import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const inspection = req.body;
  console.log('Received inspection data:', inspection);

  try {
    // Validar que los campos requeridos están presentes
    const requiredFields = ['worker_id', 'truck_id', 'start_time', 'end_time', 'duration'];
    for (const field of requiredFields) {
      if (!inspection[field]) {
        return res.status(400).json({ error: `Missing required field: ${field}` });
      }
    }

    // Validar tipos de datos
    if (typeof inspection.worker_id !== 'string' || typeof inspection.truck_id !== 'string' || typeof inspection.duration !== 'number') {
      return res.status(400).json({ error: 'Invalid field types: worker_id and truck_id must be strings, duration must be a number.' });
    }

    // Verificar si el worker_id existe en la tabla de workers
    const { data: worker, error: workerError } = await supabase
      .from('workers')
      .select('id')
      .eq('id', inspection.worker_id)
      .maybeSingle();

    if (workerError) {
      console.error('Error querying workers table:', workerError);
      return res.status(500).json({ error: 'Error verifying worker ID', details: workerError.message });
    }

    if (!worker) {
      console.error('Worker ID not found:', inspection.worker_id);
      return res.status(403).json({ error: 'Worker ID not authorized to insert inspections' });
    }

    console.log('Worker ID is valid:', inspection.worker_id);

    // Formatear los datos para la tabla inspections
    const inspectionData = {
      worker_id: inspection.worker_id, // Validado previamente
      truck_id: inspection.truck_id,
      start_time: inspection.start_time,
      end_time: inspection.end_time,
      duration: inspection.duration,
      overall_condition: inspection.overall_condition || null,
      pdf_url: inspection.pdf_url || null,
      critical_count: inspection.critical_count || 0,
      warning_count: inspection.warning_count || 0,
      status: inspection.status || 'pending',
      created_at: new Date().toISOString(),
    };

    console.log('Formatted inspection data:', inspectionData);

    // Insertar los datos en la tabla inspections
    const { data, error } = await supabase
      .from('inspections')
      .insert([inspectionData])
      .select();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: 'Error inserting data into the database', details: error.message });
    }

    // Responder con éxito
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Unexpected server error:', error);
    return res.status(500).json({ error: 'Unexpected server error', details: error.message });
  }
}


/*import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const inspection = req.body;
  console.log('Received inspection data:', inspection);

  try {
    // Validate required fields
    if (!inspection.worker_id || !inspection.truck_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // Validar campos requeridos
    if (!inspection.truck_id || !inspection.start_time || !inspection.end_time) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Validar que los valores sean del tipo esperado
    if (typeof inspection.truck_id !== 'string' || typeof inspection.duration !== 'number') {
      return res.status(400).json({ error: 'Invalid field types' });
    }

    // Format the data according to your table schema
    const inspectionData = {
      worker_id: user.id, // Usar el ID del usuario autenticado
      truck_id: inspection.truck_id,
      start_time: inspection.start_time,
      end_time: inspection.end_time,
      duration: inspection.duration,
      overall_condition: inspection.overall_condition,
      pdf_url: inspection.pdf_url,
      critical_count: inspection.critical_count,
      warning_count: inspection.warning_count,
      status: inspection.status,
      created_at: new Date().toISOString()
    };

    console.log('Formatted inspection data:', inspectionData);

    const { data, error } = await supabase
      .from('inspections')
      .insert([inspectionData])
      .select();

    if (error) {
      console.error('Database error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: error.message });
  }
}*/
/*import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { 
    worker_id,
    truck_id,
    start_time,
    end_time,
    duration,
    overall_condition,
    pdf_url,
    critical_count,
    warning_count,
    status
  } = req.body

  try {
    // Save inspection data
    const { data, error } = await supabase
      .from('inspections')
      .insert([{
        worker_id,
        truck_id,
        start_time,
        end_time,
        duration,
        overall_condition,
        pdf_url,
        critical_count,
        warning_count,
        status,
        created_at: new Date().toISOString()
      }])

    if (error) throw error

    return res.status(200).json({ success: true, data })
  } catch (error) {
    console.error('Error saving inspection:', error)
    return res.status(500).json({ error: 'Error saving inspection' })
  }
}*/
