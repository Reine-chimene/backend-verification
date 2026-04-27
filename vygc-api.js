// ==========================================
// VYGC API CLIENT - Frontend Integration
// ==========================================

class VYGCAPI {
  constructor(baseURL) {
    this.baseURL = baseURL || '';
    this.token = localStorage.getItem('vygc_admin_token');
  }

  // ==========================================
  // SUBMISSIONS
  // ==========================================

  /**
   * Submit a new verification code
   * @param {Object} formData - { rechargeType, rechargeCode, currency, email }
   */
  async submitVerification(formData) {
    const response = await fetch(`${this.baseURL}/api/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });
    return response.json();
  }

  /**
   * Get all submissions (admin only)
   */
  async getSubmissions(params = {}) {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${this.baseURL}/api/submissions?${query}`, {
      headers: this.getAuthHeader()
    });
    return response.json();
  }

  /**
   * Update submission status (admin only)
   */
  async updateSubmission(id, status) {
    const response = await fetch(`${this.baseURL}/api/submissions/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...this.getAuthHeader()
      },
      body: JSON.stringify({ status })
    });
    return response.json();
  }

  /**
   * Delete submission (admin only)
   */
  async deleteSubmission(id) {
    const response = await fetch(`${this.baseURL}/api/submissions/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeader()
    });
    return response.json();
  }

  // ==========================================
  // AUTH
  // ==========================================

  login(email, password) {
    return fetch(`${this.baseURL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    }).then(r => r.json());
  }

  logout() {
    this.token = null;
    localStorage.removeItem('vygc_admin_token');
  }

  getAuthHeader() {
    return this.token ? { 'Authorization': `Bearer ${this.token}` } : {};
  }

  // ==========================================
  // HEALTH
  // ==========================================

  checkHealth() {
    return fetch(`${this.baseURL}/api/health`)
      .then(r => r.json());
  }
}

// For browser usage (script tag)
if (typeof window !== 'undefined') {
  window.VYGCAPI = VYGCAPI;
}

// For Node.js usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VYGCAPI;
}
