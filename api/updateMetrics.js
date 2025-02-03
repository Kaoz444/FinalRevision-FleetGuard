export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { metric_type, metric_value } = req.body;

        const { data, error } = await supabase
            .from('metrics_cache')
            .insert([{ metric_type, metric_value }]);

        if (error) throw error;

        return res.status(200).json({ message: 'Metrics updated successfully', data });

    } catch (error) {
        console.error('Error updating metrics:', error);
        return res.status(500).json({ error: error.message });
    }
}
