import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertCircle, 
  Loader2, 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  ArrowRight, 
  Sparkles, 
  TrendingUp, 
  ShieldCheck 
} from "lucide-react";
import { BRAND_CONFIG } from "@/config/brand";

const HIGHLIGHT_SLIDES = [
  {
    title: "Sua confecção no controle.",
    subtitle: "Eficiência em cada processo.",
    description: "Acompanhe a produção completa em tempo real: fichas de corte, facções, movimentação de tecidos e relatórios detalhados.",
    badge: "Visão 360° da Produção",
    image: "/setemalhas_dashboard_exact.svg"
  },
  {
    title: "Rastreabilidade de Facções.",
    subtitle: "Gestão inteligente de bancas.",
    description: "Monitore peças entregues, recebimentos parciais e gere fechamentos semanais com PIX integrado sem gargalos.",
    badge: "Automação Financeira",
    image: "/setemalhas_dashboard_exact.svg"
  },
  {
    title: "Métricas OEE & Indicadores.",
    subtitle: "Decisões baseadas em dados reais.",
    description: "Analise tendências semanais, estoque mínimo de matéria-prima e produtividade da fábrica em tempo real.",
    badge: "Inteligência Industrial",
    image: "/setemalhas_dashboard_exact.svg"
  }
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Estado do Carousel de Destaques
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % HIGHLIGHT_SLIDES.length);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isResetMode) {
        toast({ title: "Aviso", description: "Recuperação de senha desabilitada nesta versão." });
      } else {
        const { error: signInError, role } = await signIn(email, password);
        if (signInError) {
          setError(signInError.message);
          toast({
            variant: "destructive",
            title: "Erro de Autenticação",
            description: signInError.message,
          });
        } else {
          // Redirecionamento Condicional baseado na role
          if (role === 'CONFERENTE') {
            navigate('/omni/conferencia');
          } else {
            // ADMIN ou GERENTE
            navigate('/omni');
          }
        }
      }
    } catch (err) {
      setError("Ocorreu um erro durante a autenticação.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 h-screen w-screen flex bg-background overflow-hidden select-none">
      {/* Lado Esquerdo: Formulário de Autenticação */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-10 lg:p-12 h-full overflow-y-auto lg:overflow-hidden bg-background">
        {/* Topo Canto Superior Esquerdo: Logo da Sete Malhas em Destaque Ampliado */}
        <div>
          <Link to="/" className="inline-block">
            <img 
              src="/logo-setemalhas.webp" 
              alt={BRAND_CONFIG.name}
              className="h-16 sm:h-20 w-auto object-contain dark:brightness-0 dark:invert transition-all" 
            />
          </Link>
        </div>

        {/* Centro: Formulário Principal */}
        <div className="my-auto py-2 max-w-md w-full mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              {isResetMode ? "Recuperar Senha" : "Bem-vindo de volta"}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1.5">
              {isResetMode 
                ? "Informe seu e-mail para receber as instruções de redefinição de senha." 
                : "Digite seu e-mail e senha para acessar o painel de gestão."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="rounded-xl py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu.email@setemalhas.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-10 rounded-xl bg-background border-border focus:border-[#003D9B] text-sm"
                  required
                />
              </div>
            </div>

            {!isResetMode && (
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-10 rounded-xl bg-background border-border focus:border-[#003D9B] text-sm"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {!isResetMode && (
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-border text-[#003D9B] focus:ring-[#003D9B]" 
                  />
                  <span>Lembrar de mim</span>
                </label>
                <button
                  type="button"
                  onClick={() => setIsResetMode(true)}
                  className="font-medium text-[#003D9B] hover:underline"
                >
                  Esqueceu a senha?
                </button>
              </div>
            )}

            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full h-10 rounded-xl font-semibold bg-[#003D9B] hover:bg-[#002D73] text-white shadow-sm transition-all hover:shadow-md flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Aguarde...
                </>
              ) : isResetMode ? (
                "Enviar Instruções"
              ) : (
                <>
                  Entrar
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-muted-foreground">
            {isResetMode ? (
              <button 
                onClick={() => setIsResetMode(false)}
                className="font-medium text-[#003D9B] hover:underline"
              >
                Voltar para o login
              </button>
            ) : (
              <span>
                Não tem uma conta?{" "}
                <Link to="/cadastro" className="font-semibold text-[#003D9B] hover:underline">
                  Cadastre-se agora
                </Link>
              </span>
            )}
          </div>
        </div>

        {/* Rodapé do Formulário */}
        <div className="flex flex-col sm:flex-row justify-between items-center text-[11px] text-muted-foreground gap-2 pt-2">
          <span>Copyright © 2026 {BRAND_CONFIG.name}. Todos os direitos reservados.</span>
          <div className="flex gap-4">
            <span className="hover:underline cursor-pointer">Termos</span>
            <span className="hover:underline cursor-pointer">Privacidade</span>
          </div>
        </div>
      </div>

      {/* Lado Direito: Painel Futurista com Animações & Tendências Modernas */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#001433] p-8 xl:p-12 flex-col justify-between relative overflow-hidden text-white h-screen select-none">
        {/* Efeitos de Fundo: Malha Radial + Luzes Fluindo */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-600/25 via-[#002D73]/60 to-[#001026]" />
        <div className="absolute top-1/4 -right-20 w-80 h-80 bg-blue-500/20 rounded-full blur-[100px] animate-pulse pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

        {/* Topo: Badge de Tecnologia SGE 2.0 */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-medium text-blue-200">
            <Sparkles className="h-3.5 w-3.5 text-blue-400 animate-spin" style={{ animationDuration: '6s' }} />
            <span>{HIGHLIGHT_SLIDES[activeSlide].badge}</span>
          </div>
          <span className="text-xs font-mono font-semibold tracking-wider text-blue-300/80">SGE 2.0 SETE MALHAS</span>
        </div>

        {/* Texto de Impacto Animado em Transição */}
        <div className="relative z-10 max-w-lg mt-4 transition-all duration-700">
          <h2 className="text-2xl xl:text-3xl font-extrabold tracking-tight leading-tight text-white transition-opacity duration-500">
            {HIGHLIGHT_SLIDES[activeSlide].title}
          </h2>
          <p className="text-base xl:text-lg font-medium text-blue-300 mt-1">
            {HIGHLIGHT_SLIDES[activeSlide].subtitle}
          </p>
          <p className="text-xs xl:text-sm text-blue-100/80 mt-2 leading-relaxed min-h-[40px]">
            {HIGHLIGHT_SLIDES[activeSlide].description}
          </p>
        </div>

        {/* Showcase Central Encaixado 100% no Card sem Bordas Laterais */}
        <div className="relative z-10 my-auto py-2 w-full">
          {/* Badge Flutuante 1: Produção Ativa (Canto Superior Esquerdo) */}
          <div className="absolute -top-3 -left-3 z-30 bg-slate-950/90 backdrop-blur-xl border border-white/20 px-3.5 py-2 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce" style={{ animationDuration: '4s' }}>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
            <div>
              <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Produção Ativa</p>
              <p className="text-xs font-bold text-white">12.450 Peças Cortadas</p>
            </div>
          </div>

          {/* Badge Flutuante 2: Eficiência OEE (Canto Inferior Direito) */}
          <div className="absolute -bottom-3 -right-3 z-30 bg-slate-950/90 backdrop-blur-xl border border-white/20 px-3.5 py-2 rounded-2xl shadow-2xl flex items-center gap-3">
            <div className="p-1.5 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-300">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-blue-300 tracking-wider">Eficiência OEE</p>
              <p className="text-xs font-bold text-white">98.2% <span className="text-[10px] font-normal text-emerald-400">+3.2%</span></p>
            </div>
          </div>

          {/* Moldura Encaixada 100% Edge-to-Edge sem Bordas Laterais */}
          <div className="relative rounded-2xl overflow-hidden shadow-[0_25px_65px_rgba(0,61,155,0.5)] border border-white/20 bg-[#0f172a] group transition-all duration-500 hover:scale-[1.005] w-full">
            <img 
              src={HIGHLIGHT_SLIDES[activeSlide].image} 
              alt="Sete Malhas Dashboard de Produção Preenchido" 
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== window.location.origin + '/setemalhas_dashboard_showcase.png') {
                  target.src = '/setemalhas_dashboard_showcase.png';
                }
              }}
              className="w-full max-h-[48vh] xl:max-h-[52vh] object-cover object-top shadow-lg"
            />
          </div>
        </div>

        {/* Rodapé Direito: Indicadores Interativos do Carousel */}
        <div className="relative z-10 flex items-center justify-between pt-2 border-t border-white/10">
          {/* Controles/Pills dos Slides */}
          <div className="flex items-center gap-2">
            {HIGHLIGHT_SLIDES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveSlide(idx)}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  activeSlide === idx ? "w-8 bg-blue-400" : "w-2 bg-white/30 hover:bg-white/50"
                }`}
                title={`Opção ${idx + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-blue-200/80">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Sistema Seguro • Conexão Criptografada</span>
          </div>
        </div>
      </div>
    </div>
  );
}
