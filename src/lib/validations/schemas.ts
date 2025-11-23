import { z } from 'zod';

/**
 * Validation schemas for the financial control application
 * Uses Zod for runtime type checking and validation
 */

// ==========================================
// TRANSACTION SCHEMAS
// ==========================================

export const transactionTypeSchema = z.enum(['income', 'expense']);

// Category info embedded in transaction (from JOIN)
export const transactionCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.enum(['income', 'expense']).optional(),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
}).nullable().optional();

export const transactionSchema = z.object({
  id: z.string().or(z.number()).optional(),
  user_id: z.string().optional(), // Google ID (not UUID)
  account_id: z.string().uuid().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  category: transactionCategorySchema, // Embedded category from JOIN
  type: transactionTypeSchema,
  amount: z
    .number()
    .positive({ message: 'El monto debe ser mayor a 0' })
    .or(z.string().transform((val) => parseFloat(val)))
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'Monto inválido',
    }),
  description: z.string().min(1, { message: 'La descripción es requerida' }).max(500),
  date: z.string().or(z.date()).optional(),
  notes: z.string().max(1000).nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  recurring_rule_id: z.string().uuid().nullable().optional(),
  created_at: z.string().or(z.date()).optional(),
  updated_at: z.string().or(z.date()).optional(),
});

export const transactionInsertSchema = transactionSchema.omit({
  id: true,
  category: true, // Category comes from JOIN, not inserted
  created_at: true,
  updated_at: true,
});

export const transactionUpdateSchema = transactionSchema.omit({ category: true }).partial().required({ id: true });

// ==========================================
// ACCOUNT SCHEMAS
// ==========================================

export const accountTypeSchema = z.enum(['bank', 'cash', 'credit_card', 'savings', 'investment']);

export const accountSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string(), // Google ID (not UUID)
  name: z.string().min(1, { message: 'El nombre es requerido' }).max(100),
  type: accountTypeSchema,
  balance: z
    .number()
    .or(z.string().transform((val) => parseFloat(val)))
    .refine((val) => !isNaN(Number(val)), { message: 'Balance inválido' }),
  currency: z.string().default('EUR'),
  is_active: z.boolean().default(true),
  created_at: z.string().or(z.date()).optional(),
  updated_at: z.string().or(z.date()).optional(),
});

export const accountInsertSchema = accountSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const accountUpdateSchema = accountSchema.partial().required({ id: true });

// ==========================================
// CATEGORY SCHEMAS
// ==========================================

export const categoryTypeSchema = z.enum(['income', 'expense']);

export const categorySchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string(), // Google ID (not UUID)
  name: z.string().min(1, { message: 'El nombre es requerido' }).max(100),
  type: categoryTypeSchema,
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  is_system: z.boolean().default(false),
  created_at: z.string().or(z.date()).optional(),
  updated_at: z.string().or(z.date()).optional(),
});

export const categoryInsertSchema = categorySchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const categoryUpdateSchema = categorySchema.partial().required({ id: true });

// ==========================================
// RECURRING RULE SCHEMAS
// ==========================================

export const frequencySchema = z.enum([
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'yearly',
]);

export const recurringRuleSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string(), // Google ID (not UUID)
  account_id: z.string().uuid().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  type: transactionTypeSchema,
  amount: z
    .number()
    .positive({ message: 'El monto debe ser mayor a 0' })
    .or(z.string().transform((val) => parseFloat(val)))
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'Monto inválido',
    }),
  description: z.string().min(1, { message: 'La descripción es requerida' }).max(500),
  frequency: frequencySchema,
  start_date: z.string().or(z.date()),
  end_date: z.string().or(z.date()).nullable().optional(),
  next_occurrence: z.string().or(z.date()),
  is_active: z.boolean().default(true),
  created_at: z.string().or(z.date()).optional(),
  updated_at: z.string().or(z.date()).optional(),
});

export const recurringRuleInsertSchema = recurringRuleSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const recurringRuleUpdateSchema = recurringRuleSchema.partial().required({ id: true });

// ==========================================
// BUDGET SCHEMAS
// ==========================================

