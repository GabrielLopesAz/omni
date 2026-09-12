import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

/**
 * Hook para gerenciar a conexão Socket.IO com o servidor para comunicação em tempo real.
 * 
 * Este hook permite:
 * 1. Estabelecer conexão com o servidor Socket.IO
 * 2. Receber eventos em tempo real quando dados são alterados no servidor
 * 3. Atualizar a interface automaticamente sem necessidade de recarregar a página
 * 
 * Exemplos de uso:
 * 
 * ```tsx
 * // Em um componente React:
 * const { socket, connected } = useSocketIO();
 * 
 * useEffect(() => {
 *   if (!socket) return;
 *   
 *   // Escutar por eventos específicos
 *   socket.on('cliente_criado', (novoCliente) => {
 *     // Atualizar estado local com o novo cliente
 *     setClientes(prev => [...prev, novoCliente]);
 *   });
 *   
 *   // Limpar listeners ao desmontar
 *   return () => {
 *     socket.off('cliente_criado');
 *   };
 * }, [socket]);
 * ```
 * 
 * Para mais exemplos, veja os hooks: useClientes, useFornecedores, useInventario, etc.
 */

import { getSocketUrl } from '@/config/api';

const getServerUrl = () => {
  return getSocketUrl();
};

// Função para salvar o IP do servidor no localStorage
export const setServerIp = (ip: string) => {
  // Verifica se estamos em produção (Vercel)
  const isProduction = window.location.hostname.includes('vercel.app');
  
  if (isProduction) {
    localStorage.setItem('productionServerIp', ip);
  } else {
    localStorage.setItem('serverIp', ip);
  }
  
  // Recarregar a página para aplicar a nova configuração
  window.location.reload();
};

// Função para obter o IP do servidor atual
export const getServerIp = () => {
  // Verifica se estamos em produção (Vercel)
  const isProduction = window.location.hostname.includes('vercel.app');
  
  if (isProduction) {
    return localStorage.getItem('productionServerIp') || '';
  }
  
  return localStorage.getItem('serverIp') || window.location.hostname;
};

export const useSocketIO = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectionUrl, setConnectionUrl] = useState('');

  useEffect(() => {
    // Inicializar a conexão com o Socket.IO usando o URL dinâmico
    const API_URL = getServerUrl();
    setConnectionUrl(API_URL);
    console.log('Conectando ao Socket.IO em:', API_URL);
    
    const socketInstance = io(API_URL, {
      transports: ['websocket', 'polling'], // Forçar WebSocket primeiro, depois polling como fallback
      reconnection: true,                   // Habilitar reconexão automática
      reconnectionAttempts: Infinity,       // Tentar reconectar indefinidamente
      reconnectionDelay: 1000,              // Tempo inicial entre tentativas de reconexão (1 segundo)
      reconnectionDelayMax: 5000,           // Tempo máximo entre tentativas (5 segundos)
      timeout: 20000,                       // Timeout da conexão (20 segundos)
      forceNew: true,                       // Forçar nova conexão
      autoConnect: true                     // Conectar automaticamente
    });

    // Definir callbacks para os eventos de conexão
    socketInstance.on('connect', () => {
      console.log('Conectado ao servidor Socket.IO');
      setConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Desconectado do servidor Socket.IO');
      setConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Erro na conexão Socket.IO:', error);
      setConnected(false);
    });

    socketInstance.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Tentativa de reconexão #${attemptNumber}`);
    });

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(`Reconectado após ${attemptNumber} tentativas`);
      setConnected(true);
    });

    // Guardar a instância do socket no estado
    setSocket(socketInstance);

    // Limpar ao desmontar o componente
    return () => {
      console.log('Fechando conexão Socket.IO');
      socketInstance.disconnect();
    };
  }, []);

  return { socket, connected, connectionUrl };
}; 