// Metric Type Constants
export const MetricTypes = {
    INSPECTION_TIME: 'inspection_time',
    INSPECTOR_PERFORMANCE: 'inspector_performance', 
    WEEKLY_COUNT: 'weekly_inspections',
    ISSUE_DISTRIBUTION: 'issue_distribution',
    FLEET_CONDITION: 'fleet_condition'
};

// Calculate inspection duration in seconds
export function calculateInspectionDuration(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return Math.floor((end - start) / 1000);
}

// Calculate performance score (0-100)
export function calculatePerformanceScore(inspection) {
    let score = 100;
    
    // Deduct for issues found
    score -= (inspection.critical_count || 0) * 5; // -5 points per critical issue
    score -= (inspection.warning_count || 0) * 2;  // -2 points per warning
    
    // Deduct for extreme inspection times
    const duration = calculateInspectionDuration(inspection.start_time, inspection.end_time);
    const idealDuration = 900; // 15 minutes in seconds
    const timeDiff = Math.abs(duration - idealDuration);
    
    if (timeDiff > 300) { // If more than 5 minutes off ideal time
        score -= Math.min(10, Math.floor(timeDiff / 60)); // -1 point per minute off, max -10
    }
    
    return Math.max(0, Math.min(100, score)); // Ensure score is between 0-100
}

// Record inspection metric
export async function recordInspectionMetric(inspection, metricType, value, period = 'daily') {
    try {
        const metricData = {
            metric_type: metricType,
            metric_value: JSON.stringify(value),
            calculation_period: period
        };

        const response = await fetch('/api/updateMetrics', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(metricData)
        });

        if (!response.ok) {
            throw new Error(`Failed to update ${metricType} metric`);
        }

        return await response.json();
    } catch (error) {
        console.error(`Error recording ${metricType} metric:`, error);
        throw error;
    }
}

// Record all metrics for an inspection
export async function recordAllMetrics(inspection) {
    try {
        // Record inspection time
        const duration = calculateInspectionDuration(inspection.start_time, inspection.end_time);
        await recordInspectionMetric(inspection, MetricTypes.INSPECTION_TIME, {
            worker_id: inspection.worker_id,
            duration: duration,
            timestamp: new Date().toISOString()
        });

        // Record weekly count
        await recordInspectionMetric(inspection, MetricTypes.WEEKLY_COUNT, {
            count: 1,
            week_start: getWeekStart().toISOString()
        }, 'weekly');

        // Record issue distribution
        await recordInspectionMetric(inspection, MetricTypes.ISSUE_DISTRIBUTION, {
            critical: inspection.critical_count || 0,
            warning: inspection.warning_count || 0,
            ok: (!inspection.critical_count && !inspection.warning_count) ? 1 : 0
        });

        // Record fleet condition
        await recordInspectionMetric(inspection, MetricTypes.FLEET_CONDITION, {
            condition: inspection.overall_condition || 100,
            truck_id: inspection.truck_id,
            timestamp: new Date().toISOString()
        });

        // Record inspector performance
        const performanceScore = calculatePerformanceScore(inspection);
        await recordInspectionMetric(inspection, MetricTypes.INSPECTOR_PERFORMANCE, {
            worker_id: inspection.worker_id,
            score: performanceScore,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error recording metrics:', error);
        throw error;
    }
}

// Helper function to get start of current week
function getWeekStart() {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
}

// Format duration for display
export function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
}
