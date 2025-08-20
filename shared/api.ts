// Legacy demo types
export interface DemoResponse {
  message: string;
}

// User types
export interface UserRecord {
  id?: number;
  telegram_id: number;
  username?: string;
  first_name: string;
  last_name?: string;
  login_date: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserUpsertRequest {
  telegram_id: number;
  username?: string;
  first_name: string;
  last_name?: string;
  login_date: string;
}

// Lottery types
export interface LotteryTicket {
  id?: number;
  user_id: number;
  telegram_id: number;
  username?: string;
  ticket_code: string;
  month: string;
  year: number;
  is_winner: boolean;
  created_at?: string;
}

export interface CreateTicketRequest {
  user_id: number;
  telegram_id: number;
  username?: string;
  ticket_code: string;
  month: string;
  year: number;
  is_winner: boolean;
}

export interface SelectWinnerRequest {
  month: string;
  year: number;
}

// API Error response
export interface ApiError {
  error: string;
  details?: any;
}
