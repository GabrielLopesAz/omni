import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { estoqueService } from "@/services/estoqueService";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface Produto {
  id: string;
  sku: string;
  nome: string;
  imagemUrl?: string;
}

interface MovimentacaoEstoqueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produtos: Produto[];
  defaultType?: "ENTRADA" | "SAIDA";
  onSuccess: () => void;
}

export default function MovimentacaoEstoqueModal({ open, onOpenChange, produtos, defaultType = "ENTRADA", onSuccess }: MovimentacaoEstoqueModalProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const [produtoId, setProdutoId] = useState("");
  const [tipo, setTipo] = useState<"ENTRADA" | "SAIDA">(defaultType);
  const [quantidade, setQuantidade] = useState("");
  const [openCombobox, setOpenCombobox] = useState(false);

  // Update default type when it changes from props
  useEffect(() => {
    if (open) {
      setTipo(defaultType);
      setProdutoId("");
      setQuantidade("");
      setOpenCombobox(false);
    }
  }, [open, defaultType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produtoId) {
      toast({ variant: "destructive", title: "Atenção", description: "Selecione um produto." });
      return;
    }
    
    const qtd = Number(quantidade);
    if (qtd <= 0) {
      toast({ variant: "destructive", title: "Atenção", description: "A quantidade deve ser maior que zero." });
      return;
    }

    setLoading(true);

    try {
      await estoqueService.ajustarEstoque(produtoId, qtd, tipo);
      
      toast({ 
        title: "Sucesso", 
        description: `Movimentação de ${tipo.toLowerCase()} registrada com sucesso!` 
      });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      const msg = error.response?.data?.message || "Ocorreu um erro ao movimentar o estoque.";
      toast({ variant: "destructive", title: "Erro", description: msg });
    } finally {
      setLoading(false);
    }
  };

  const selectedProduct = produtos.find((p) => p.id === produtoId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] md:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Movimentar Estoque</DialogTitle>
            <DialogDescription>
              Registre entradas de fornecedores ou saídas manuais (perdas/ajustes).
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-1 flex flex-col">
              <label className="text-xs font-semibold">Produto / SKU</label>
              <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openCombobox}
                    className="w-full justify-between h-auto min-h-10 py-2"
                  >
                    {selectedProduct ? (
                      <div className="flex items-center gap-2 text-left truncate">
                        {selectedProduct.imagemUrl ? (
                          <img src={selectedProduct.imagemUrl} alt={selectedProduct.nome} className="w-6 h-6 rounded object-cover shrink-0" />
                        ) : (
                          <div className="w-6 h-6 rounded bg-muted flex items-center justify-center shrink-0">
                            <Package className="h-3 w-3 text-muted-foreground" />
                          </div>
                        )}
                        <span className="truncate">[{selectedProduct.sku}] {selectedProduct.nome}</span>
                      </div>
                    ) : (
                      "Selecione um produto..."
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar produto ou SKU..." />
                    <CommandList>
                      <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                      <CommandGroup>
                        {produtos.map((p) => (
                          <CommandItem
                            key={p.id}
                            value={`${p.sku} ${p.nome}`}
                            onSelect={() => {
                              setProdutoId(p.id);
                              setOpenCombobox(false);
                            }}
                            className="flex items-center gap-2 py-2 cursor-pointer"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4 shrink-0",
                                produtoId === p.id ? "opacity-100 text-primary" : "opacity-0"
                              )}
                            />
                            {p.imagemUrl ? (
                              <img src={p.imagemUrl} alt={p.nome} className="w-8 h-8 rounded object-cover border" />
                            ) : (
                              <div className="w-8 h-8 rounded bg-muted flex items-center justify-center border">
                                <Package className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="flex flex-col truncate">
                              <span className="truncate font-medium">{p.nome}</span>
                              <span className="text-xs text-muted-foreground font-mono">{p.sku}</span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 flex flex-col">
                <label className="text-xs font-semibold">Tipo de Movimento</label>
                <Select value={tipo} onValueChange={(val: "ENTRADA" | "SAIDA") => setTipo(val)}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ENTRADA">Nova Entrada</SelectItem>
                    <SelectItem value="SAIDA">Saída Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 flex flex-col">
                <label className="text-xs font-semibold">Quantidade</label>
                <Input required type="number" min="1" className="h-10" value={quantidade} onChange={e => setQuantidade(e.target.value)} placeholder="Ex: 10" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "Registrando..." : "Confirmar Movimento"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
