import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import RedefinirSenha from "./pages/RedefinirSenha";
import SocketTest from "./pages/SocketTest";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { NotificationWrapper } from "./components/NotificationWrapper";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // Cache de 30 segundos
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Componente para proteger rotas
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Mostrar nada enquanto carrega o estado de autenticação
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>;
  }

  // Redireciona para login se não estiver autenticado
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// Componente para proteger rotas baseado no Role do usuário
const RoleRoute = ({ children, allowedRoles, fallback = "/omni" }: { children: React.ReactNode, allowedRoles: string[], fallback?: string }) => {
  const { user, loading } = useAuth();
  
  if (loading) return null; // Já tratado pelo ProtectedRoute pai
  
  if (!user || !user.role) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    // Se for conferente tentando acessar rotas não permitidas, o fallback padrão na aplicação é /omni/conferencia
    if (user.role === 'CONFERENTE') {
       return <Navigate to="/omni/conferencia" replace />;
    }
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
};

import OmniLayout from "./components/omni/OmniLayout";
import OmniDashboard from "./pages/omni/Dashboard";
import CentralPedidos from "./pages/omni/CentralPedidos";
import DetalhePedido from "./pages/omni/DetalhePedido";
import EstoqueOmni from "./pages/omni/Estoque";
import ProdutosOmni from "./pages/omni/Produtos";
import Marketplaces from "./pages/omni/Marketplaces";
import Conferencia from "./pages/omni/Conferencia";
import Expedicao from "./pages/omni/Expedicao";
import Financeiro from "./pages/omni/Financeiro";
import RelatoriosOmni from "./pages/omni/Relatorios";
import ConfiguracoesOmni from "./pages/omni/Configuracoes";

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/cadastro" element={<Cadastro />} />
    <Route path="/redefinir-senha" element={<RedefinirSenha />} />
    <Route path="/socket-test" element={<SocketTest />} />
    
    <Route path="/" element={<Navigate to="/omni" replace />} />

    {/* OMNI ERP - DEMO ROUTES */}
    <Route path="/omni" element={
      <ProtectedRoute>
        <OmniLayout />
      </ProtectedRoute>
    }>
      <Route index element={<RoleRoute allowedRoles={['ADMIN', 'GERENTE', 'FINANCEIRO']}><OmniDashboard /></RoleRoute>} />
      <Route path="pedidos" element={<RoleRoute allowedRoles={['ADMIN', 'GERENTE', 'FINANCEIRO']}><CentralPedidos /></RoleRoute>} />
      <Route path="pedidos/:id" element={<RoleRoute allowedRoles={['ADMIN', 'GERENTE', 'FINANCEIRO']}><DetalhePedido /></RoleRoute>} />
      <Route path="estoque" element={<RoleRoute allowedRoles={['ADMIN', 'GERENTE', 'FINANCEIRO']}><EstoqueOmni /></RoleRoute>} />
      <Route path="produtos" element={<RoleRoute allowedRoles={['ADMIN', 'GERENTE', 'FINANCEIRO']}><ProdutosOmni /></RoleRoute>} />
      <Route path="marketplaces" element={<RoleRoute allowedRoles={['ADMIN', 'GERENTE']}><Marketplaces /></RoleRoute>} />
      <Route path="conferencia" element={<RoleRoute allowedRoles={['ADMIN', 'GERENTE', 'CONFERENTE']}><Conferencia /></RoleRoute>} />
      <Route path="expedicao" element={<RoleRoute allowedRoles={['ADMIN', 'GERENTE', 'CONFERENTE', 'FINANCEIRO']}><Expedicao /></RoleRoute>} />
      <Route path="financeiro" element={<RoleRoute allowedRoles={['ADMIN', 'GERENTE', 'FINANCEIRO']}><Financeiro /></RoleRoute>} />
      <Route path="relatorios" element={<RoleRoute allowedRoles={['ADMIN', 'GERENTE', 'FINANCEIRO']}><RelatoriosOmni /></RoleRoute>} />
      <Route path="configuracoes" element={<RoleRoute allowedRoles={['ADMIN']}><ConfiguracoesOmni /></RoleRoute>} />
    </Route>
    
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <NotificationProvider>
        <NotificationWrapper>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AuthProvider>
                <AppRoutes />
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </NotificationWrapper>
      </NotificationProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
 
