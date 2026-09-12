import axios from 'axios';

// Usar VITE_API_URL ou fallback para local
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1';

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    // Buscar token da sessão ou context armazenado
    // Como a especificação recomenda não deixar solto no localStorage para ataques, 
    // mas se precisarmos de persistência rápida de reloads podemos usar sessionStorage
    // ou acessar a Store/Context global aqui caso fosse Zustand.
    // Vamos usar o sessionStorage para este cenário.
    const token = sessionStorage.getItem('@OMNI:token');
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token inválido ou expirado, limpar e redirecionar para login
      sessionStorage.removeItem('@OMNI:token');
      sessionStorage.removeItem('@OMNI:user');
      
      // Se não estivermos na página de login, redirecionar
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
