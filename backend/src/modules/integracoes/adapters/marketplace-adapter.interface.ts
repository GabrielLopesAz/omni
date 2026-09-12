export interface PedidoDTO {
  id_pedido_marketplace: string;
  cliente_nome: string;
  status: string;
  data_pedido: Date;
  valor_total: number;
  taxas_marketplace: number;
  itens: {
    sku: string;
    quantidade: number;
    preco_unitario: number;
  }[];
}

export interface IMarketplaceAdapter {
  buscarPedidosPendentes(credenciais: any): Promise<PedidoDTO[]>;
  atualizarEstoque(credenciais: any, sku: string, quantidade: number): Promise<boolean>;
}