export const budgetSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string(), // Google ID (not UUID)
  category_id: z.string().uuid(),
  amount: z
    .number()
    .positive({ message: 'El monto debe ser mayor a 0' })
    .or(z.string().transform((val) => parseFloat(val)))
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'Monto inválido',
    }),
  month: z
    .number()
    .int()
    .min(1, { message: 'Mes debe estar entre 1 y 12' })
    .max(12, { message: 'Mes debe estar entre 1 y 12' }),
  year: z
    .number()
    .int()
    .min(2000, { message: 'Año debe ser mayor o igual a 2000' }),
  alert_threshold: z
    .number()
    .min(0)
    .max(100)
    .default(80)
    .or(z.string().transform((val) => parseFloat(val)))
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 100, {
      message: 'Umbral debe estar entre 0 y 100',
    }),
  created_at: z.string().or(z.date()).optional(),
  updated_at: z.string().or(z.date()).optional(),
});

export const budgetInsertSchema = budgetSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const budgetUpdateSchema = budgetSchema.partial().required({ id: true });

// ==========================================
// TRANSFER SCHEMAS
// ==========================================

export const transferSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string(), // Google ID (not UUID)
  from_account_id: z.string().uuid(),
  to_account_id: z.string().uuid(),
  amount: z
    .number()
    .positive({ message: 'El monto debe ser mayor a 0' })
    .or(z.string().transform((val) => parseFloat(val)))
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'Monto inválido',
    }),
  description: z.string().max(500).nullable().optional(),
  date: z.string().or(z.date()).optional(),
  created_at: z.string().or(z.date()).optional(),
  updated_at: z.string().or(z.date()).optional(),
}).refine((data) => data.from_account_id !== data.to_account_id, {
  message: 'Las cuentas de origen y destino deben ser diferentes',
  path: ['to_account_id'],
});

export const transferInsertSchema = transferSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const transferUpdateSchema = transferSchema.partial().required({ id: true });

// ==========================================
// LOAN SCHEMAS
// ==========================================

export const loanTypeSchema = z.enum(['borrowed', 'lent']);
export const loanStatusSchema = z.enum(['active', 'paid', 'cancelled']);

export const loanSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string(), // Google ID (not UUID)
  type: loanTypeSchema,
  contact_name: z.string().min(1, { message: 'El nombre del contacto es requerido' }).max(200),
  principal_amount: z
    .number()
    .positive({ message: 'El monto debe ser mayor a 0' })
    .or(z.string().transform((val) => parseFloat(val)))
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'Monto inválido',
    }),
  outstanding_amount: z
    .number()
    .nonnegative({ message: 'El monto pendiente no puede ser negativo' })
    .or(z.string().transform((val) => parseFloat(val)))
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: 'Monto pendiente inválido',
    }),
  interest_rate: z
    .number()
    .nonnegative()
    .default(0)
    .or(z.string().transform((val) => parseFloat(val)))
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: 'Tasa de interés inválida',
    }),
  start_date: z.string().or(z.date()),
  due_date: z.string().or(z.date()).nullable().optional(),
  status: loanStatusSchema.default('active'),
  notes: z.string().max(1000).nullable().optional(),
  created_at: z.string().or(z.date()).optional(),
  updated_at: z.string().or(z.date()).optional(),
});

export const loanInsertSchema = loanSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const loanUpdateSchema = loanSchema.partial().required({ id: true });

// ==========================================
// LOAN PAYMENT SCHEMAS
// ==========================================

export const loanPaymentSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string(), // Google ID (not UUID)
  loan_id: z.string().uuid(),
  amount: z
    .number()
    .positive({ message: 'El monto debe ser mayor a 0' })
    .or(z.string().transform((val) => parseFloat(val)))
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'Monto inválido',
    }),
  principal_paid: z
    .number()
    .nonnegative()
    .or(z.string().transform((val) => parseFloat(val)))
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: 'Monto de principal inválido',
    }),
  interest_paid: z
    .number()
    .nonnegative()
    .or(z.string().transform((val) => parseFloat(val)))
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: 'Monto de interés inválido',
    }),
  payment_date: z.string().or(z.date()),
  notes: z.string().max(1000).nullable().optional(),
  created_at: z.string().or(z.date()).optional(),
  updated_at: z.string().or(z.date()).optional(),
});

