// Add to src/api/assessmentApi.js

/**
 * Fetch assessment analytics data
 * GET /api/v1/assessment/analytics
 * 
 * @param {string} organizationId - Organization ID for multitenant filtering
 * @param {Object} options - Analytics options
 * @param {string} options.timeRange - Time range for data
 * @param {Array<string>} options.metrics - Metrics to include
 * @returns {Promise<Object>} Analytics data
 */
export async function fetchAssessmentAnalytics(organizationId, options = {}) {
  const params = new URLSearchParams();
  
  if (organizationId) params.append('organizationId', organizationId);
  if (options.timeRange) params.append('timeRange', options.timeRange);
  if (options.metrics) params.append('metrics', options.metrics.join(','));
  
  const queryString = params.toString() ? `?${params.toString()}` : '';
  
  const res = await fetch(`${API_BASE}/assessment/analytics${queryString}`, {
    method: "GET",
    headers: buildHeaders(true),
  });
  
  return handleResponse(res, "Failed to fetch assessment analytics");
}
