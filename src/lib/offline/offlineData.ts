import { db, STORES } from './indexedDB';
import { syncQueue } from './syncQueue';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

interface Transaction {
  id: string;
  [key: string]: any;
}

interface Account {
  id: string;
  [key: string]: any;
}

interface Category {
  id: string;
  [key: string]: any;
}

class OfflineDataManager {
  /**
   * Obtiene transacciones (primero de caché, luego del servidor)
   */
  async getTransactions(month?: string): Promise<Transaction[]> {
    const cacheKey = `transactions_${month || 'all'}`;

    // Intentar obtener del caché si está actualizado
    if (navigator.onLine) {
      const cacheTimestamp = await db.getCacheTimestamp(cacheKey);
      const now = Date.now();

      if (cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
        console.log('📦 Usando transacciones del caché');
        return await db.getAll<Transaction>(STORES.TRANSACTIONS);
      }

      // Obtener del servidor y actualizar caché
      try {
        const url = month ? `/api/transactions?month=${month}` : '/api/transactions';
        const response = await fetch(url);
        const data = await response.json();

        await db.clear(STORES.TRANSACTIONS);
        await db.putMany(STORES.TRANSACTIONS, data);
        await db.setCacheTimestamp(cacheKey, now);

        console.log('🌐 Transacciones obtenidas del servidor y cacheadas');
        return data;
      } catch (error) {
        console.error('❌ Error obteniendo transacciones del servidor:', error);
        // Caer de vuelta al caché
        return await db.getAll<Transaction>(STORES.TRANSACTIONS);
      }
    } else {
      console.log('📴 Offline: usando transacciones del caché');
      return await db.getAll<Transaction>(STORES.TRANSACTIONS);
    }
  }

  /**
   * Obtiene cuentas
   */
  async getAccounts(): Promise<Account[]> {
    if (navigator.onLine) {
      const cacheTimestamp = await db.getCacheTimestamp('accounts');
      const now = Date.now();

      if (cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
        console.log('📦 Usando cuentas del caché');
        return await db.getAll<Account>(STORES.ACCOUNTS);
      }

      try {
        const response = await fetch('/api/accounts');
        const data = await response.json();

        await db.clear(STORES.ACCOUNTS);
        await db.putMany(STORES.ACCOUNTS, data);
        await db.setCacheTimestamp('accounts', now);

        console.log('🌐 Cuentas obtenidas del servidor y cacheadas');
        return data;
      } catch (error) {
        console.error('❌ Error obteniendo cuentas del servidor:', error);
        return await db.getAll<Account>(STORES.ACCOUNTS);
      }
    } else {
      console.log('📴 Offline: usando cuentas del caché');
      return await db.getAll<Account>(STORES.ACCOUNTS);
    }
  }

  /**
   * Obtiene categorías
   */
  async getCategories(): Promise<Category[]> {
    if (navigator.onLine) {
      const cacheTimestamp = await db.getCacheTimestamp('categories');
      const now = Date.now();

      if (cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
        console.log('📦 Usando categorías del caché');
        return await db.getAll<Category>(STORES.CATEGORIES);
      }

      try {
        const response = await fetch('/api/categories');
        const data = await response.json();

        await db.clear(STORES.CATEGORIES);
        await db.putMany(STORES.CATEGORIES, data);
        await db.setCacheTimestamp('categories', now);

        console.log('🌐 Categorías obtenidas del servidor y cacheadas');
        return data;
      } catch (error) {
        console.error('❌ Error obteniendo categorías del servidor:', error);
        return await db.getAll<Category>(STORES.CATEGORIES);
      }
    } else {
      console.log('📴 Offline: usando categorías del caché');
      return await db.getAll<Category>(STORES.CATEGORIES);
    }
  }

  /**
   * Crea una nueva transacción
   */
  async createTransaction(transaction: Transaction): Promise<Transaction> {
    // Guardar localmente primero
    await db.put(STORES.TRANSACTIONS, transaction);

    if (navigator.onLine) {
      try {
        const response = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(transaction)
        });
        return await response.json();
      } catch (error) {
        console.error('❌ Error creando transacción en el servidor:', error);
        // Añadir a la cola de sincronización
        await syncQueue.addToQueue('CREATE', STORES.TRANSACTIONS, transaction);
        return transaction;
      }
    } else {
      console.log('📴 Offline: transacción guardada localmente');
      await syncQueue.addToQueue('CREATE', STORES.TRANSACTIONS, transaction);
      return transaction;
    }
  }

  /**
   * Actualiza una transacción
   */
  async updateTransaction(transaction: Transaction): Promise<Transaction> {
    await db.put(STORES.TRANSACTIONS, transaction);

    if (navigator.onLine) {
      try {
        const response = await fetch(`/api/transactions/${transaction.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(transaction)
        });
        return await response.json();
      } catch (error) {
        console.error('❌ Error actualizando transacción en el servidor:', error);
        await syncQueue.addToQueue('UPDATE', STORES.TRANSACTIONS, transaction);
        return transaction;
      }
    } else {
      console.log('📴 Offline: transacción actualizada localmente');
      await syncQueue.addToQueue('UPDATE', STORES.TRANSACTIONS, transaction);
      return transaction;
    }
  }

  /**
   * Elimina una transacción
   */
  async deleteTransaction(id: string): Promise<void> {
    await db.delete(STORES.TRANSACTIONS, id);

    if (navigator.onLine) {
      try {
        await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      } catch (error) {
        console.error('❌ Error eliminando transacción en el servidor:', error);
        await syncQueue.addToQueue('DELETE', STORES.TRANSACTIONS, { id });
      }
    } else {
      console.log('📴 Offline: transacción eliminada localmente');
      await syncQueue.addToQueue('DELETE', STORES.TRANSACTIONS, { id });
    }
  }

  /**
   * Invalida el caché
   */
  async invalidateCache(): Promise<void> {
    await db.clear(STORES.CACHE_TIMESTAMP);
    console.log('🗑️ Caché invalidado');
  }

  /**
   * Limpia todos los datos offline
   */
  async clearAllData(): Promise<void> {
    await Promise.all([
      db.clear(STORES.TRANSACTIONS),
      db.clear(STORES.ACCOUNTS),
      db.clear(STORES.CATEGORIES),
      db.clear(STORES.CACHE_TIMESTAMP)
    ]);
    console.log('🗑️ Todos los datos offline limpiados');
  }
}

export const offlineData = new OfflineDataManager();
