/**
 * Global type definitions for the application
 */

export type User = {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
};

export type Transaction = {
  id: string;
  userId: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  description: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type Budget = {
  id: string;
  userId: string;
  category: string;
  limit: number;
  month: number;
  year: number;
  createdAt: Date;
  updatedAt: Date;
};

export type Goal = {
  id: string;
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: Date;
  createdAt: Date;
  updatedAt: Date;
};
