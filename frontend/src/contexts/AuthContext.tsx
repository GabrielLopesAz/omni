import { createContext, useContext, useEffect, useState } from "react";
import { api } from "@/services/api";
import { jwtDecode } from "jwt-decode";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  [key: string]: unknown;
}

type AuthContextType = {
  user: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; role?: string }>;
  signUp: (email: string, password: string, nome: string) => Promise<{ error: Error | null }>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check if we have a stored token/user on load
    const storedUser = sessionStorage.getItem('@OMNI:user');
    const storedToken = sessionStorage.getItem('@OMNI:token');
    
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      // Injeta token no header por padrão (caso refresh seja feito)
      api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    }
    
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      
      // O backend retorna 'access_token' e não 'token'
      const { access_token: token, user: backendUserData } = response.data;
      
      if (token) {
        let extractedRole = backendUserData?.role || 'CONFERENTE';
        let userData = backendUserData || { id: '1', email, name: 'Usuário' };

        // Tentar decodificar o token JWT para extrair a role (conforme especificação)
        try {
          const decoded = jwtDecode<any>(token);
          if (decoded && decoded.role) {
            extractedRole = decoded.role;
          }
          // Pode mesclar os dados decodificados no userData se existirem
          userData = { ...userData, ...decoded, role: extractedRole };
        } catch (e) {
          console.warn("Token JWT inválido ou mock. Usando role padrão.", e);
        }

        sessionStorage.setItem('@OMNI:token', token);
        sessionStorage.setItem('@OMNI:user', JSON.stringify(userData));
        
        // Injeção de Header conforme especificação: "Ao logar, o token deve ser injetado nos headers do Axios"
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        setUser(userData);
        return { error: null, role: userData.role };
      }
      return { error: new Error("Resposta inválida do servidor.") };
    } catch (error: any) {
      if (error.code === 'ERR_NETWORK') {
        return { error: new Error("Falha de conexão com o servidor. Verifique sua internet ou tente novamente mais tarde.") };
      }

      const message = error.response?.data?.message || "Ocorreu um erro durante a autenticação.";
      return { error: new Error(message) };
    }
  };

  const signUp = async (email: string, password: string, nome: string) => {
    try {
      await api.post('/auth/register', { email, password, nome });
      return { error: null };
    } catch (error: any) {
      if (error.code === 'ERR_NETWORK') {
        return { error: new Error("Falha de conexão com o servidor. Verifique sua internet ou tente novamente mais tarde.") };
      }
      const message = error.response?.data?.message || "Erro ao realizar cadastro.";
      return { error: new Error(message) };
    }
  };

  const signOut = () => {
    sessionStorage.removeItem('@OMNI:token');
    sessionStorage.removeItem('@OMNI:user');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
};
