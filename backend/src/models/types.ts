export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  is_admin: boolean;
  created_at: string;
}

export interface Ingredient {
  id: number;
  name: string;
  description: string;
  is_available: boolean;
  created_at: string;
}

export interface PizzaDinner {
  id: number;
  title: string;
  description: string;
  scheduled_date: string;
  is_active: boolean;
  created_at: string;
}

export interface UserSelection {
  id: number;
  user_id: number;
  pizza_dinner_id: number;
  ingredient_id: number;
  created_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface CreatePizzaDinnerRequest {
  title: string;
  description?: string;
  scheduled_date: string;
}

export interface CreateIngredientRequest {
  name: string;
  description?: string;
}

export interface UpdateSelectionRequest {
  pizza_dinner_id: number;
  ingredient_ids: number[];
}