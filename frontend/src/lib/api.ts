const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  private async handleResponse(response: Response) {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // Auth endpoints
  async login(credentials: { username: string; password: string }) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(credentials),
    });
    return this.handleResponse(response);
  }

  async register(userData: { username: string; email: string; password: string }) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(userData),
    });
    return this.handleResponse(response);
  }

  // Pizza dinners
  async getPizzaDinners() {
    const response = await fetch(`${API_BASE_URL}/admin/pizza-dinners`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async createPizzaDinner(data: { title: string; description?: string; scheduled_date: string }) {
    const response = await fetch(`${API_BASE_URL}/admin/pizza-dinners`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async updatePizzaDinner(id: number, data: any) {
    const response = await fetch(`${API_BASE_URL}/admin/pizza-dinners/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async deletePizzaDinner(id: number) {
    const response = await fetch(`${API_BASE_URL}/admin/pizza-dinners/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  // Ingredients
  async getIngredients() {
    const response = await fetch(`${API_BASE_URL}/admin/ingredients`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async createIngredient(data: { name: string; description?: string }) {
    const response = await fetch(`${API_BASE_URL}/admin/ingredients`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async updateIngredient(id: number, data: any) {
    const response = await fetch(`${API_BASE_URL}/admin/ingredients/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async deleteIngredient(id: number) {
    const response = await fetch(`${API_BASE_URL}/admin/ingredients/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  // User selections
  async getUserSelections(pizzaDinnerId: number) {
    const response = await fetch(`${API_BASE_URL}/user/selections/${pizzaDinnerId}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async updateUserSelections(data: { pizza_dinner_id: number; ingredient_ids: number[] }) {
    const response = await fetch(`${API_BASE_URL}/user/selections`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async getPizzaDinnerSelections(pizzaDinnerId: number) {
    const response = await fetch(`${API_BASE_URL}/user/pizza-dinners/${pizzaDinnerId}/selections`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }
}

export default new ApiClient();