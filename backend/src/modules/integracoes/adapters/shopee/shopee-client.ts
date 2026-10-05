import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ShopeeSignatureService } from './shopee-signature.service.js';
import { SHOPEE_API_PATHS } from './shopee.constants.js';
import { sanitizeExternalError } from '../../../../shared/utils/error-sanitizer.util.js';

export class ShopeeApiError extends Error {
  constructor(public statusCode: number, public code: string, message: string, public requestId?: string) {
    super(`[Shopee API Error] ${code} - ${message}`);
    this.name = 'ShopeeApiError';
  }
}

@Injectable()
export class ShopeeClient {
  private readonly logger = new Logger(ShopeeClient.name);
  private baseUrl: string;
  private partnerId: string;
  private partnerKey: string;

  constructor(
    private configService: ConfigService,
    private signatureService: ShopeeSignatureService,
  ) {
    this.baseUrl = this.configService.get<string>('SHOPEE_BASE_URL', 'https://partner.shopeemobile.com');
    this.partnerId = this.configService.get<string>('SHOPEE_PARTNER_ID', '');
    this.partnerKey = this.configService.get<string>('SHOPEE_PARTNER_KEY', '');
  }

  getPartnerId(): string {
    return this.partnerId;
  }

  isConfigured(): boolean {
    return !!this.partnerId && !!this.partnerKey;
  }

  async publicRequest<T>(apiPath: string, payload: Record<string, any>): Promise<T> {
    const timestamp = this.signatureService.getCurrentTimestamp();
    const sign = this.signatureService.generatePublicSignature(this.partnerId, this.partnerKey, apiPath, timestamp);
    
    const url = new URL(`${this.baseUrl}${apiPath}`);
    url.searchParams.append('partner_id', this.partnerId);
    url.searchParams.append('timestamp', timestamp.toString());
    url.searchParams.append('sign', sign);

    return this.executeRequest<T>(url.toString(), payload);
  }

  async shopRequest<T>(apiPath: string, accessToken: string, shopId: string, payload: Record<string, any> = {}, searchParams: Record<string, string> = {}): Promise<T> {
    const timestamp = this.signatureService.getCurrentTimestamp();
    const sign = this.signatureService.generateShopSignature(this.partnerId, this.partnerKey, apiPath, timestamp, accessToken, shopId);
    
    const url = new URL(`${this.baseUrl}${apiPath}`);
    url.searchParams.append('partner_id', this.partnerId);
    url.searchParams.append('timestamp', timestamp.toString());
    url.searchParams.append('access_token', accessToken);
    url.searchParams.append('shop_id', shopId);
    url.searchParams.append('sign', sign);

    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.append(key, value);
    }

    // A maioria das requisições GET da Shopee passa parametros na query. Se for GET, usamos GET. Se tiver payload complexo, usamos POST
    const method = Object.keys(payload).length > 0 ? 'POST' : 'GET';
    return this.executeRequest<T>(url.toString(), payload, method);
  }

  private async executeRequest<T>(url: string, payload: any, method: string = 'POST', retries = 2): Promise<T> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const options: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      };

      if (method !== 'GET' && Object.keys(payload).length > 0) {
        options.body = JSON.stringify(payload);
      }

      const response = await fetch(url, options);
      clearTimeout(timeoutId);

      const data = await response.json();

      // Shopee often returns 200 OK but with an error inside the JSON
      if (data.error && data.error !== '') {
        const isTransient = data.error === 'system_error' || data.error === 'network_error';
        if (isTransient && retries > 0) {
          this.logger.warn(`Transient error from Shopee: ${data.error}. Retrying...`);
          await new Promise(r => setTimeout(r, 1000));
          return this.executeRequest<T>(url, payload, method, retries - 1);
        }
        const requestId = data.request_id || '';
        const sanitizedMsg = sanitizeExternalError(new Error(data.message));
        throw new ShopeeApiError(response.status, data.error, sanitizedMsg, requestId);
      }

      if (!response.ok) {
        if (response.status >= 500 && retries > 0) {
          await new Promise(r => setTimeout(r, 1000));
          return this.executeRequest<T>(url, payload, method, retries - 1);
        }
        throw new ShopeeApiError(response.status, 'HTTP_ERROR', `HTTP ${response.status} ${response.statusText}`);
      }

      return data as T;

    } catch (err: any) {
      if (err.name === 'AbortError') {
        if (retries > 0) {
          this.logger.warn('Shopee timeout, retrying...');
          await new Promise(r => setTimeout(r, 1000));
          return this.executeRequest<T>(url, payload, method, retries - 1);
        }
        throw new ShopeeApiError(408, 'TIMEOUT', 'Shopee API Request Timeout');
      }
      throw err;
    }
  }

  getAuthUrl(redirectUri: string): string {
    const timestamp = this.signatureService.getCurrentTimestamp();
    const sign = this.signatureService.generatePublicSignature(this.partnerId, this.partnerKey, SHOPEE_API_PATHS.AUTH_PARTNER, timestamp);
    
    const authBaseUrl = this.configService.get<string>('SHOPEE_AUTH_BASE_URL', this.baseUrl);
    const url = new URL(`${authBaseUrl}${SHOPEE_API_PATHS.AUTH_PARTNER}`);
    url.searchParams.append('partner_id', this.partnerId);
    url.searchParams.append('timestamp', timestamp.toString());
    url.searchParams.append('sign', sign);
    url.searchParams.append('redirect', redirectUri);

    return url.toString();
  }
}
