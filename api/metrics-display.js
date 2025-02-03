import {
    processInspectionTimes,
    processWeeklyInspections,
    processIssueDistribution,
    processFleetCondition,
    processInspectorPerformance,
    generateChartConfigs
} from './metricsProcessor.js';

// Store chart instances
const chartInstances = new Map();

// Initialize metrics dashboard
export async function initMetricsDashboard() {
    // Add event listener for time range changes
    const timeRangeSelect = document.getElementById('metricsTimeRange');
    if (timeRangeSelect) {
        timeRangeSelect.addEventListener('change', () => updateMetricsDisplay());
    }

    // Initial metrics load
    await updateMetricsDisplay();

    // Set up auto-refresh every 5 minutes
    setInterval(() => updateMetricsDisplay(), 5 * 60 * 1000);
}

// Main function to update metrics display
export async function updateMetricsDisplay() {
    try {
        // Show loading state
        showMetricsLoading(true);

        // Fetch metrics data
        const timeRange = document.getElementById('metricsTimeRange')?.value || 'day';
        const response = await fetch(`/api/getMetricsData?timeRange=${timeRange}`);
        const { metrics } = await response.json();

        if (!metrics || !Array.isArray(metrics)) {
            throw new Error('Invalid metrics data received');
        }

        // Process metrics data
        const processedData = {
            inspectionTimes: processInspectionTimes(metrics),
            weeklyInspections: processWeeklyInspections(metrics),
            issueDistribution: processIssueDistribution(metrics),
            fleetCondition: processFleetCondition(metrics),
            inspectorPerformance: processInspectorPerformance(metrics)
        };

        // Generate chart configurations
        const chartConfigs = generateChartConfigs(processedData);

        // Update UI elements
        updateMetricValues(processedData);
        updateCharts(chartConfigs);
        updateTrendingIssues(processedData.issueDistribution);

    } catch (error) {
        console.error('Error updating metrics display:', error);
        showMetricsError();
    } finally {
        showMetricsLoading(false);
    }
}

// Update metric value displays
function updateMetricValues(data) {
    // Update average inspection time
    const avgTimeElement = document.getElementById('averageTimeValue');
    if (avgTimeElement && data.inspectionTimes.overall) {
        avgTimeElement.textContent = formatDuration(data.inspectionTimes.overall);
    }

    // Update fleet condition
    const fleetConditionElement = document.getElementById('fleetConditionValue');
    if (fleetConditionElement && data.fleetCondition.current) {
        fleetConditionElement.textContent = `${data.fleetCondition.current.toFixed(1)}%`;
    }

    // Update issue distribution summary
    const { critical, warning, ok } = data.issueDistribution;
    document.getElementById('criticalIssuesCount')?.textContent = critical;
    document.getElementById('warningIssuesCount')?.textContent = warning;
    document.getElementById('okIssuesCount')?.textContent = ok;
}

// Update all charts
function updateCharts(configs) {
    Object.entries(configs).forEach(([chartId, config]) => {
        const canvas = document.getElementById(`${chartId}Chart`);
        if (!canvas) return;

        // Destroy existing chart instance
        const existingChart = chartInstances.get(chartId);
        if (existingChart) {
            existingChart.destroy();
        }

        // Create new chart
        const newChart = new Chart(canvas, config);
        chartInstances.set(chartId, newChart);
    });
}

// Update trending issues list
function updateTrendingIssues(issueData) {
    const container = document.getElementById('trendingIssuesList');
    if (!container) return;

    const issues = [
        { name: 'Critical Issues', count: issueData.critical, class: 'critical' },
        { name: 'Warning Issues', count: issueData.warning, class: 'warning' },
        { name: 'Normal Conditions', count: issueData.ok, class: 'ok' }
    ].sort((a, b) => b.count - a.count);

    container.innerHTML = issues.map(issue => `
        <div class="trending-issue">
            <span class="trending-issue-name">${issue.name}</span>
            <span class="trending-issue-count ${issue.class}">${issue.count}</span>
        </div>
    `).join('');
}

// Helper functions
function showMetricsLoading(isLoading) {
    const cards = document.querySelectorAll('.metric-card');
    cards.forEach(card => {
        card.style.opacity = isLoading ? '0.6' : '1';
        card.style.pointerEvents = isLoading ? 'none' : 'auto';
    });
}

function showMetricsError() {
    const cards = document.querySelectorAll('.metric-card');
    cards.forEach(card => {
        card.innerHTML = `
            <div class="metric-error">
                <p>Error loading metrics data</p>
                <button onclick="updateMetricsDisplay()" class="btn btn-secondary">
                    Retry
                </button>
            </div>
        `;
    });
}

// Format duration from seconds to readable string
function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
}
