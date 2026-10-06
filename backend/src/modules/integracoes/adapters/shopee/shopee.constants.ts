export const SHOPEE_API_PATHS = {
  AUTH_PARTNER: '/api/v2/shop/auth_partner',
  GET_TOKEN: '/api/v2/auth/token/get',
  REFRESH_TOKEN: '/api/v2/auth/access_token/get',
  GET_SHOP_INFO: '/api/v2/shop/get_shop_info',
  GET_ORDER_LIST: '/api/v2/order/get_order_list',
  GET_ORDER_DETAIL: '/api/v2/order/get_order_detail',
};

export const SHOPEE_STATUS_MAP: Record<string, string> = {
  UNPAID: 'Pendente',
  READY_TO_SHIP: 'Aprovado',
  PROCESSED: 'EM_SEPARACAO', // Em separaÃ§Ã£o
  SHIPPED: 'Despachado',
  COMPLETED: 'Entregue',
  IN_CANCEL: 'Cancelado',
  CANCELLED: 'Cancelado',
  TO_RETURN: 'Devolvido',
};

 // Apenas pedidos aprovados que comprometem estoque. UNPAID nÃ£o deve gerar reserva ainda.

