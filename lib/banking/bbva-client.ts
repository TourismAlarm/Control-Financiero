// Cliente para BBVA API
// Se implementará cuando se obtengan las credenciales

export class BBVAClient {
  private clientId: string;
  private clientSecret: string;
  private apiKey: string;
  private baseUrl: string;
  private accessToken?: string;
  private tokenExpiry?: Date;

  constructor() {
    this.clientId = process.env.BBVA_CLIENT_ID || '';
    this.clientSecret = process.env.BBVA_CLIENT_SECRET || '';
    this.apiKey = process.env.BBVA_API_KEY || '';
    this.baseUrl = process.env.BBVA_API_BASE_URL || '';
  }

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret && this.apiKey && this.baseUrl);
  }

  // TODO: Implementar cuando se tengan las credenciales
  async authenticate() {
    throw new Error('BBVA API not configured yet');
  }

  async getAccounts(userId: string) {
    throw new Error('BBVA API not configured yet');
  }

  async getTransactions(accountId: string, fromDate?: string, toDate?: string) {
    throw new Error('BBVA API not configured yet');
  }
}

export const bbvaClient = new BBVAClient();
