import { MetricTypes, formatDuration } from './metricsHelper.js';

// Process inspection times data
export function processInspectionTimes(metricsData) {
    const inspectionTimes = metricsData.filter(m => 
        m.metric_type === MetricTypes.INSPECTION_TIME
    ).map(m => JSON.parse(m.metric_value));

    // Group by worker
    const workerTimes = {};
    inspectionTimes.forEach(time => {
        if (!workerTimes[time.worker_id]) {
            workerTimes[time.worker_id] = [];
        }
        workerTimes[time.worker_id].push(time.duration);
    });

    // Calculate averages
    const averages = Object.entries(workerTimes).map(([workerId, times]) => ({
        workerId,
        averageTime: times.reduce((a, b) => a + b, 0) / times.length
    }));

    return {
        data: averages,
        overall: averages.reduce((a, b) => a + b.averageTime, 0) / averages.length
    };
}

// Process weekly inspection counts
export function processWeeklyInspections(metricsData) {
    const weeklyData = metricsData.filter(m => 
        m.metric_type === MetricTypes.WEEKLY_COUNT
    ).map(m => JSON.parse(m.metric_value));

    // Sort by week start and accumulate counts
    return weeklyData.sort((a, b) => 
        new Date(a.week_start) - new Date(b.week_start)
    ).map(week => ({
        weekStart: new Date(week.week_start),
        count: week.count
    }));
}

// Process issue distribution
export function processIssueDistribution(metricsData) {
    const issueData = metricsData.filter(m => 
        m.metric_type === MetricTypes.ISSUE_DISTRIBUTION
    ).map(m => JSON.parse(m.metric_value));

    return issueData.reduce((acc, curr) => ({
        critical: acc.critical + (curr.critical || 0),
        warning: acc.warning + (curr.warning || 0),
        ok: acc.ok + (curr.ok || 0)
    }), { critical: 0, warning: 0, ok: 0 });
}

// Process fleet condition data
export function processFleetCondition(metricsData) {
    const conditionData = metricsData.filter(m => 
        m.metric_type === MetricTypes.FLEET_CONDITION
    ).map(m => JSON.parse(m.metric_value));

    // Get latest condition per truck
    const latestConditions = new Map();
    conditionData.forEach(data => {
        const timestamp = new Date(data.timestamp);
        const existing = latestConditions.get(data.truck_id);
        
        if (!existing || timestamp > new Date(existing.timestamp)) {
            latestConditions.set(data.truck_id, data);
        }
    });

    const conditions = Array.from(latestConditions.values());
    return {
        current: conditions.reduce((a, b) => a + b.condition, 0) / conditions.length,
        history: conditionData.sort((a, b) => 
            new Date(a.timestamp) - new Date(b.timestamp)
        )
    };
}

// Process inspector performance data
export function processInspectorPerformance(metricsData) {
    const performanceData = metricsData.filter(m => 
        m.metric_type === MetricTypes.INSPECTOR_PERFORMANCE
    ).map(m => JSON.parse(m.metric_value));

    // Group by worker and get latest scores
    const workerScores = {};
    performanceData.forEach(data => {
        if (!workerScores[data.worker_id] || 
            new Date(data.timestamp) > new Date(workerScores[data.worker_id].timestamp)) {
            workerScores[data.worker_id] = data;
        }
    });

    return Object.values(workerScores).map(score => ({
        workerId: score.worker_id,
        score: score.score,
        timestamp: score.timestamp
    }));
}

// Generate chart configurations
export function generateChartConfigs(processedData) {
    return {
        inspectionTimes: {
            type: 'bar',
            data: {
                labels: processedData.inspectionTimes.data.map(d => d.workerId),
                datasets: [{
                    label: 'Average Inspection Time (minutes)',
                    data: processedData.inspectionTimes.data.map(d => d.averageTime / 60),
                    backgroundColor: '#3b82f6'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Minutes'
                        }
                    }
                }
            }
        },
        weeklyInspections: {
            type: 'line',
            data: {
                labels: processedData.weeklyInspections.map(w => 
                    w.weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                ),
                datasets: [{
                    label: 'Inspections per Week',
                    data: processedData.weeklyInspections.map(w => w.count),
                    borderColor: '#3b82f6',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    }
                }
            }
        },
        issueDistribution: {
            type: 'doughnut',
            data: {
                labels: ['Critical', 'Warning', 'OK'],
                datasets: [{
                    data: [
                        processedData.issueDistribution.critical,
                        processedData.issueDistribution.warning,
                        processedData.issueDistribution.ok
                    ],
                    backgroundColor: ['#ef4444', '#f59e0b', '#10b981']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        },
        fleetCondition: {
            type: 'line',
            data: {
                labels: processedData.fleetCondition.history.map(d => 
                    new Date(d.timestamp).toLocaleDateString()
                ),
                datasets: [{
                    label: 'Fleet Condition %',
                    data: processedData.fleetCondition.history.map(d => d.condition),
                    borderColor: '#3b82f6',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        },
        inspectorPerformance: {
            type: 'radar',
            data: {
                labels: processedData.inspectorPerformance.map(p => p.workerId),
                datasets: [{
                    label: 'Performance Score',
                    data: processedData.inspectorPerformance.map(p => p.score),
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    borderColor: '#3b82f6',
                    pointBackgroundColor: '#3b82f6'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        }
    };
}