export const loanPaymentInsertSchema = loanPaymentSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const loanPaymentUpdateSchema = loanPaymentSchema.partial().required({ id: true });

// ==========================================
// SAVINGS GOAL SCHEMAS
// ==========================================

export const savingsGoalSchema = z.object({
  id: z.string().uuid().optional(),
  user_id: z.string(), // Google ID (not UUID)
  name: z.string().min(1, { message: 'El nombre es requerido' }).max(200),
  target_amount: z
    .number()
    .positive({ message: 'El monto objetivo debe ser mayor a 0' })
    .or(z.string().transform((val) => parseFloat(val)))
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: 'Monto objetivo inválido',
    }),
  current_amount: z
    .number()
    .nonnegative()
    .default(0)
    .or(z.string().transform((val) => parseFloat(val)))
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: 'Monto actual inválido',
    }),
  target_date: z.string().or(z.date()).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  is_completed: z.boolean().default(false),
  created_at: z.string().or(z.date()).optional(),
  updated_at: z.string().or(z.date()).optional(),
});

export const savingsGoalInsertSchema = savingsGoalSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const savingsGoalUpdateSchema = savingsGoalSchema.partial().required({ id: true });

// ==========================================
// PROFILE SCHEMA
// ==========================================

export const profileSchema = z.object({
  id: z.string(), // Google ID (not UUID)
  email: z.string().email({ message: 'Email inválido' }),
  full_name: z.string().max(200).nullable().optional(),
  avatar_url: z.string().url().nullable().optional(),
  currency: z.string().default('EUR'),
  financial_month_start_day: z
    .number()
    .int()
    .min(1)
    .max(28)
    .default(1)
    .optional(),
  onboarding_completed: z.boolean().default(false).optional(),
  created_at: z.string().or(z.date()).optional(),
  updated_at: z.string().or(z.date()).optional(),
});

export const profileInsertSchema = profileSchema.omit({
  created_at: true,
  updated_at: true,
});

export const profileUpdateSchema = profileSchema.partial().required({ id: true });

// ==========================================
// TYPE EXPORTS
// ==========================================

export type Transaction = z.infer<typeof transactionSchema>;
export type TransactionInsert = z.infer<typeof transactionInsertSchema>;
export type TransactionUpdate = z.infer<typeof transactionUpdateSchema>;

export type Account = z.infer<typeof accountSchema>;
export type AccountInsert = z.infer<typeof accountInsertSchema>;
export type AccountUpdate = z.infer<typeof accountUpdateSchema>;

export type Category = z.infer<typeof categorySchema>;
export type CategoryInsert = z.infer<typeof categoryInsertSchema>;
export type CategoryUpdate = z.infer<typeof categoryUpdateSchema>;

export type RecurringRule = z.infer<typeof recurringRuleSchema>;
export type RecurringRuleInsert = z.infer<typeof recurringRuleInsertSchema>;
export type RecurringRuleUpdate = z.infer<typeof recurringRuleUpdateSchema>;

export type Budget = z.infer<typeof budgetSchema>;
export type BudgetInsert = z.infer<typeof budgetInsertSchema>;
export type BudgetUpdate = z.infer<typeof budgetUpdateSchema>;

export type Transfer = z.infer<typeof transferSchema>;
export type TransferInsert = z.infer<typeof transferInsertSchema>;
export type TransferUpdate = z.infer<typeof transferUpdateSchema>;

export type Loan = z.infer<typeof loanSchema>;
export type LoanInsert = z.infer<typeof loanInsertSchema>;
export type LoanUpdate = z.infer<typeof loanUpdateSchema>;

export type LoanPayment = z.infer<typeof loanPaymentSchema>;
export type LoanPaymentInsert = z.infer<typeof loanPaymentInsertSchema>;
export type LoanPaymentUpdate = z.infer<typeof loanPaymentUpdateSchema>;

export type SavingsGoal = z.infer<typeof savingsGoalSchema>;
export type SavingsGoalInsert = z.infer<typeof savingsGoalInsertSchema>;
export type SavingsGoalUpdate = z.infer<typeof savingsGoalUpdateSchema>;

export type Profile = z.infer<typeof profileSchema>;
export type ProfileInsert = z.infer<typeof profileInsertSchema>;
export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
