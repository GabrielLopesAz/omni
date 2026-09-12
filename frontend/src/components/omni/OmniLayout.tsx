import { useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Tags,
  Store,
  ScanLine,
  Truck,
  CircleDollarSign,
  BarChart3,
  Settings,
  Bell,
  Search,
  Menu,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  PlugZap,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";

// Estrutura de menu com grupos e sub-itens opcionais
type MenuItem = {
  icon: React.ElementType;
  label: string;
  path: string;
  allowedRoles?: string[];
  children?: { icon: React.ElementType; label: string; path: string; allowedRoles?: string[] }[];
};

type MenuGroup = {
  label: string;
  allowedRoles?: string[];
  items: MenuItem[];
};

const menuGroups: MenuGroup[] = [
  {
    label: "Principal",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/omni", allowedRoles: ['ADMIN', 'GERENTE', 'FINANCEIRO'] },
    ],
  },
  {
    label: "Operação",
    items: [
      { icon: ShoppingCart, label: "Central de Pedidos", path: "/omni/pedidos", allowedRoles: ['ADMIN', 'GERENTE', 'FINANCEIRO'] },
      { icon: ScanLine, label: "Conferência", path: "/omni/conferencia", allowedRoles: ['ADMIN', 'GERENTE', 'CONFERENTE'] },
      { icon: Truck, label: "Expedição", path: "/omni/expedicao", allowedRoles: ['ADMIN', 'GERENTE', 'CONFERENTE', 'FINANCEIRO'] },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { icon: Package, label: "Estoque", path: "/omni/estoque", allowedRoles: ['ADMIN', 'GERENTE', 'FINANCEIRO'] },
      { icon: Tags, label: "Produtos", path: "/omni/produtos", allowedRoles: ['ADMIN', 'GERENTE', 'FINANCEIRO'] },
      {
        icon: Store,
        label: "Marketplaces",
        path: "/omni/marketplaces",
        allowedRoles: ['ADMIN', 'GERENTE'],
        children: [
          { icon: Store, label: "Visão Geral", path: "/omni/marketplaces", allowedRoles: ['ADMIN', 'GERENTE'] },
          { icon: PlugZap, label: "Integrações", path: "/omni/marketplaces?tab=integracoes", allowedRoles: ['ADMIN', 'GERENTE'] },
        ],
      },
    ],
  },
  {
    label: "Gestão",
    items: [
      { icon: CircleDollarSign, label: "Financeiro", path: "/omni/financeiro", allowedRoles: ['ADMIN', 'GERENTE', 'FINANCEIRO'] },
      { icon: BarChart3, label: "Relatórios", path: "/omni/relatorios", allowedRoles: ['ADMIN', 'GERENTE', 'FINANCEIRO'] },
    ],
  },
  {
    label: "Sistema",
    items: [
      { icon: Settings, label: "Configurações", path: "/omni/configuracoes", allowedRoles: ['ADMIN'] },
    ],
  },
];

