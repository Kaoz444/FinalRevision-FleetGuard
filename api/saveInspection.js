import { createClient } from '@supabase/supabase-js'

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

    // Format the data according to your table schema
    const inspectionData = {
      worker_id: inspection.worker_id,
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
}
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
