import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class ShopeeSignatureService {
  /**
   * Gera a assinatura HMAC-SHA256 para APIs públicas da Shopee (como Auth e Token).
   * Sign = HMAC-SHA256(partner_id + api_path + timestamp, partner_key)
   */
  generatePublicSignature(partnerId: string, partnerKey: string, apiPath: string, timestamp: number): string {
    const baseString = `${partnerId}${apiPath}${timestamp}`;
    return this.signHmacSha256(baseString, partnerKey);
  }

  /**
   * Gera a assinatura HMAC-SHA256 para APIs de nível de loja da Shopee.
   * Sign = HMAC-SHA256(partner_id + api_path + timestamp + access_token + shop_id, partner_key)
   */
  generateShopSignature(
    partnerId: string,
    partnerKey: string,
    apiPath: string,
    timestamp: number,
    accessToken: string,
    shopId: string
  ): string {
    const baseString = `${partnerId}${apiPath}${timestamp}${accessToken}${shopId}`;
    return this.signHmacSha256(baseString, partnerKey);
  }

  private signHmacSha256(baseString: string, key: string): string {
    return crypto.createHmac('sha256', key).update(baseString).digest('hex');
  }

  /**
   * Obtém o timestamp atual no formato exigido pela Shopee (Unix Timestamp em segundos).
   */
  getCurrentTimestamp(): number {
    return Math.floor(Date.now() / 1000);
  }
}
