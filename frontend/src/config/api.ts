/**
 * Configuração Centralizada de API e WebSockets do SGE (Sete Malhas)
 */

export const getApiBaseUrl = (): string => {
  // 1. Prioridade: Variável de ambiente Vite (VITE_API_URL)
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/+$/, '');
  }

  // 2. Segunda prioridade: IP salvo localmente no localStorage (se configurado pelo usuário)
  const storedIp = localStorage.getItem('server_ip');
  if (storedIp && storedIp.trim() !== '') {
    const cleanIp = storedIp.trim();
    if (cleanIp.startsWith('http://') || cleanIp.startsWith('https://')) {
      return cleanIp.replace(/\/+$/, '');
    }
    return `http://${cleanIp}:8687`.replace(/\/+$/, '');
  }

  // 3. Terceira prioridade: Se estiver rodando no navegador com porta/hostname dinâmico
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1' && hostname !== '') {
      return `http://${hostname}:8687`;
    }
  }

  // 4. Fallback padrão para desenvolvimento local
  return 'http://localhost:8687';
};

/**
 * Retorna a URL base para chamadas de rotas REST (/api)
 */
export const getApiUrl = (): string => {
  return `${getApiBaseUrl()}/api`;
};

/**
 * Retorna a URL do servidor Socket.IO
 */
export const getSocketUrl = (): string => {
  return getApiBaseUrl();
};

/**
 * Helper para construir endpoints com segurança
 */
export const buildApiUrl = (endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (cleanEndpoint.startsWith('/api/')) {
    return `${getApiBaseUrl()}${cleanEndpoint}`;
  }
  return `${getApiUrl()}${cleanEndpoint}`;
};
