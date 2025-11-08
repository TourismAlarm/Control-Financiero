/**
 * Database type definitions generated from Supabase schema
 * This file should be kept in sync with the database schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          currency: string;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          currency?: string;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          currency?: string;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      accounts: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: 'bank' | 'cash' | 'credit_card' | 'savings' | 'investment';
          balance: number;
          currency: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: 'bank' | 'cash' | 'credit_card' | 'savings' | 'investment';
          balance?: number;
          currency?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: 'bank' | 'cash' | 'credit_card' | 'savings' | 'investment';
          balance?: number;
          currency?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          type: 'income' | 'expense';
          icon: string | null;
          color: string | null;
          is_system: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          type: 'income' | 'expense';
          icon?: string | null;
          color?: string | null;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          type?: 'income' | 'expense';
          icon?: string | null;
          color?: string | null;
          is_system?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      transactions: {
        Row: {
          id: string;
          user_id: string;
          account_id: string | null;
          category_id: string | null;
          type: 'income' | 'expense';
          amount: number;
          description: string | null;
          date: string;
          notes: string | null;
          tags: string[] | null;
          recurring_rule_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id?: string | null;
          category_id?: string | null;
          type: 'income' | 'expense';
          amount: number;
          description?: string | null;
          date?: string;
          notes?: string | null;
          tags?: string[] | null;
          recurring_rule_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          account_id?: string | null;
          category_id?: string | null;
          type?: 'income' | 'expense';
          amount?: number;
          description?: string | null;
          date?: string;
          notes?: string | null;
          tags?: string[] | null;
          recurring_rule_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      recurring_rules: {
        Row: {
          id: string;
          user_id: string;
          account_id: string | null;
          category_id: string | null;
          type: 'income' | 'expense';
          amount: number;
          description: string;
          frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
          start_date: string;
          end_date: string | null;
          next_occurrence: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          account_id?: string | null;
          category_id?: string | null;
          type: 'income' | 'expense';
          amount: number;
          description: string;
          frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
          start_date: string;
          end_date?: string | null;
          next_occurrence: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          account_id?: string | null;
          category_id?: string | null;
          type?: 'income' | 'expense';
          amount?: number;
          description?: string;
          frequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';
          start_date?: string;
          end_date?: string | null;
          next_occurrence?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      budgets: {
        Row: {
          id: string;
          user_id: string;
          category_id: string;
          amount: number;
          month: number;
          year: number;
          alert_threshold: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          category_id: string;
          amount: number;
          month: number;
          year: number;
          alert_threshold?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          category_id?: string;
          amount?: number;
          month?: number;
          year?: number;
          alert_threshold?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      transfers: {
        Row: {
          id: string;
          user_id: string;
          from_account_id: string;
          to_account_id: string;
          amount: number;
          description: string | null;
          date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          from_account_id: string;
          to_account_id: string;
          amount: number;
          description?: string | null;
          date?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          from_account_id?: string;
          to_account_id?: string;
          amount?: number;
          description?: string | null;
          date?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      loans: {
        Row: {
          id: string;
          user_id: string;
          type: 'borrowed' | 'lent';
          contact_name: string;
          principal_amount: number;
          outstanding_amount: number;
          interest_rate: number;
          start_date: string;
          due_date: string | null;
          status: 'active' | 'paid' | 'cancelled';
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: 'borrowed' | 'lent';
          contact_name: string;
          principal_amount: number;
          outstanding_amount: number;
          interest_rate?: number;
          start_date: string;
          due_date?: string | null;
          status?: 'active' | 'paid' | 'cancelled';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: 'borrowed' | 'lent';
          contact_name?: string;
          principal_amount?: number;
          outstanding_amount?: number;
          interest_rate?: number;
          start_date?: string;
          due_date?: string | null;
          status?: 'active' | 'paid' | 'cancelled';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      loan_payments: {
        Row: {
          id: string;
          user_id: string;
          loan_id: string;
          amount: number;
          principal_paid: number;
          interest_paid: number;
          payment_date: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          loan_id: string;
          amount: number;
          principal_paid: number;
          interest_paid: number;
          payment_date: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          loan_id?: string;
          amount?: number;
          principal_paid?: number;
          interest_paid?: number;
          payment_date?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      savings_goals: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          target_amount: number;
          current_amount: number;
          target_date: string | null;
          description: string | null;
          icon: string | null;
          color: string | null;
          is_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          target_amount: number;
          current_amount?: number;
          target_date?: string | null;
          description?: string | null;
          icon?: string | null;
          color?: string | null;
          is_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          target_amount?: number;
          current_amount?: number;
          target_date?: string | null;
          description?: string | null;
          icon?: string | null;
          color?: string | null;
          is_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Helper types for easier access
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Account = Database['public']['Tables']['accounts']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type Transaction = Database['public']['Tables']['transactions']['Row'];
export type RecurringRule = Database['public']['Tables']['recurring_rules']['Row'];
export type Budget = Database['public']['Tables']['budgets']['Row'];
export type Transfer = Database['public']['Tables']['transfers']['Row'];
export type Loan = Database['public']['Tables']['loans']['Row'];
export type LoanPayment = Database['public']['Tables']['loan_payments']['Row'];
export type SavingsGoal = Database['public']['Tables']['savings_goals']['Row'];

// Insert types
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type AccountInsert = Database['public']['Tables']['accounts']['Insert'];
export type CategoryInsert = Database['public']['Tables']['categories']['Insert'];
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];
export type RecurringRuleInsert = Database['public']['Tables']['recurring_rules']['Insert'];
export type BudgetInsert = Database['public']['Tables']['budgets']['Insert'];
export type TransferInsert = Database['public']['Tables']['transfers']['Insert'];
export type LoanInsert = Database['public']['Tables']['loans']['Insert'];
export type LoanPaymentInsert = Database['public']['Tables']['loan_payments']['Insert'];
export type SavingsGoalInsert = Database['public']['Tables']['savings_goals']['Insert'];

// Update types
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
export type AccountUpdate = Database['public']['Tables']['accounts']['Update'];
export type CategoryUpdate = Database['public']['Tables']['categories']['Update'];
export type TransactionUpdate = Database['public']['Tables']['transactions']['Update'];
export type RecurringRuleUpdate = Database['public']['Tables']['recurring_rules']['Update'];
export type BudgetUpdate = Database['public']['Tables']['budgets']['Update'];
export type TransferUpdate = Database['public']['Tables']['transfers']['Update'];
export type LoanUpdate = Database['public']['Tables']['loans']['Update'];
export type LoanPaymentUpdate = Database['public']['Tables']['loan_payments']['Update'];
export type SavingsGoalUpdate = Database['public']['Tables']['savings_goals']['Update'];
