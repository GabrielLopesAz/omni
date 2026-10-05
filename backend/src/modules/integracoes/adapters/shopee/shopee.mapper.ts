import { ShopeeOrder, ShopeeOrderItem } from './shopee.types.js';
import { SHOPEE_STATUS_MAP } from './shopee.constants.js';
import { NormalizedMarketplaceOrder, NormalizedMarketplaceOrderItem } from '../marketplace-adapter.interface.js'; // I'll create this

export class ShopeeMapper {
  static toNormalizedOrder(order: ShopeeOrder): NormalizedMarketplaceOrder {
    const status = SHOPEE_STATUS_MAP[order.order_status] || 'Pendente';
    
    return {
      externalOrderId: order.order_sn,
      externalStatus: order.order_status,
      customerName: order.buyer_username || 'Cliente Shopee',
      totalAmount: order.total_amount,
      createdAt: new Date(order.create_time * 1000),
      updatedAt: new Date(order.update_time * 1000),
      items: order.item_list.map(ShopeeMapper.toNormalizedItem)
    };
  }

  static toNormalizedItem(item: ShopeeOrderItem): NormalizedMarketplaceOrderItem {
    // Regra SKU Shopee explÃ­cita no relatÃ³rio:
    // "se model_sku existir e nÃ£o estiver vazio -> usar model_sku"
    // "senÃ£o se item_sku existir e nÃ£o estiver vazio -> usar item_sku"
    // "senÃ£o -> rejeitar"
    
    let sku = '';
    if (item.model_sku && item.model_sku.trim() !== '') {
      sku = item.model_sku;
    } else if (item.item_sku && item.item_sku.trim() !== '') {
      sku = item.item_sku;
    } else {
      // Rejeitar: O fluxo no serviÃ§o que chamar mapeamento deve capturar e falhar a reserva
      throw new Error(`Item ${item.item_id} da Shopee sem SKU mapeÃ¡vel. NÃ£o Ã© possÃ­vel reservar produto incorreto.`);
    }

    return {
      sku,
      quantity: item.model_quantity_purchased,
      unitPrice: item.model_discounted_price,
    };
  }
}

