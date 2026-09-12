import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { ScanLine, CheckSquare, AlertTriangle, ArrowRight, Package, Image as ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type StatusItem = 'pendente' | 'conferido' | 'problema';

interface ItemPedido {
  id: string;
  sku: string;
  name: string;
  color: string;
  size: string;
  image: string;
  status: StatusItem;
  checked: boolean;
}

interface Pedido {
  id: string;
  status: string;
  items: ItemPedido[];
}

export default function Conferencia() {
  const [orderBarcode, setOrderBarcode] = useState("");
  const [currentOrder, setCurrentOrder] = useState<Pedido | null>(null);
  const [activeItem, setActiveItem] = useState<ItemPedido | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const [isProblemModalOpen, setIsProblemModalOpen] = useState(false);
  const [problemReason, setProblemReason] = useState("");

  const handleScanOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderBarcode.trim() || loading) return;

    setLoading(true);

    try {
      // Simulação da busca de pedido pela API
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockedOrder: Pedido = {
        id: orderBarcode.toUpperCase(),
        status: 'Em Separação',
        items: [
          { 
            id: '1', 
            sku: 'SKU-10045', 
            name: 'Camiseta Oversized Preta', 
            color: 'Preto', 
            size: 'M', 
            image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=200&auto=format&fit=crop', 
            status: 'pendente', 
            checked: false 
          },
          { 
            id: '2', 
            sku: 'SKU-10089', 
            name: 'Moletom Premium Branco', 
            color: 'Branco', 
            size: 'G', 
            image: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=200&auto=format&fit=crop', 
            status: 'pendente', 
            checked: false 
          },
          { 
            id: '3', 
            sku: 'SKU-10012', 
            name: 'Camiseta Anime Edition', 
            color: 'Branca/Estampa', 
            size: 'P', 
            image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=200&auto=format&fit=crop', 
            status: 'pendente', 
            checked: false 
          }
        ]
      };

      setCurrentOrder(mockedOrder);
      setActiveItem(null); // Reseta o item ativo ao buscar novo pedido
      setOrderBarcode("");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao buscar pedido",
        description: "Pedido não encontrado ou inválido.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleItem = (itemId: string, checked: boolean) => {
    if (!currentOrder) return;
    
    // Atualiza o estado do pedido iterando sobre os itens
    const updatedItems = currentOrder.items.map(item => {
      if (item.id === itemId) {
        return { 
          ...item, 
          checked, 
          status: checked ? 'conferido' as StatusItem : 'pendente' as StatusItem 
        };
      }
      return item;
    });

    setCurrentOrder({ ...currentOrder, items: updatedItems });

    // Se o item alterado for o que está selecionado/ativo, atualiza ele visualmente no painel esquerdo
    if (activeItem?.id === itemId) {
      setActiveItem({ 
        ...activeItem, 
        checked, 
        status: checked ? 'conferido' : 'pendente' 
      });
    }
  };

  const handleReportProblem = () => {
    if (!activeItem) return;
    setIsProblemModalOpen(true);
  };

  const confirmProblem = () => {
    if (!currentOrder || !activeItem) return;

    if (!problemReason.trim()) {
      toast({ variant: "destructive", title: "Atenção", description: "Descreva o motivo do problema." });
      return;
    }

    const updatedItems = currentOrder.items.map(item => {
      if (item.id === activeItem.id) {
        return { ...item, status: 'problema' as StatusItem, checked: false };
      }
      return item;
    });

    setCurrentOrder({ ...currentOrder, items: updatedItems });
    setActiveItem({ ...activeItem, status: 'problema', checked: false });
    
    setIsProblemModalOpen(false);
    setProblemReason("");
    
    toast({ 
      variant: "destructive", 
      title: "Problema Reportado", 
      description: `O item ${activeItem.sku} foi marcado com problema de separação.` 
    });
  };

  const handleFinalize = () => {
    if (!currentOrder) return;
    setCurrentOrder({ ...currentOrder, status: 'Conferido' });
    toast({ 
      title: "Transferência Concluída", 
      description: "Pedido finalizado e enviado para a próxima etapa." 
    });
    
    // Simula limpar a tela após uns segundos
    setTimeout(() => {
      setCurrentOrder(null);
      setActiveItem(null);
    }, 3000);
  };

  // Verifica se a conferência está apta para finalizar (Todos os itens não problemáticos marcados)
  // Se algum item está como problema, o pedido pode ser travado ou passar como parcial.
  // Assumindo: só habilita se ALL os itens estiverem checked.
  const allChecked = currentOrder?.items.every(i => i.checked);
  const isOrderCompleted = currentOrder?.status === 'Conferido';

  return (
    <div className="space-y-6 max-w-6xl mx-auto h-[calc(100vh-8rem)] flex flex-col p-4 rounded-xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Conferência WMS</h1>
        <p className="text-muted-foreground">Insira o código do pedido para iniciar a conferência visual.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* Painel Esquerdo: Busca de Pedido e Exibição do Item Ativo */}
        <div className="lg:col-span-2 flex flex-col gap-6 h-full">
          {!currentOrder ? (
            <Card className="border-2 border-primary/20 shadow-md">
              <CardContent className="p-6">
                <form onSubmit={handleScanOrder} className="flex gap-4">
                  <div className="relative flex-1">
                    <ScanLine className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground" />
                    <Input 
                      autoFocus
                      placeholder="Bipe ou digite o código do pedido/venda..." 
                      className="pl-14 h-16 text-xl bg-muted/50 border-2"
                      value={orderBarcode}
                      onChange={(e) => setOrderBarcode(e.target.value)}
                      disabled={loading}
                    />
                  </div>
                  <Button type="submit" size="lg" className="h-16 px-8 text-lg" disabled={loading}>
                    Buscar Pedido
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-2 border-primary/20 bg-muted/10">
               <CardContent className="p-4 flex items-center justify-between">
                 <div>
                   <p className="text-sm text-muted-foreground">Pedido em Conferência</p>
                   <h2 className="text-2xl font-bold">{currentOrder.id}</h2>
                 </div>
                 <Button variant="outline" onClick={() => setCurrentOrder(null)}>
                   Trocar Pedido
                 </Button>
               </CardContent>
            </Card>
          )}

          {activeItem ? (
            <Card className={`flex-1 overflow-hidden transition-colors duration-300 ${activeItem.status === 'problema' ? 'bg-rose-500/10 border-rose-500/30' : activeItem.status === 'conferido' ? 'bg-emerald-500/5 border-emerald-500/20' : ''}`}>
              <CardContent className="p-8 flex flex-col items-center justify-center h-full text-center relative">
                
                {/* Status Badge */}
                <div className="absolute top-4 right-4">
                  {activeItem.status === 'conferido' && (
                    <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm font-semibold border border-emerald-200">
                      <CheckSquare className="h-4 w-4" /> Conferido
                    </div>
                  )}
                  {activeItem.status === 'problema' && (
                    <div className="inline-flex items-center gap-1.5 bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-sm font-semibold border border-rose-200">
                      <AlertTriangle className="h-4 w-4" /> Com Problema
                    </div>
                  )}
                </div>

                <div className="w-56 h-56 rounded-xl overflow-hidden shadow-lg mb-6 border-4 border-white bg-muted">
                  {activeItem.image ? (
                    <img src={activeItem.image} alt={activeItem.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-full h-full p-12 text-muted-foreground/30" />
                  )}
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">{activeItem.name}</h2>
                <div className="flex flex-wrap justify-center gap-3 text-lg text-muted-foreground mb-8 font-mono">
                  <span className="bg-background px-4 py-1.5 rounded-md border shadow-sm">{activeItem.sku}</span>
                  <span className="bg-background px-4 py-1.5 rounded-md border shadow-sm">Cor: {activeItem.color}</span>
                  <span className="bg-background px-4 py-1.5 rounded-md border shadow-sm">Tam: {activeItem.size}</span>
                </div>

                <div className="flex gap-4 w-full max-w-md">
                  <Button 
                    variant={activeItem.status === 'problema' ? 'destructive' : 'outline'}
                    className="flex-1 h-12"
                    onClick={handleReportProblem}
                    disabled={isOrderCompleted}
                  >
                    <AlertTriangle className="mr-2 h-4 w-4" /> Reportar Problema
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="flex-1 flex flex-col items-center justify-center border-dashed text-muted-foreground p-12 bg-muted/20">
              <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center mb-6">
                <Package className="h-12 w-12 opacity-50" />
              </div>
              <p className="text-xl">Selecione um item na lista ao lado para ver os detalhes...</p>
            </Card>
          )}
        </div>

        {/* Painel Direito: Lista de Itens e Finalização */}
        <div className="flex flex-col h-full overflow-hidden">
          <Card className="flex-1 flex flex-col h-full border-primary/10">
            {currentOrder ? (
              <>
                <div className="p-4 border-b bg-muted/30">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="font-semibold text-lg">Itens do Pedido ({currentOrder.items.length})</h4>
                    <span className="text-sm font-bold text-emerald-600">
                      {currentOrder.items.filter(i => i.checked).length}/{currentOrder.items.length} Marcados
                    </span>
                  </div>
                  {isOrderCompleted && (
                    <div className="mt-2 bg-emerald-500/15 text-emerald-700 px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 border border-emerald-500/20">
                      <CheckSquare className="h-4 w-4" />
                      Pedido totalmente conferido!
                    </div>
                  )}
                </div>
                
                <div className="p-4 flex-1 overflow-auto space-y-3">
                  {currentOrder.items.map(item => (
                    <div 
                      key={item.id} 
                      className={`flex gap-3 items-center p-3 rounded-lg border transition-all cursor-pointer hover:shadow-md ${
                        activeItem?.id === item.id ? 'ring-2 ring-primary border-transparent' : ''
                      } ${
                        item.status === 'conferido' ? 'bg-emerald-500/10 border-emerald-500/20' : 
                        item.status === 'problema' ? 'bg-rose-500/10 border-rose-500/20' : 'bg-background hover:border-primary/40'
                      }`}
                      onClick={() => setActiveItem(item)}
                    >
                      <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                         <Checkbox 
                           checked={item.checked} 
                           onCheckedChange={(checked) => handleToggleItem(item.id, checked as boolean)}
                           disabled={item.status === 'problema' || isOrderCompleted}
                           className="h-5 w-5"
                         />
                      </div>
                      
                      {item.image ? (
                        <img src={item.image} alt="" className="w-10 h-10 rounded-md object-cover border" />
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center border">
                          <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-sm truncate ${item.status === 'conferido' ? 'text-emerald-700' : item.status === 'problema' ? 'text-rose-700' : ''}`}>
                          {item.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.sku} • {item.size}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="p-4 border-t bg-muted/20 mt-auto">
                  <Button 
                    className="w-full" 
                    size="lg" 
                    disabled={!allChecked || isOrderCompleted}
                    onClick={handleFinalize}
                  >
                    Finalizar Transferência <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
               <div className="flex-1 flex items-center justify-center text-muted-foreground p-6 text-center">
                 A lista de itens aparecerá aqui após buscar um pedido.
               </div>
            )}
          </Card>
        </div>
      </div>

      {/* Modal de Reportar Problema */}
      <Dialog open={isProblemModalOpen} onOpenChange={setIsProblemModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reportar Problema</DialogTitle>
            <DialogDescription>
              Descreva o motivo do problema com o item <strong>{activeItem?.sku}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Ex: Produto manchado, rasgado, cor errada..."
              value={problemReason}
              onChange={(e) => setProblemReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProblemModalOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmProblem}>Salvar Problema</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
