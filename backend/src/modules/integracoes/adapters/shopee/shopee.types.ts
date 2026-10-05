export interface ShopeeApiBaseResponse {
  error: string;
  message: string;
  request_id: string;
}

export interface ShopeeTokenResponse extends ShopeeApiBaseResponse {
  access_token: string;
  refresh_token: string;
  expire_in: number;
  merchant_id?: number;
  shop_id?: number;
}

export interface ShopeeShopInfoResponse extends ShopeeApiBaseResponse {
  shop_name: string;
  region: string;
  status: string;
  // ... other fields if needed
}

export interface ShopeeOrderListResponse extends ShopeeApiBaseResponse {
  response: {
    more: boolean;
    next_cursor: string;
    order_list: Array<{
      order_sn: string;
    }>;
  };
}

export interface ShopeeOrderDetailResponse extends ShopeeApiBaseResponse {
  response: {
    order_list: Array<ShopeeOrder>;
  };
}

export interface ShopeeOrder {
  order_sn: string;
  order_status: string;
  create_time: number;
  update_time: number;
  total_amount: number;
  buyer_user_id?: number;
  buyer_username?: string;
  shipping_carrier?: string;
  item_list: Array<ShopeeOrderItem>;
}

export interface ShopeeOrderItem {
  item_id: number;
  item_name: string;
  item_sku: string;
  model_id: number;
  model_name: string;
  model_sku: string;
  model_quantity_purchased: number;
  model_discounted_price: number;
}
