import { useState, useEffect, useMemo, useCallback } from "react";
import { produtosService, Produto } from "@/services/produtosService";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Filter, Download, Plus, AlertTriangle, ArrowRightLeft, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MovimentacaoEstoqueModal from "@/components/omni/MovimentacaoEstoqueModal";

import { RequirePermission } from "@/components/auth/RequirePermission";

export default function Estoque() {
  const [searchTerm, setSearchTerm] = useState("");
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"ENTRADA" | "SAIDA">("ENTRADA");

  const fetchEstoque = useCallback(async () => {
    try {
      setLoading(true);
      const data = await produtosService.listarProdutos();
      setProdutos(data);
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar o estoque." });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchEstoque();
  }, [fetchEstoque]);

  const openMovimentacao = (tipo: "ENTRADA" | "SAIDA") => {
    setModalType(tipo);
    setModalOpen(true);
  };

  const filteredProducts = produtos.filter(product => 
    product.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calcula totalizadores
  const metricas = useMemo(() => {
    let ruptura = 0;
    let baixo = 0;
    let valorTotal = 0;

    produtos.forEach(p => {
      const disponivel = p.estoque?.quantidadeDisponivel || 0;
      if (disponivel === 0) ruptura++;
      else if (disponivel < 10) baixo++; // definindo 10 como threshold genérico
      
      valorTotal += (disponivel * Number(p.precoBase));
    });

    return { ruptura, baixo, valorTotal };
  }, [produtos]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Controle de Estoque</h1>
          <p className="text-muted-foreground">Visão unificada do seu inventário físico.</p>
        </div>
        <div className="flex gap-2">
          <RequirePermission allowedRoles={['ADMIN', 'GERENTE']} behavior="disable">
            <Button variant="outline" onClick={() => openMovimentacao("SAIDA")}>
              <ArrowRightLeft className="mr-2 h-4 w-4" /> Movimentar
            </Button>
          </RequirePermission>
          <RequirePermission allowedRoles={['ADMIN', 'GERENTE']} behavior="disable">
            <Button onClick={() => openMovimentacao("ENTRADA")}>
              <Plus className="mr-2 h-4 w-4" /> Nova Entrada
            </Button>
          </RequirePermission>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <div className="bg-card rounded-lg border p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Itens em Ruptura</p>
            <p className="text-2xl font-bold text-rose-500 mt-1">{metricas.ruptura}</p>
          </div>
          <div className="h-10 w-10 bg-rose-500/10 rounded-full flex items-center justify-center text-rose-500">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>
        <div className="bg-card rounded-lg border p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Estoque Baixo</p>
            <p className="text-2xl font-bold text-amber-500 mt-1">{metricas.baixo}</p>
          </div>
          <div className="h-10 w-10 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>
        <div className="bg-card rounded-lg border p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Valor em Estoque</p>
            <p className="text-2xl font-bold mt-1">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metricas.valorTotal)}
            </p>
          </div>
          <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <span className="font-bold text-lg">R$</span>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow-sm">
        <div className="p-4 border-b flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center flex-1 w-full max-w-sm">
            <Input 
              placeholder="Buscar SKU, Produto..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead className="text-right">Físico</TableHead>
                <TableHead className="text-right text-muted-foreground">Reservado</TableHead>
                <TableHead className="text-right text-primary font-bold">Disponível</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">Carregando estoque...</TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                    Nenhum produto encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => {
                  const disponivel = product.estoque?.quantidadeDisponivel || 0;
                  const reservado = product.estoque?.quantidadeReservada || 0;
                  const fisico = disponivel + reservado;
                  
                  let status = "Saudável";
                  let statusColor = "bg-emerald-500/10 text-emerald-600 border-emerald-200";
                  
                  if (disponivel === 0) {
                    status = "Ruptura";
                    statusColor = "bg-rose-500/10 text-rose-600 border-rose-200";
                  } else if (disponivel < 10) {
                    status = "Baixo";
                    statusColor = "bg-amber-500/10 text-amber-600 border-amber-200";
                  }

                  return (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          {product.imagemUrl ? (
                            <img src={product.imagemUrl} alt={product.nome} className="w-10 h-10 rounded-md object-cover border" />
                          ) : (
                            <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center border">
                              <Package className="h-5 w-5 text-muted-foreground/50" />
                            </div>
                          )}
                          <div className="flex flex-col">
                            <span className="truncate max-w-[200px]">{product.nome}</span>
                            <span className="text-xs text-muted-foreground">{product.categoria}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                      <TableCell className="text-right font-medium">{fisico}</TableCell>
                      <TableCell className="text-right text-muted-foreground font-medium">{reservado}</TableCell>
                      <TableCell className="text-right font-bold text-primary text-lg">{disponivel}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`font-normal ${statusColor}`}>
                          {status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <MovimentacaoEstoqueModal 
        open={modalOpen} 
        onOpenChange={setModalOpen} 
        produtos={produtos}
        defaultType={modalType}
        onSuccess={fetchEstoque}
      />
    </div>
  );
}
