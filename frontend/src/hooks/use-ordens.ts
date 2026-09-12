
import { useState, useEffect } from "react";

// Dados de exemplo para simular uma API
const ordensVendaMock = [
  { 
    id: "1", 
    codigo: "OV-2025-0001", 
    data: "10/05/2025", 
    cliente: "Empresa ABC", 
    status: "Em aberto", 
    valor: 2459.90, 
    items: 7
  },
  { 
    id: "2", 
    codigo: "OV-2025-0002", 
    data: "08/05/2025", 
    cliente: "João Silva", 
    status: "Pago", 
    valor: 1350.50, 
    items: 3
  },
  { 
    id: "3", 
    codigo: "OV-2025-0003", 
    data: "05/05/2025", 
    cliente: "Comércio XYZ", 
    status: "Entregue", 
    valor: 4780.00, 
    items: 12
  },
  { 
    id: "4", 
    codigo: "OV-2025-0004", 
    data: "03/05/2025", 
    cliente: "Maria Costa", 
    status: "Cancelado", 
    valor: 980.75, 
    items: 2
  },
  { 
    id: "5", 
    codigo: "OV-2025-0005", 
    data: "01/05/2025", 
    cliente: "Distribuidora FastSell", 
    status: "Pago", 
    valor: 8920.00, 
    items: 15
  }
];

const ordensCompraMock = [
  { 
    id: "1", 
    codigo: "OC-2025-0001", 
    data: "12/05/2025", 
    fornecedor: "Distribuidora Nacional", 
    status: "Em aberto", 
    valor: 12580.90, 
    previsaoEntrega: "19/05/2025"
  },
  { 
    id: "2", 
    codigo: "OC-2025-0002", 
    data: "10/05/2025", 
    fornecedor: "Importadora Global", 
    status: "Em aberto", 
    valor: 7450.50, 
    previsaoEntrega: "24/05/2025"
  },
  { 
    id: "3", 
    codigo: "OC-2025-0003", 
    data: "05/05/2025", 
    fornecedor: "Fábrica Têxtil Aurora", 
    status: "Recebido", 
    valor: 5230.00, 
    previsaoEntrega: "15/05/2025"
  },
  { 
    id: "4", 
    codigo: "OC-2025-0004", 
    data: "02/05/2025", 
    fornecedor: "Plásticos & Embalagens Ltda", 
    status: "Recebido", 
    valor: 3180.75, 
    previsaoEntrega: "09/05/2025"
  },
  { 
    id: "5", 
    codigo: "OC-2025-0005", 
    data: "28/04/2025", 
    fornecedor: "Suprimentos Industriais Tech", 
    status: "Cancelado", 
    valor: 9870.00, 
    previsaoEntrega: "15/05/2025"
  }
];

export function useOrdens() {
  const [ordensVenda, setOrdensVenda] = useState<any[]>([]);
  const [ordensCompra, setOrdensCompra] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simula uma chamada à API
    const fetchOrdens = async () => {
      setIsLoading(true);
      try {
        // Simulando uma requisição assíncrona
        await new Promise((resolve) => setTimeout(resolve, 500));
        setOrdensVenda(ordensVendaMock);
        setOrdensCompra(ordensCompraMock);
        setError(null);
      } catch (err) {
        setError("Erro ao carregar dados de ordens");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrdens();
  }, []);

  return { ordensVenda, ordensCompra, isLoading, error };
}
