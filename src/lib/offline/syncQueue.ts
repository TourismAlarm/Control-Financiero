import { db, STORES, SyncQueueItem } from './indexedDB';

const MAX_RETRIES = 3;

class SyncQueueManager {
  private syncInProgress = false;

  /**
   * Añade una operación a la cola de sincronización
   */
  async addToQueue(
    type: 'CREATE' | 'UPDATE' | 'DELETE',
    store: string,
    data: any
  ): Promise<void> {
    const item: Omit<SyncQueueItem, 'id'> = {
      type,
      store,
      data,
      timestamp: Date.now(),
      retries: 0
    };

    await db.put(STORES.SYNC_QUEUE, item);
    console.log(`🔄 Operación añadida a la cola de sincronización: ${type} en ${store}`);
  }

  /**
   * Procesa la cola de sincronización
   */
  async processQueue(): Promise<void> {
    if (this.syncInProgress) {
      console.log('⏳ Sincronización ya en progreso');
      return;
    }

    if (!navigator.onLine) {
      console.log('📴 Sin conexión, esperando para sincronizar');
      return;
    }

    this.syncInProgress = true;
    console.log('🔄 Iniciando sincronización de cola');

    try {
      const queue = await db.getAll<SyncQueueItem>(STORES.SYNC_QUEUE);

      if (queue.length === 0) {
        console.log('✅ Cola de sincronización vacía');
        this.syncInProgress = false;
        return;
      }

      console.log(`📋 ${queue.length} operaciones pendientes de sincronización`);

      // Ordenar por timestamp (más antiguas primero)
      queue.sort((a, b) => a.timestamp - b.timestamp);

      for (const item of queue) {
        try {
          await this.syncItem(item);
          // Si tuvo éxito, eliminar de la cola
          await db.delete(STORES.SYNC_QUEUE, item.id);
          console.log(`✅ Operación sincronizada: ${item.type} en ${item.store}`);
        } catch (error) {
          console.error(`❌ Error sincronizando operación:`, error);

          // Incrementar contador de reintentos
          item.retries++;

          if (item.retries >= MAX_RETRIES) {
            console.error(`🚫 Operación descartada tras ${MAX_RETRIES} intentos`);
            await db.delete(STORES.SYNC_QUEUE, item.id);
          } else {
            await db.put(STORES.SYNC_QUEUE, item);
          }
        }
      }

      console.log('✅ Sincronización completada');
    } catch (error) {
      console.error('❌ Error procesando cola de sincronización:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sincroniza un item individual con el servidor
   */
  private async syncItem(item: SyncQueueItem): Promise<void> {
    const endpoint = this.getEndpoint(item.store);

    switch (item.type) {
      case 'CREATE':
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data)
        });
        break;

      case 'UPDATE':
        await fetch(`${endpoint}/${item.data.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data)
        });
        break;

      case 'DELETE':
        await fetch(`${endpoint}/${item.data.id}`, {
          method: 'DELETE'
        });
        break;
    }
  }

  /**
   * Obtiene el endpoint de API para un store
   */
  private getEndpoint(store: string): string {
    const endpoints: Record<string, string> = {
      [STORES.TRANSACTIONS]: '/api/transactions',
      [STORES.ACCOUNTS]: '/api/accounts',
      [STORES.CATEGORIES]: '/api/categories'
    };

    return endpoints[store] || '/api/unknown';
  }

  /**
   * Obtiene el número de items pendientes en la cola
   */
  async getPendingCount(): Promise<number> {
    const queue = await db.getAll<SyncQueueItem>(STORES.SYNC_QUEUE);
    return queue.length;
  }

  /**
   * Limpia la cola de sincronización (usar con cuidado)
   */
  async clearQueue(): Promise<void> {
    await db.clear(STORES.SYNC_QUEUE);
    console.log('🗑️ Cola de sincronización limpiada');
  }
}

export const syncQueue = new SyncQueueManager();

// Listener para cuando se recupera la conexión
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('🌐 Conexión restaurada, iniciando sincronización');
    syncQueue.processQueue();
  });
}
