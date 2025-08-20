import { createClient } from "@supabase/supabase-js";

// Get environment variables with proper validation (Vite client-side)
const getSupabaseConfig = () => {
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL as
    | string
    | undefined;
  const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY as
    | string
    | undefined;

  return { supabaseUrl: supabaseUrl || "", supabaseAnonKey: supabaseAnonKey || "" };
};

const { supabaseUrl, supabaseAnonKey } = getSupabaseConfig();

// Check if Supabase is properly configured
const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.includes("supabase.co") &&
  supabaseAnonKey.length > 50,
);

// Create client only when configured
let supabase: any = null;
if (isSupabaseConfigured) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.error("Failed to create Supabase client:", error);
    console.error("URL:", supabaseUrl);
    console.error("Key length:", supabaseAnonKey?.length);
    // Keep running in offline/fallback mode
    supabase = null;
  }
}

export { supabase };

// Database types
export interface UserRecord {
  id?: number;
  telegram_id: number;
  username?: string;
  first_name: string;
  last_name?: string;
  ref_code?: string;
  login_date: string;
  duna_coins?: number;
  ton_balance?: number;
  welcome_bonus_claimed?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface LotteryTicket {
  id?: number;
  user_id: number;
  ticket_code: string;
  month: string;
  year: number;
  is_winner: boolean;
  created_at?: string;
}

export interface CoinTransaction {
  id?: number;
  user_id: number;
  amount: number;
  type: "earn" | "spend" | "bonus" | "stake";
  description: string;
  created_at?: string;
}

export interface TonPayment {
  id?: number;
  user_id: number;
  ton_amount: number;
  duna_amount: number;
  transaction_id?: string;
  withdrawal_address?: string;
  status: "pending" | "completed" | "failed";
  created_at?: string;
}

export interface ReferralRecord {
  id?: number;
  inviter_user_id: number;
  invitee_user_id: number;
  created_at?: string;
}

export interface StakingPool {
  id?: number;
  coin_type: "TON" | "DUNA";
  total_staked: number;
  max_capacity: number;
  apy: number;
  lock_period_months: number;
  created_at?: string;
  updated_at?: string;
}

export interface StakingRecord {
  id?: number;
  user_id: number;
  pool_id: number;
  coin_type: "TON" | "DUNA";
  amount: number;
  staked_at: string;
  unlock_date: string;
  is_unlocked: boolean;
  profit_earned: number;
  created_at?: string;
}

export interface Winner {
  id?: number;
  ticket_code: string;
  prize: string;
  month: string;
  year: number;
  user_id?: number;
  created_at?: string;
}

// Helper function to handle errors consistently and return fallback signals
const handleError = (
  operation: string,
  error: any,
): "fallback" | "not_found" | never => {
  // Handle null/undefined errors
  if (!error) {
    console.log(`${operation} completed successfully (no error)`);
    return "not_found"; // Treat null error as success/not found
  }

  // Safely serialize error objects
  let errorMessage = "Unknown error";
  let errorCode = "";
  let errorDetails = "";

  try {
    // Better error message extraction
    if (error.message) {
      errorMessage = error.message;
    } else if (typeof error === "string") {
      errorMessage = error;
    } else if (error.toString && error.toString() !== "[object Object]") {
      errorMessage = error.toString();
    } else {
      errorMessage = "Unknown error";
    }

    errorCode = error?.code || "";
    errorDetails = error?.details || "";

    // Construct a safe error object for logging
    const safeErrorDetails = {
      message: errorMessage,
      code: errorCode,
      details: errorDetails,
      hint: error?.hint || "",
      status: error?.status || "",
      name: error?.name || "",
    };

    console.error(`Supabase ${operation} error:`, safeErrorDetails);
    console.error(
      `Error details: ${JSON.stringify(safeErrorDetails, null, 2)}`,
    );
  } catch (serializationError) {
    console.error(`${operation} error (serialization failed):`, errorMessage);
  }

  if (!isSupabaseConfigured) {
    console.warn(
      `Supabase not configured for ${operation}. Using fallback behavior.`,
    );
    return "fallback";
  }

  // Handle network errors gracefully - return fallback signal instead of throwing
  if (
    errorMessage.includes("Failed to fetch") ||
    errorMessage.includes("fetch failed") ||
    errorMessage.includes("NetworkError") ||
    error?.name === "TypeError" ||
    error?.name === "AbortError"
  ) {
    console.warn(
      `Network error for ${operation}. Database appears unreachable. Using fallback.`,
    );
    isOnline = false; // Update global connectivity status
    return "fallback";
  }

  // Handle Supabase-specific errors
  if (errorCode) {
    switch (errorCode) {
      case "PGRST116":
        // Not found - this is often OK, just return a signal
        return "not_found";
      case "23505":
        throw new Error(`${operation} failed: Duplicate entry`);
      case "23503":
        throw new Error(`${operation} failed: Referenced record not found`);
      case "42501":
        throw new Error(`${operation} failed: Insufficient permissions`);
      case "PGRST301":
        throw new Error(
          `${operation} failed: Row Level Security policy violated`,
        );
      default:
        throw new Error(`${operation} failed: ${errorMessage || errorCode}`);
    }
  }

  if (errorMessage && errorMessage !== "Unknown error") {
    throw new Error(`${operation} failed: ${errorMessage}`);
  }

  // Last resort - return fallback instead of throwing
  console.warn(`${operation} failed with unhandled error, using fallback`);
  return "fallback";
};

// Network connectivity state
let isOnline = true;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

// Check if we're online using a simple method
const checkNetworkConnectivity = async (): Promise<boolean> => {
  // Just use navigator.onLine as primary check
  // This is reliable for most cases and doesn't have CORS issues
  return navigator.onLine;
};

// Database health check with enhanced error handling
export const checkDatabaseHealth = async (force = false) => {
  const now = Date.now();

  // Don't check too frequently unless forced
  if (!force && now - lastHealthCheck < HEALTH_CHECK_INTERVAL) {
    return { connected: isOnline, cached: true };
  }

  lastHealthCheck = now;

  if (!isSupabaseConfigured) {
    console.warn("Supabase not configured");
    isOnline = false;
    return { connected: false, error: "Not configured", type: "config" };
  }

  try {
    // Skip network check if we're in Supabase configured mode - just test DB directly
    // Test database connection with a simple query and reasonable timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    const { data, error } = await supabase
      .from("users")
      .select("count(*)", { count: "exact" })
      .limit(1)
      .abortSignal(controller.signal);

    clearTimeout(timeoutId);

    if (error) {
      // Check if it's a meaningful error vs network issue
      const errorMessage = error?.message || "Database query failed";

      // If we get a proper database error (like permissions), we're actually connected
      if (
        error?.code &&
        !errorMessage.includes("fetch") &&
        !errorMessage.includes("network")
      ) {
        console.log("Database reachable but query failed:", errorMessage);
        isOnline = true;
        return { connected: true, error: errorMessage, type: "query_error" };
      }

      console.warn("Database health check failed:", errorMessage);
      isOnline = false;
      return {
        connected: false,
        error: errorMessage,
        code: error?.code,
        type: "database",
      };
    }

    console.log("Database health check passed");
    isOnline = true;
    return { connected: true, data, type: "success" };
  } catch (error) {
    // Safe error handling without throwing
    const errorMessage = error?.message || "Health check failed";
    console.warn("Database health check exception:", errorMessage);

    isOnline = false;

    // Determine error type safely
    let errorType = "unknown";
    if (error?.name === "AbortError") {
      errorType = "timeout";
    } else if (
      errorMessage.includes("Failed to fetch") ||
      errorMessage.includes("fetch")
    ) {
      errorType = "network";
    }

    return {
      connected: false,
      error: errorMessage,
      type: errorType,
    };
  }
};

// Get current connection status
export const isDbOnline = () => isOnline;

// Utility: generate a unique-looking referral code
const generateReferralCode = (seed?: number) => {
  const rand = Math.random().toString(36).slice(2, 8);
  const suffix = seed ? (seed % 100).toString(36).padStart(2, "0") : "";
  return (rand + suffix).toUpperCase();
};

// Database operations
export const dbOperations = {
  // User operations
  async upsertUser(user: Omit<UserRecord, "id" | "created_at" | "updated_at">) {
    if (!isSupabaseConfigured) {
      console.warn("Supabase not configured, using mock data");
      return {
        id: 1,
        ...user,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    try {
      // First check if user exists
      console.log("Checking if user exists for telegram_id:", user.telegram_id);
      let existingUser = null;
      try {
        existingUser = await this.getUser(user.telegram_id);
        console.log(
          "User lookup result:",
          existingUser ? "found" : "not found",
        );
      } catch (getUserError) {
        console.warn(
          "Failed to check if user exists, will attempt to create new user",
        );
        existingUser = null;
      }

      if (existingUser && existingUser.id) {
        // User exists, update login_date and other potentially changed fields
        console.log("Updating existing user with ID:", existingUser.id);
        // If user has no ref_code yet, assign one
        let assignedRefCode = existingUser.ref_code;
        if (!assignedRefCode) {
          for (let i = 0; i < 5; i++) {
            const candidate = generateReferralCode(user.telegram_id);
            const { data: conflict } = await supabase
              .from("users")
              .select("id")
              .eq("ref_code", candidate)
              .maybeSingle();
            if (!conflict) {
              assignedRefCode = candidate;
              break;
            }
          }
        }

        const { data, error } = await supabase
          .from("users")
          .update({
            username: user.username, // Update username in case it changed
            first_name: user.first_name, // Update name in case it changed
            last_name: user.last_name, // Update last name in case it changed
            login_date: user.login_date,
            ...(assignedRefCode && !existingUser.ref_code ? { ref_code: assignedRefCode } : {}),
          })
          .eq("telegram_id", user.telegram_id)
          .select()
          .single();

        const errorResult = handleError("updateUser", error);
        if (errorResult === "fallback") {
          console.warn("Update failed, using existing user data");
          return existingUser;
        }
        console.log("Successfully updated existing user:", data);
        return data || existingUser; // Return updated data or fallback to existing
      } else {
        // New user, create record with welcome bonus
        const newUserData = {
          ...user,
          duna_coins: 50, // Welcome bonus
          welcome_bonus_claimed: true,
          ref_code: generateReferralCode(user.telegram_id),
        };

        const { data, error } = await supabase
          .from("users")
          .insert(newUserData)
          .select()
          .single();

        // Handle duplicate key error specifically (race condition)
        if (error?.code === "23505") {
          console.warn(
            "User was created by another process, attempting to fetch existing user",
          );
          try {
            // Wait a bit to allow the other process to complete
            await new Promise((resolve) => setTimeout(resolve, 100));
            const existingUserRetry = await this.getUser(user.telegram_id);
            if (existingUserRetry) {
              console.log(
                "Found user created by another process:",
                existingUserRetry,
              );
              return existingUserRetry;
            }
          } catch (retryError) {
            console.warn(
              "Failed to fetch user after duplicate key error, using fallback",
            );
          }
        }

        const errorResult = handleError("createUser", error);
        if (errorResult === "fallback") {
          console.warn("Create failed, using mock user data");
          return {
            id: user.telegram_id, // Use telegram_id as fallback ID
            ...newUserData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
        }
        console.log("Created new user with welcome bonus:", data);
        return data;
      }
    } catch (error) {
      console.warn("Database operation failed, using fallback:", error);
      // Return mock user data as fallback
      return {
        id: Math.floor(Math.random() * 1000),
        ...user,
        duna_coins: 50,
        welcome_bonus_claimed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  },

  async getUser(telegramId: number) {
    if (!isSupabaseConfigured) {
      console.warn("Supabase not configured, using mock data");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("telegram_id", telegramId)
        .single();

      // Only handle error if there actually is one
      if (error) {
        const errorResult = handleError("getUser", error);
        if (errorResult === "not_found") {
          console.log(`No user found with telegram_id: ${telegramId}`);
          return null;
        }
        if (errorResult === "fallback") {
          console.warn("getUser failed due to network, returning null");
          return null;
        }
      }

      // No error, return the data
      console.log(`Successfully retrieved user for telegram_id ${telegramId}`);
      return data;
    } catch (error) {
      console.warn("Network error in getUser, returning null:", error);
      return null; // Return null gracefully on network errors
    }
  },

  async getUserByRefCode(refCode: string) {
    if (!isSupabaseConfigured) {
      console.warn("Supabase not configured, getUserByRefCode returns null");
      return null;
    }
    if (!refCode || typeof refCode !== "string") return null;
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("ref_code", refCode.toUpperCase())
        .maybeSingle();
      if (error) {
        const res = handleError("getUserByRefCode", error);
        if (res === "fallback" || res === "not_found") return null;
      }
      return data || null;
    } catch (e) {
      console.warn("getUserByRefCode exception:", e);
      return null;
    }
  },

  async ensureUserRefCode(telegramId: number): Promise<string | null> {
    if (!isSupabaseConfigured) return generateReferralCode(telegramId);
    try {
      let user = await this.getUser(telegramId);
      if (!user) {
        user = await this.upsertUser({
          telegram_id: telegramId,
          username: "",
          first_name: "Unknown",
          last_name: "",
          login_date: new Date().toISOString(),
        });
      }
      if (user?.ref_code) return user.ref_code;

      // Assign a unique code
      let code = "";
      for (let i = 0; i < 6; i++) {
        const candidate = generateReferralCode(telegramId);
        const { data: conflict } = await supabase
          .from("users")
          .select("id")
          .eq("ref_code", candidate)
          .maybeSingle();
        if (!conflict) {
          code = candidate;
          break;
        }
      }
      if (!code) code = generateReferralCode(telegramId);

      const { data, error } = await supabase
        .from("users")
        .update({ ref_code: code })
        .eq("telegram_id", telegramId)
        .select("ref_code")
        .single();
      if (error) {
        console.warn("Failed to assign ref_code:", error);
        return null;
      }
      return data?.ref_code || code;
    } catch (e) {
      console.warn("ensureUserRefCode exception:", e);
      return null;
    }
  },

  async getUserById(userId: number) {
    console.log(`getUserById called with userId: ${userId}`);

    if (!userId || typeof userId !== "number" || userId <= 0) {
      console.error("Invalid userId provided to getUserById:", userId);
      return null;
    }

    if (!isSupabaseConfigured) {
      console.warn("Supabase not configured, using mock data");
      return {
        id: userId,
        telegram_id: 1,
        username: "testuser",
        first_name: "Test",
        last_name: "User",
        duna_coins: 50,
        ton_balance: 0,
        login_date: new Date().toISOString(),
        welcome_bonus_claimed: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          console.log(`No user found with ID: ${userId}`);
          return null;
        }
        console.error("Database query failed for getUserById:", {
          userId,
          error: error.message,
          code: error.code,
          details: error.details,
        });
        return null;
      }

      console.log(`Successfully retrieved user by ID ${userId}:`, data);
      return data;
    } catch (error) {
      console.error("Network error in getUserById:", {
        userId,
        error: error?.message,
        details: JSON.stringify(error, null, 2),
      });
      return null;
    }
  },

  // Lottery operations
  async createLotteryTicket(ticket: Omit<LotteryTicket, "id" | "created_at">) {
    if (!isSupabaseConfigured) {
      console.warn("Supabase not configured, using mock data");
      return {
        id: Math.floor(Math.random() * 1000),
        ...ticket,
        created_at: new Date().toISOString(),
      };
    }

    try {
      // The ticket already has user_id, no need to lookup by telegram_id
      const { data, error } = await supabase
        .from("lottery_tickets")
        .insert(ticket)
        .select()
        .single();

      if (error) {
        console.warn("Database insert failed for createLotteryTicket:", error);
        // Return mock data as fallback
        return {
          id: Math.floor(Math.random() * 1000),
          ...ticket,
          created_at: new Date().toISOString(),
        };
      }
      console.log("Created new lottery ticket:", data);
      return data;
    } catch (error) {
      console.warn(
        "Network error in createLotteryTicket, using fallback:",
        error,
      );
      // Return mock data as fallback
      return {
        id: Math.floor(Math.random() * 1000),
        ...ticket,
        created_at: new Date().toISOString(),
      };
    }
  },

  async getUserTicketForMonth(telegramId: number, month: string, year: number) {
    if (!isSupabaseConfigured) {
      console.warn("Supabase not configured, using mock data");
      return null;
    }

    try {
      // Join with users table to get ticket by telegram_id
      const { data, error } = await supabase
        .from("lottery_tickets")
        .select(
          `
          *,
          users!inner(telegram_id)
        `,
        )
        .eq("users.telegram_id", telegramId)
        .eq("month", month)
        .eq("year", year)
        .single();

      if (error && error.code !== "PGRST116")
        handleError("getUserTicketForMonth", error);
      return data;
    } catch (error) {
      handleError("getUserTicketForMonth", error);
    }
  },

  async getUserTicketsForMonth(
    telegramId: number,
    month: string,
    year: number,
  ) {
    if (!isSupabaseConfigured) {
      console.warn("Supabase not configured, using mock data");
      return [];
    }

    try {
      // Join with users table to get tickets by telegram_id
      const { data, error } = await supabase
        .from("lottery_tickets")
        .select(
          `
          *,
          users!inner(telegram_id)
        `,
        )
        .eq("users.telegram_id", telegramId)
        .eq("month", month)
        .eq("year", year)
        .order("created_at", { ascending: true });

      if (error) {
        console.warn(
          "Database query failed for getUserTicketsForMonth:",
          error,
        );
        return [];
      }
      return data || [];
    } catch (error) {
      console.warn("Network error in getUserTicketsForMonth:", error);
      return [];
    }
  },

  async getWinnerForMonth(month: string, year: number) {
    if (!isSupabaseConfigured) {
      console.warn("Supabase not configured, using mock data");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("lottery_tickets")
        .select("*")
        .eq("month", month)
        .eq("year", year)
        .eq("is_winner", true)
        .single();

      if (error && error.code !== "PGRST116")
        handleError("getWinnerForMonth", error);
      return data;
    } catch (error) {
      handleError("getWinnerForMonth", error);
    }
  },

  async getAllTicketsForMonth(month: string, year: number) {
    if (!isSupabaseConfigured) {
      console.warn("Supabase not configured, using mock data");
      return [];
    }

    try {
      const { data, error } = await supabase
        .from("lottery_tickets")
        .select("*")
        .eq("month", month)
        .eq("year", year);

      if (error) handleError("getAllTicketsForMonth", error);
      return data;
    } catch (error) {
      handleError("getAllTicketsForMonth", error);
    }
  },

  // Coin operations
  async addCoinsByUserId(
    userId: number,
    telegramId: number,
    amount: number,
    type: "earn" | "spend" | "bonus",
    description: string,
  ) {
    console.log(
      `addCoinsByUserId called with: userId=${userId}, telegramId=${telegramId}, amount=${amount}, type=${type}`,
    );

    if (!isSupabaseConfigured) {
      console.warn("Supabase not configured, using mock coin transaction");
      return {
        id: Math.floor(Math.random() * 1000),
        user_id: userId,
        amount,
        type,
        description,
        created_at: new Date().toISOString(),
      };
    }

    try {
      // Validate inputs
      if (!userId || !telegramId) {
        throw new Error("Invalid user ID or telegram ID provided");
      }

      if (typeof amount !== "number" || isNaN(amount)) {
        throw new Error("Invalid amount provided");
      }

      // Get user first to update balance
      console.log(`Getting user by ID: ${userId}`);
      const user = await this.getUserById(userId);
      if (!user) {
        console.error(`User not found with ID: ${userId}`);
        throw new Error(`User with id ${userId} not found`);
      }

      console.log(`Current user balance: ${user.duna_coins || 0}`);

      // Calculate new balance and validate
      const currentBalance = user.duna_coins || 0;
      const newBalance = currentBalance + amount;

      // Prevent negative balance for spend operations
      if (type === "spend" && newBalance < 0) {
        throw new Error(
          `Insufficient balance. Current: ${currentBalance}, Attempted to spend: ${Math.abs(amount)}`,
        );
      }

      console.log(`Updating balance from ${currentBalance} to ${newBalance}`);

      // Update user balance
      const { error: updateError } = await supabase
        .from("users")
        .update({ duna_coins: newBalance })
        .eq("id", userId);

      if (updateError) {
        console.error("Error updating user balance:", updateError);
        const errorResult = handleError("updateUserBalance", updateError);
        if (errorResult === "fallback") {
          console.warn("Balance update failed, using offline mode");
          // Return mock transaction for offline mode
          return {
            id: Date.now(),
            user_id: userId,
            amount,
            type,
            description: description + " (offline)",
            created_at: new Date().toISOString(),
          };
        }
        return null;
      }

      // Create transaction record (normalized - only user_id, no telegram_id)
      const transaction = {
        user_id: userId,
        amount,
        type,
        description,
      };

      console.log("Creating transaction record:", transaction);

      const { data, error } = await supabase
        .from("coin_transactions")
        .insert(transaction)
        .select()
        .single();

      if (error) {
        console.error("Error creating transaction record:", error);
        // Try to rollback the balance update
        try {
          await supabase
            .from("users")
            .update({ duna_coins: currentBalance })
            .eq("id", userId);
        } catch (rollbackError) {
          console.warn("Failed to rollback balance update:", rollbackError);
        }

        const errorResult = handleError("addCoinsByUserId", error);
        if (errorResult === "fallback") {
          console.warn("Transaction creation failed, using offline mode");
          return {
            id: Date.now(),
            user_id: userId,
            amount,
            type,
            description: description + " (offline)",
            created_at: new Date().toISOString(),
          };
        }
        return null;
      }

      console.log("Successfully added coins. Transaction data:", data);
      return data;
    } catch (error) {
      console.error("Unexpected error in addCoinsByUserId:", error);
      handleError("addCoinsByUserId", error);
      return null;
    }
  },

  async addCoins(
    telegramId: number,
    amount: number,
    type: "earn" | "spend" | "bonus",
    description: string,
  ) {
    if (!isSupabaseConfigured) {
      console.warn("Supabase not configured, using mock coin transaction");
      return {
        id: Math.floor(Math.random() * 1000),
        user_id: 1,
        amount,
        type,
        description,
        created_at: new Date().toISOString(),
      };
    }

    try {
      // Get user first
      const user = await this.getUser(telegramId);
      if (!user) {
        throw new Error(`User with telegram_id ${telegramId} not found`);
      }

      // Update user balance
      const newBalance = (user.duna_coins || 0) + amount;
      await supabase
        .from("users")
        .update({ duna_coins: newBalance })
        .eq("telegram_id", telegramId);

      // Create transaction record (normalized - only user_id)
      const transaction = {
        user_id: user.id,
        amount,
        type,
        description,
      };

      const { data, error } = await supabase
        .from("coin_transactions")
        .insert(transaction)
        .select()
        .single();

      if (error) handleError("addCoins", error);
      console.log("Added coins:", data);
      return data;
    } catch (error) {
      handleError("addCoins", error);
    }
  },

  async getCoinTransactions(telegramId: number) {
    if (!isSupabaseConfigured) {
      console.warn("Supabase not configured, using mock transactions");
      return [];
    }

    try {
      // Join with users table to get transactions by telegram_id
      const { data, error } = await supabase
        .from("coin_transactions")
        .select(
          `
          *,
          users!inner(telegram_id)
        `,
        )
        .eq("users.telegram_id", telegramId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.warn("Database query failed for getCoinTransactions:", error);
        return []; // Return empty array instead of throwing
      }
      return data || [];
    } catch (error) {
      console.warn(
        "Network error in getCoinTransactions, returning empty array:",
        error,
      );
      return []; // Return empty array gracefully on network errors
    }
  },

  // TON payment operations
  async createTonPayment(payment: Omit<TonPayment, "id" | "created_at">) {
    if (!isSupabaseConfigured) {
      console.warn("Supabase not configured, using mock TON payment");
      return {
        id: Math.floor(Math.random() * 1000),
        ...payment,
        created_at: new Date().toISOString(),
      };
    }

    try {
      // Guard: prevent withdrawals that exceed available TON (balance - pending withdrawals)
      if (Number(payment.ton_amount) < 0 && payment.user_id) {
        const { data: userRow, error: userErr } = await supabase
          .from("users")
          .select("id, ton_balance")
          .eq("id", payment.user_id)
          .single();
        if (userErr) {
          console.warn("Failed to fetch user for withdrawal guard:", userErr);
        }

        const rawTon = Number(userRow?.ton_balance || 0);
        const { data: pendingRows, error: pendingErr } = await supabase
          .from("ton_payments")
          .select("ton_amount, status")
          .eq("user_id", payment.user_id)
          .eq("status", "pending");
        if (pendingErr) {
          console.warn(
            "Failed to fetch pending payments for withdrawal guard:",
            pendingErr,
          );
        }

        const pendingTotal = (pendingRows || [])
          .filter((p: any) => Number(p.ton_amount) < 0)
          .reduce(
            (sum: number, p: any) => sum + Math.abs(Number(p.ton_amount)),
            0,
          );

        const available = Math.max(0, rawTon - pendingTotal);
        const requestAmount = Math.abs(Number(payment.ton_amount));
        if (requestAmount > available) {
          throw new Error(
            `Insufficient TON for withdrawal. Available=${available}, Requested=${requestAmount}`,
          );
        }
      }

      // Payment already has user_id, no need for telegram_id lookup
      const { data, error } = await supabase
        .from("ton_payments")
        .insert(payment)
        .select()
        .single();

      if (error) {
        console.warn("Database insert failed for createTonPayment:", error);
        // Return mock data as fallback
        return {
          id: Math.floor(Math.random() * 1000),
          ...payment,
          created_at: new Date().toISOString(),
        };
      }
      console.log("Created TON payment:", data);
      return data;
    } catch (error) {
      console.warn("Network error in createTonPayment, using fallback:", error);
      // Return mock data as fallback
      return {
        id: Math.floor(Math.random() * 1000),
        ...payment,
        created_at: new Date().toISOString(),
      };
    }
  },

  async updateTonBalance(telegramId: number, tonAmount: number) {
    if (!isSupabaseConfigured) {
      console.warn("Supabase not configured, using mock TON balance update");
      return true;
    }

    try {
      // Get current user
      const user = await this.getUser(telegramId);
      if (!user) {
        console.warn(
          `User with telegram_id ${telegramId} not found for TON balance update`,
        );
        return false;
      }

      // Update TON balance with non-negative guard
      const currentTonBalance = Number(user.ton_balance || 0);
      const delta = Number(tonAmount);
      const newTonBalance = currentTonBalance + delta;
      if (delta < 0 && newTonBalance < 0) {
        console.warn(
          `Rejected TON balance update: insufficient funds. Current=${currentTonBalance}, Change=${delta}`,
        );
        return false;
      }
      const { error } = await supabase
        .from("users")
        .update({ ton_balance: newTonBalance })
        .eq("telegram_id", telegramId);

      if (error) {
        console.warn("Database update failed for updateTonBalance:", error);
        return false;
      }
      console.log(
        `Updated TON balance for user ${telegramId}: +${tonAmount} TON`,
      );
      return true;
    } catch (error) {
      console.warn("Network error in updateTonBalance:", error);
      return false;
    }
  },

  async getTonPayments(telegramId: number) {
    if (!isSupabaseConfigured) {
      console.warn("Supabase not configured, using mock TON payments");
      return [];
    }

    try {
      // Join with users table to get payments by telegram_id
      const { data, error } = await supabase
        .from("ton_payments")
        .select(
          `
          *,
          users!inner(telegram_id)
        `,
        )
        .eq("users.telegram_id", telegramId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        console.warn("Database query failed for getTonPayments:", error);
        return []; // Return empty array instead of throwing
      }
      return data || [];
    } catch (error) {
      console.warn(
        "Network error in getTonPayments, returning empty array:",
        error,
      );
      return []; // Return empty array gracefully on network errors
    }
  },

  // Referral operations
  async recordReferral(inviterTelegramId: number, inviteeTelegramId: number) {
    if (!isSupabaseConfigured) {
      console.warn("Supabase not configured, skipping referral record");
      return null;
    }

    try {
      // Prevent self referrals
      if (inviterTelegramId === inviteeTelegramId) {
        console.warn("Ignoring self-referral attempt");
        return null;
      }

      // Resolve users; create minimal records if missing so referral can be stored idempotently
      let inviter = await this.getUser(inviterTelegramId);
      if (!inviter) {
        inviter = await this.upsertUser({
          telegram_id: inviterTelegramId,
          username: "",
          first_name: "Unknown",
          last_name: "",
          login_date: new Date().toISOString(),
          duna_coins: 50,
          ton_balance: 0,
          welcome_bonus_claimed: true,
        });
      }

      let invitee = await this.getUser(inviteeTelegramId);
      if (!invitee) {
        invitee = await this.upsertUser({
          telegram_id: inviteeTelegramId,
          username: "",
          first_name: "Unknown",
          last_name: "",
          login_date: new Date().toISOString(),
          duna_coins: 50,
          ton_balance: 0,
          welcome_bonus_claimed: true,
        });
      }

      if (!inviter || !invitee) {
        console.warn("Failed to resolve inviter or invitee for referral after upsert");
        return null;
      }

      // Avoid duplicate referral
      const { data: existing, error: existingErr } = await supabase
        .from("referrals")
        .select("id")
        .eq("inviter_user_id", inviter.id)
        .eq("invitee_user_id", invitee.id)
        .maybeSingle();
      if (existingErr) {
        console.warn("Referral check failed:", existingErr);
      }
      if (existing) return existing;

      const { data, error } = await supabase
        .from("referrals")
        .insert({ inviter_user_id: inviter.id, invitee_user_id: invitee.id })
        .select()
        .single();
      if (error) {
        // Handle duplicate created by race condition
        if ((error as any)?.code === "23505") {
          const { data: dup } = await supabase
            .from("referrals")
            .select("id")
            .eq("inviter_user_id", inviter.id)
            .eq("invitee_user_id", invitee.id)
            .maybeSingle();
          if (dup) return dup;
        }
        console.warn("Failed to create referral:", error);
        return null;
      }

      // Award 50 DUNA to both
      try {
        await this.addCoinsByUserId(inviter.id, inviterTelegramId, 50, "bonus", "Referral bonus (inviter)");
        await this.addCoinsByUserId(invitee.id, inviteeTelegramId, 50, "bonus", "Referral bonus (invitee)");
      } catch (awardErr) {
        console.warn("Failed to award referral bonus:", awardErr);
      }

      return data;
    } catch (error) {
      console.warn("recordReferral exception:", error);
      return null;
    }
  },

  async activateReferralByCode(inviteeTelegramId: number, friendRefCode: string) {
    if (!isSupabaseConfigured) {
      console.warn("Supabase not configured, skipping activateReferralByCode");
      return { ok: false, message: "Offline" };
    }
    try {
      let invitee = await this.getUser(inviteeTelegramId);
      if (!invitee) {
        const created = await this.upsertUser({
          telegram_id: inviteeTelegramId,
          username: "",
          first_name: "Unknown",
          last_name: "",
          login_date: new Date().toISOString(),
        });
        if (!created) return { ok: false, message: "Failed to create invitee" };
        invitee = created;
      }

      const inviter = await this.getUserByRefCode(friendRefCode);
      if (!inviter) return { ok: false, message: "Invalid code" };
      if (inviter.telegram_id === inviteeTelegramId) return { ok: false, message: "You cannot use your own code" };

      // Prevent multiple referrals for the same invitee
      const { data: existingForInvitee, error: existingErr } = await supabase
        .from("referrals")
        .select("id")
        .eq("invitee_user_id", invitee.id)
        .maybeSingle();
      if (existingErr) {
        console.warn("Failed to check existing referral for invitee:", existingErr);
      }
      if (existingForInvitee) {
        return { ok: false, message: "Referral already activated" };
      }

      // Create referral and award bonuses
      const created = await this.recordReferral(inviter.telegram_id, inviteeTelegramId);
      if (!created) return { ok: false, message: "Failed to activate referral" };
      return { ok: true, message: "Referral activated" };
    } catch (e) {
      console.warn("activateReferralByCode exception:", e);
      return { ok: false, message: "Error activating referral" };
    }
  },

  async getInvitedFriendsByTelegramId(inviterTelegramId: number) {
    if (!isSupabaseConfigured) return [];
    try {
      const inviter = await this.getUser(inviterTelegramId);
      if (!inviter) return [];
      const { data, error } = await supabase
        .from("referrals")
        .select("*, invitee:invitee_user_id(id, telegram_id, username, first_name, last_name)")
        .eq("inviter_user_id", inviter.id)
        .order("created_at", { ascending: false });
      if (error) {
        console.warn("getInvitedFriends failed:", error);
        return [];
      }
      return data || [];
    } catch (e) {
      console.warn("getInvitedFriends exception:", e);
      return [];
    }
  },

  async getTopInviters(limit = 10) {
    if (!isSupabaseConfigured) return [];
    try {
      const { data, error } = await supabase
        .from("referrals")
        .select("inviter_user_id, total_invites:inviter_user_id.count(), users!inner(id, telegram_id, username, first_name, last_name)")
        .group("inviter_user_id, users(id, telegram_id, username, first_name, last_name)")
        .order("total_invites", { ascending: false })
        .limit(limit);
      if (error) {
        console.warn("getTopInviters failed, returning empty:", error);
        return [];
      }
      return (data || []).map((row: any) => ({ user: row.users, total_invites: Number(row.total_invites || 0) }));
    } catch (e) {
      console.warn("getTopInviters exception:", e);
      return [];
    }
  },

  // Leaderboards
  async getTopUsersByDunaCoins(limit = 10) {
    if (!isSupabaseConfigured) {
      // Fallback mock leaderboard
      return Array.from({ length: limit }).map((_, i) => ({
        user: {
          id: i + 1,
          telegram_id: 1000 + i,
          username: `user${i + 1}`,
          first_name: `User ${i + 1}`,
          last_name: "",
        },
        duna_coins: 1000 - i * 25,
      }));
    }

    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, telegram_id, username, first_name, last_name, duna_coins")
        .order("duna_coins", { ascending: false })
        .limit(limit);

      if (error) {
        console.warn("getTopUsersByDunaCoins failed, returning empty array:", error);
        return [];
      }

      return (data || []).map((u: any) => ({ user: u, duna_coins: u.duna_coins || 0 }));
    } catch (error) {
      console.warn("Network error in getTopUsersByDunaCoins:", error);
      return [];
    }
  },

  // Staking operations
  async getStakingPools() {
    if (!isSupabaseConfigured) {
      // Fallback mock pools
      return [
        {
          id: 1,
          coin_type: "TON" as const,
          total_staked: 0,
          max_capacity: 10000,
          apy: 38,
          lock_period_months: 3,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 2,
          coin_type: "DUNA" as const,
          total_staked: 0,
          max_capacity: 1000000,
          apy: 38,
          lock_period_months: 3,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
    }

    try {
      // Calculate totals from coin_transactions table where type is "stake"
      const { data: transactions, error } = await supabase
        .from("coin_transactions")
        .select("amount, description")
        .eq("type", "stake");

      if (error) {
        console.warn("Error fetching staking transactions for pools:", error);
        // Return fallback pools if table doesn't exist
        return [
          {
            id: 1,
            coin_type: "TON" as const,
            total_staked: 0,
            max_capacity: 10000,
            apy: 38,
            lock_period_months: 3,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: 2,
            coin_type: "DUNA" as const,
            total_staked: 0,
            max_capacity: 1000000,
            apy: 38,
            lock_period_months: 3,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ];
      }

      // Calculate totals from transactions
      // Parse description to determine coin type and amount
      let tonTotal = 0;
      let dunaTotal = 0;

      transactions?.forEach(transaction => {
        const description = transaction.description || '';
        const amount = Number(transaction.amount || 0);
        
        if (description.includes('TON') && description.includes('stake')) {
          tonTotal += amount;
        } else if (description.includes('Duna') && description.includes('stake')) {
          dunaTotal += amount;
        }
      });

      return [
        {
          id: 1,
          coin_type: "TON" as const,
          total_staked: tonTotal,
          max_capacity: 10000,
          apy: 38,
          lock_period_months: 3,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 2,
          coin_type: "DUNA" as const,
          total_staked: dunaTotal,
          max_capacity: 1000000,
          apy: 38,
          lock_period_months: 3,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
    } catch (error) {
      console.warn("Network error in getStakingPools:", error);
      // Return fallback pools on any error
      return [
        {
          id: 1,
          coin_type: "TON" as const,
          total_staked: 0,
          max_capacity: 10000,
          apy: 38,
          lock_period_months: 3,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: 2,
          coin_type: "DUNA" as const,
          total_staked: 0,
          max_capacity: 1000000,
          apy: 38,
          lock_period_months: 3,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ];
    }
  },

  async getUserStakingRecords(userId: number) {
    if (!isSupabaseConfigured) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from("coin_transactions")
        .select("*")
        .eq("user_id", userId)
        .eq("type", "stake")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Error fetching user staking records:", error);
        // Return empty array if table doesn't exist
        return [];
      }

      // Convert coin transactions to staking record format
      const stakingRecords = data?.map(transaction => {
        const description = transaction.description || '';
        const isTON = description.includes('TON');
        const isDuna = description.includes('Duna');
        
        // Calculate unlock date (3 months from staking date)
        const stakedAt = new Date(transaction.created_at || new Date());
        const unlockDate = new Date(stakedAt);
        unlockDate.setMonth(unlockDate.getMonth() + 3);
        
        // Check if stake is unlocked (past unlock date)
        const isUnlocked = new Date() > unlockDate;
        
        return {
          id: transaction.id,
          user_id: transaction.user_id,
          pool_id: isTON ? 1 : 2,
          coin_type: isTON ? "TON" : "DUNA" as "TON" | "DUNA",
          amount: Number(transaction.amount || 0),
          staked_at: stakedAt.toISOString(),
          unlock_date: unlockDate.toISOString(),
          is_unlocked: isUnlocked,
          profit_earned: 0, // Calculate based on APY and time
          created_at: transaction.created_at,
        };
      }) || [];

      return stakingRecords;
    } catch (error) {
      console.warn("Network error in getUserStakingRecords:", error);
      // Return empty array on any error
      return [];
    }
  },

  async stakeCoins(userId: number, coinType: "TON" | "DUNA", amount: number) {
    if (!isSupabaseConfigured) {
      // Fallback mock staking
      const unlockDate = new Date();
      unlockDate.setMonth(unlockDate.getMonth() + 3);
      
      return {
        id: Math.floor(Math.random() * 1000),
        user_id: userId,
        pool_id: coinType === "TON" ? 1 : 2,
        coin_type: coinType,
        amount: amount,
        staked_at: new Date().toISOString(),
        unlock_date: unlockDate.toISOString(),
        is_unlocked: false,
        profit_earned: 0,
        created_at: new Date().toISOString(),
      };
    }

    try {
      // Create coin transaction for staking
      const description = `Staking ${amount} ${coinType} coins for 3 months at 38% APY`;
      
      const { data, error } = await supabase
        .from("coin_transactions")
        .insert({
          user_id: userId,
          amount: amount,
          type: "stake",
          description: description,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Staking failed: ${error.message}`);
      }

      // Return mock staking record for compatibility
      const unlockDate = new Date();
      unlockDate.setMonth(unlockDate.getMonth() + 3);
      
      return {
        id: data.id,
        user_id: userId,
        pool_id: coinType === "TON" ? 1 : 2,
        coin_type: coinType,
        amount: amount,
        staked_at: new Date().toISOString(),
        unlock_date: unlockDate.toISOString(),
        is_unlocked: false,
        profit_earned: 0,
        created_at: data.created_at,
      };
    } catch (error) {
      console.error("Error in stakeCoins:", error);
      throw error;
    }
  },

  async unlockStakedCoins(stakingRecordId: number) {
    if (!isSupabaseConfigured) {
      return true;
    }

    try {
      // For coin transactions, we can't really "unlock" since it's just a transaction record
      // Instead, we'll create a new transaction to record the unlock
      // Get the original staking transaction first
      const { data: stakingTransaction, error: fetchError } = await supabase
        .from("coin_transactions")
        .select("*")
        .eq("id", stakingRecordId)
        .eq("type", "stake")
        .single();

      if (fetchError || !stakingTransaction) {
        throw new Error(`Staking transaction not found: ${fetchError?.message || "Unknown error"}`);
      }

      // Create unlock transaction
      const { error: unlockError } = await supabase
        .from("coin_transactions")
        .insert({
          user_id: stakingTransaction.user_id,
          amount: stakingTransaction.amount,
          type: "earn",
          description: `Unlocked staked ${stakingTransaction.amount} coins (original stake ID: ${stakingRecordId})`,
        });

      if (unlockError) {
        throw new Error(`Unlock failed: ${unlockError.message}`);
      }

      return true;
    } catch (error) {
      console.error("Error in unlockStakedCoins:", error);
      throw error;
    }
  },

  // Winner operations
  async getWinners(limit = 20) {
    if (!isSupabaseConfigured) {
      // Fallback mock winners
      return [
        { id: 1, ticket_code: "9VDA-80I5", prize: "1000 TON", month: "December", year: 2024, created_at: new Date().toISOString() },
        { id: 2, ticket_code: "IG6K-GCP4", prize: "100 TON", month: "November", year: 2024, created_at: new Date().toISOString() },
        { id: 3, ticket_code: "0KOU-PW1R", prize: "50 TON", month: "October", year: 2024, created_at: new Date().toISOString() },
        { id: 4, ticket_code: "4U3P-FGJ5", prize: "10 TON", month: "September", year: 2024, created_at: new Date().toISOString() },
        { id: 5, ticket_code: "HXD8-CTQX", prize: "10 TON", month: "August", year: 2024, created_at: new Date().toISOString() },
      ];
    }

    try {
      const { data, error } = await supabase
        .from("winners")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        console.warn("Error fetching winners:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.warn("Network error in getWinners:", error);
      return [];
    }
  },

  async getWinnersByMonth(month: string, year: number) {
    if (!isSupabaseConfigured) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from("winners")
        .select("*")
        .eq("month", month)
        .eq("year", year)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Error fetching winners by month:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.warn("Network error in getWinnersByMonth:", error);
      return [];
    }
  },

  async createWinner(winner: Omit<Winner, "id" | "created_at">) {
    if (!isSupabaseConfigured) {
      return {
        id: Math.floor(Math.random() * 1000),
        ...winner,
        created_at: new Date().toISOString(),
      };
    }

    try {
      const { data, error } = await supabase
        .from("winners")
        .insert(winner)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create winner: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("Error in createWinner:", error);
      throw error;
    }
  },

  async getTopUsersByTonTransferred(limit = 10) {
    if (!isSupabaseConfigured) {
      // Fallback mock leaderboard
      return Array.from({ length: limit }).map((_, i) => ({
        user: {
          id: i + 1,
          telegram_id: 2000 + i,
          username: `tonuser${i + 1}`,
          first_name: `TON ${i + 1}`,
          last_name: "",
        },
        total_ton: Number((500 - i * 10).toFixed(2)),
      }));
    }

    // Try server-side aggregation first; if it fails, fallback to client-side aggregation
    try {
      const { data, error } = await supabase
        .from("ton_payments")
        .select(
          `
          user_id,
          total_ton:ton_amount.sum(),
          users!inner(id, telegram_id, username, first_name, last_name)
        `,
        )
        .eq("status", "completed")
        .gt("ton_amount", 0)
        .group("user_id, users(id, telegram_id, username, first_name, last_name)")
        .order("total_ton", { ascending: false })
        .limit(limit);

      if (!error && data) {
        return data.map((row: any) => ({
          user: row.users,
          total_ton: Number(row.total_ton || 0),
        }));
      }

      console.warn("Aggregation query failed in getTopUsersByTonTransferred, falling back:", error);
    } catch (err) {
      console.warn("Exception during aggregation in getTopUsersByTonTransferred, falling back:", err);
    }

    try {
      // Fallback: fetch recent payments and aggregate client-side
      const { data, error } = await supabase
        .from("ton_payments")
        .select(
          `user_id, ton_amount, status, users!inner(id, telegram_id, username, first_name, last_name)`,
        )
        .eq("status", "completed")
        .gt("ton_amount", 0)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) {
        console.warn("Fallback select failed in getTopUsersByTonTransferred:", error);
        return [];
      }

      const totalsByUser = new Map<number, { user: any; total: number }>();
      (data || []).forEach((row: any) => {
        const user = row.users;
        if (!user?.id) return;
        const current = totalsByUser.get(user.id) || { user, total: 0 };
        current.total += Number(row.ton_amount || 0);
        totalsByUser.set(user.id, current);
      });

      const sorted = Array.from(totalsByUser.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, limit)
        .map(({ user, total }) => ({ user, total_ton: Number(total.toFixed(3)) }));

      return sorted;
    } catch (fallbackErr) {
      console.warn("Client-side aggregation failed in getTopUsersByTonTransferred:", fallbackErr);
      return [];
    }
  },
};

// Export configuration status for debugging
export const supabaseConfig = {
  isConfigured: isSupabaseConfigured,
  url: supabaseUrl,
  hasValidKey: supabaseAnonKey.length > 50,
};