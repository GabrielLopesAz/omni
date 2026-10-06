import { ShopeeOrder, ShopeeOrderItem } from './shopee.types.js';
import { MarketplaceOrderAction, NormalizedMarketplaceOrder, NormalizedMarketplaceOrderItem } from '../marketplace-adapter.interface.js';

export class ShopeeMapper {
  static getActionForStatus(shopeeStatus: string): MarketplaceOrderAction {
    switch (shopeeStatus) {
      case 'READY_TO_SHIP':
      case 'PROCESSED':
        return 'IMPORT';
      case 'CANCELLED':
      case 'IN_CANCEL':
        return 'CANCEL';
      case 'SHIPPED':
      case 'COMPLETED':
        return 'UPDATE_STATUS';
      case 'UNPAID':
        return 'IGNORE';
      default:
        return 'IGNORE';
    }
  }

  static toNormalizedOrder(order: ShopeeOrder): NormalizedMarketplaceOrder {
    const action = ShopeeMapper.getActionForStatus(order.order_status);
    
    return {
      externalOrderId: order.order_sn,
      externalStatus: order.order_status,
      action,
      customerName: order.buyer_username || 'Cliente Shopee',
      totalAmount: order.total_amount,
      createdAt: new Date(order.create_time * 1000),
      updatedAt: new Date(order.update_time * 1000),
      items: order.item_list.map(ShopeeMapper.toNormalizedItem)
    };
  }

  static toNormalizedItem(item: ShopeeOrderItem): NormalizedMarketplaceOrderItem {
    let sku = '';
    if (item.model_sku && item.model_sku.trim() !== '') {
      sku = item.model_sku;
    } else if (item.item_sku && item.item_sku.trim() !== '') {
      sku = item.item_sku;
    } else {
      throw new Error(`Item ${item.item_id} da Shopee sem SKU mapeável. Não é possível reservar produto incorreto.`);
    }

    return {
      sku,
      quantity: item.model_quantity_purchased,
      unitPrice: item.model_discounted_price,
    };
  }
}
