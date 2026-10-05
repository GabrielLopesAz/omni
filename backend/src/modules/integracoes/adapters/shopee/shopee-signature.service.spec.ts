import { Test, TestingModule } from '@nestjs/testing';
import { ShopeeSignatureService } from './shopee-signature.service.js';

describe('ShopeeSignatureService', () => {
  let service: ShopeeSignatureService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShopeeSignatureService],
    }).compile();

    service = module.get<ShopeeSignatureService>(ShopeeSignatureService);
  });

  it('deve gerar assinatura publica corretamente', () => {
    const partnerId = '123456';
    const partnerKey = 'testpartnerkey1234567890';
    const apiPath = '/api/v2/shop/auth_partner';
    const timestamp = 1600000000;

    const signature = service.generatePublicSignature(partnerId, partnerKey, apiPath, timestamp);
    
    expect(signature).toBeDefined();
    expect(signature.length).toBe(64); // SHA-256 in hex is 64 chars

    // deterministic check (hardcoded expected value for these specific inputs)
    // baseString = '123456/api/v2/shop/auth_partner1600000000'
    const crypto = require('crypto');
    const expected = crypto.createHmac('sha256', partnerKey).update('123456/api/v2/shop/auth_partner1600000000').digest('hex');
    expect(signature).toBe(expected);
  });

  it('deve gerar assinatura de loja corretamente', () => {
    const partnerId = '123456';
    const partnerKey = 'testpartnerkey1234567890';
    const apiPath = '/api/v2/order/get_order_list';
    const timestamp = 1600000000;
    const accessToken = 'testaccesstoken';
    const shopId = '78910';

    const signature = service.generateShopSignature(partnerId, partnerKey, apiPath, timestamp, accessToken, shopId);
    
    expect(signature).toBeDefined();
    expect(signature.length).toBe(64);

    const crypto = require('crypto');
    const expected = crypto.createHmac('sha256', partnerKey).update('123456/api/v2/order/get_order_list1600000000testaccesstoken78910').digest('hex');
    expect(signature).toBe(expected);
  });

  it('deve alterar a assinatura se o path for diferente', () => {
    const sig1 = service.generatePublicSignature('id', 'key', '/path1', 123);
    const sig2 = service.generatePublicSignature('id', 'key', '/path2', 123);
    expect(sig1).not.toBe(sig2);
  });

  it('deve alterar a assinatura se o timestamp for diferente', () => {
    const sig1 = service.generatePublicSignature('id', 'key', '/path', 123);
    const sig2 = service.generatePublicSignature('id', 'key', '/path', 124);
    expect(sig1).not.toBe(sig2);
  });

  it('deve alterar a assinatura se o token for diferente', () => {
    const sig1 = service.generateShopSignature('id', 'key', '/path', 123, 'token1', 'shop1');
    const sig2 = service.generateShopSignature('id', 'key', '/path', 123, 'token2', 'shop1');
    expect(sig1).not.toBe(sig2);
  });

  it('deve alterar a assinatura se o shop_id for diferente', () => {
    const sig1 = service.generateShopSignature('id', 'key', '/path', 123, 'token', 'shop1');
    const sig2 = service.generateShopSignature('id', 'key', '/path', 123, 'token', 'shop2');
    expect(sig1).not.toBe(sig2);
  });
});