export default function OmniLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedItems, setExpandedItems] = useState<string[]>(["/omni/marketplaces"]);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();

  const isActive = (path: string) => {
    const cleanPath = path.split("?")[0];
    return location.pathname === cleanPath || location.pathname.startsWith(cleanPath + "/");
  };

  const toggleExpand = (path: string) => {
    setExpandedItems((prev) =>
      prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path]
    );
  };

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? "w-64" : "w-[70px]"}
        transition-all duration-300 ease-in-out border-r bg-card flex flex-col hidden md:flex z-10 relative shadow-sm`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b shrink-0 relative">
          <Link to="/omni" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            {sidebarOpen ? (
              <>
                <img src="/favicon.png" alt="OMNI" className="h-8 w-8 object-contain shrink-0" />
                <div className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70 whitespace-nowrap">
                  OMNI ERP
                </div>
              </>
            ) : (
              <img src="/favicon.png" alt="OMNI" className="h-8 w-8 mx-auto object-contain shrink-0" />
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="absolute -right-3 top-5 h-6 w-6 rounded-full border bg-background shadow-sm hover:bg-accent"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <ChevronLeft
              className={`h-4 w-4 transition-transform ${!sidebarOpen && "rotate-180"}`}
            />
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4 scrollbar-hide">
          {menuGroups.map((group) => {
            const filteredItems = group.items.filter(item => {
              if (!item.allowedRoles) return true; // Se não tiver restrição, permite
              return user?.role && item.allowedRoles.includes(user.role);
            });

            if (filteredItems.length === 0) return null;

            return (
            <div key={group.label}>
              {/* Group Label */}
              {sidebarOpen && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  {group.label}
                </p>
              )}

              <div className="space-y-0.5">
                {filteredItems.map((item) => {
                  const active = isActive(item.path);
                  const hasChildren = item.children && item.children.length > 0;
                  const expanded = expandedItems.includes(item.path);

                  return (
                    <div key={item.path}>
                      {/* Parent Item */}
                      {hasChildren ? (
                        <button
                          onClick={() => {
                            if (sidebarOpen) toggleExpand(item.path);
                          }}
                          className={`w-full flex items-center px-3 py-2.5 rounded-md transition-colors text-left ${
                            active
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          } ${!sidebarOpen && "justify-center"}`}
                          title={!sidebarOpen ? item.label : undefined}
                        >
                          <item.icon className={`h-5 w-5 shrink-0 ${sidebarOpen ? "mr-3" : "mr-0"}`} />
                          {sidebarOpen && (
                            <>
                              <span className="flex-1">{item.label}</span>
                              <ChevronRight
                                className={`h-4 w-4 transition-transform text-muted-foreground/60 ${expanded && "rotate-90"}`}
                              />
                            </>
                          )}
                        </button>
                      ) : (
                        <Link to={item.path}>
                          <div
                            className={`flex items-center px-3 py-2.5 rounded-md transition-colors ${
                              active
                                ? "bg-primary text-primary-foreground font-medium"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            } ${!sidebarOpen && "justify-center"}`}
                            title={!sidebarOpen ? item.label : undefined}
                          >
                            <item.icon className={`h-5 w-5 shrink-0 ${sidebarOpen ? "mr-3" : "mr-0"}`} />
                            {sidebarOpen && <span>{item.label}</span>}
                          </div>
                        </Link>
                      )}

                      {/* Sub-items (children) */}
                      {hasChildren && sidebarOpen && expanded && (
                        <div className="mt-0.5 ml-4 pl-4 border-l border-border/60 space-y-0.5">
                          {item.children!.filter(child => {
                            if (!child.allowedRoles) return true;
                            return user?.role && child.allowedRoles.includes(user.role);
                          }).map((child) => {
                            const childActive =
                              child.path.includes("?tab=integracoes")
                                ? location.search.includes("tab=integracoes")
                                : location.pathname === child.path.split("?")[0] &&
                                  !location.search.includes("tab=integracoes");

                            return (
                              <Link key={child.path} to={child.path}>
                                <div
                                  className={`flex items-center px-3 py-2 rounded-md text-sm transition-colors ${
                                    childActive
                                      ? "bg-primary text-primary-foreground font-medium"
                                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                  }`}
                                >
                                  <child.icon className="h-4 w-4 mr-2.5 shrink-0" />
                                  <span>{child.label}</span>
                                </div>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            );
          })}
        </div>

        {/* User Profile */}
        <div className="p-3 border-t border-border/50 shrink-0">
          <div className={`flex items-center justify-between rounded-lg p-2 hover:bg-accent transition-colors ${!sidebarOpen && "justify-center"}`}>
            <div className="flex items-center overflow-hidden">
              <Avatar className="h-8 w-8 border border-primary/20 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {user?.nome?.substring(0, 2).toUpperCase() || 'AD'}
                </AvatarFallback>
              </Avatar>
              {sidebarOpen && (
                <div className="ml-2.5 overflow-hidden">
                  <p className="text-sm font-medium truncate leading-tight">{user?.nome || 'Usuário'}</p>
                  <p className="text-xs text-muted-foreground truncate leading-tight">{user?.role || 'N/A'}</p>
                </div>
              )}
            </div>
            {sidebarOpen && (
              <Button variant="ghost" size="icon" onClick={signOut} title="Sair da Conta" className="text-muted-foreground hover:text-rose-500 shrink-0">
                <LogOut className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-6 border-b bg-background/80 backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center flex-1">
            <Button variant="ghost" size="icon" className="md:hidden mr-2">
              <Menu className="h-5 w-5" />
            </Button>
            <div className="relative w-full max-w-md hidden sm:block">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar pedidos, produtos, clientes..."
                className="w-full pl-9 bg-muted/50 border-none focus-visible:ring-1"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" className="text-muted-foreground relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-background" />
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground">
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-muted/20 p-6">
          <div className="mx-auto max-w-7xl animate-in fade-in duration-500">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
