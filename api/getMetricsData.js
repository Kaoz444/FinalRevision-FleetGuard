import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Obtener inspecciones recientes
        const { data: inspections, error: inspectionsError } = await supabase
            .from('inspections')
            .select('*');

        if (inspectionsError) throw inspectionsError;

        // Obtener métricas preprocesadas
        const { data: metrics, error: metricsError } = await supabase
            .from('metrics_cache')
            .select('*');

        if (metricsError) throw metricsError;

        return res.status(200).json({ inspections, metrics });

    } catch (error) {
        console.error('Error fetching metrics:', error);
        return res.status(500).json({ error: error.message });
    }
}
