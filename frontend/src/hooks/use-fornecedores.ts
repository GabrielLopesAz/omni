
import { useState, useEffect } from "react";

// Dados de exemplo para simular uma API
const fornecedoresMock = [
  { 
    id: "1", 
    nome: "Distribuidora Nacional", 
    cnpj: "12.345.678/0001-90", 
    contato: "Carlos Souza", 
    telefone: "(11) 3456-7890", 
    email: "vendas@distribuidoranacional.com", 
    tempoMedioEntrega: 3, 
    desempenho: 95,
    categoria: "Alimentos"
  },
  { 
    id: "2", 
    nome: "Importadora Global", 
    cnpj: "98.765.432/0001-10", 
    contato: "Ana Lima", 
    telefone: "(21) 3456-7890", 
    email: "contato@importadoraglobal.com", 
    tempoMedioEntrega: 7, 
    desempenho: 85,
    categoria: "Eletrônicos"
  },
  { 
    id: "3", 
    nome: "Fábrica Têxtil Aurora", 
    cnpj: "56.789.012/0001-34", 
    contato: "Roberto Pereira", 
    telefone: "(31) 3456-7890", 
    email: "comercial@textilaurora.com", 
    tempoMedioEntrega: 5, 
    desempenho: 90,
    categoria: "Têxtil"
  },
  { 
    id: "4", 
    nome: "Plásticos & Embalagens Ltda", 
    cnpj: "34.567.890/0001-12", 
    contato: "Fernanda Santos", 
    telefone: "(41) 3456-7890", 
    email: "vendas@plasticosembalagens.com", 
    tempoMedioEntrega: 4, 
    desempenho: 92,
    categoria: "Embalagens"
  },
  { 
    id: "5", 
    nome: "Suprimentos Industriais Tech", 
    cnpj: "23.456.789/0001-01", 
    contato: "Marcelo Costa", 
    telefone: "(51) 3456-7890", 
    email: "suporte@techindustrial.com", 
    tempoMedioEntrega: 10, 
    desempenho: 75,
    categoria: "Industrial"
  }
];

export function useFornecedores() {
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simula uma chamada à API
    const fetchFornecedores = async () => {
      setIsLoading(true);
      try {
        // Simulando uma requisição assíncrona
        await new Promise((resolve) => setTimeout(resolve, 500));
        setFornecedores(fornecedoresMock);
        setError(null);
      } catch (err) {
        setError("Erro ao carregar dados de fornecedores");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFornecedores();
  }, []);

  return { fornecedores, isLoading, error };
}
