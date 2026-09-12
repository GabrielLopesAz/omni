import { useState, useEffect } from "react";
import { api } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Edit2, Trash2, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ProdutoForm from "@/components/produtos/ProdutoForm";
import { RequirePermission } from "@/components/auth/RequirePermission";

interface Estoque {
  quantidadeDisponivel: number;
  quantidadeReservada: number;
}

interface Produto {
  id: string;
  sku: string;
  nome: string;
  categoria: string;
  precoBase: number;
  custoUnitario: number;
  imagemUrl: string;
  estoque: Estoque;
}

export default function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const { toast } = useToast();

  const fetchProdutos = async () => {
    try {
      setLoading(true);
      const res = await api.get('/produtos');
      setProdutos(res.data);
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar os produtos." });
      // Fallback simulado para preview
      setProdutos([
        { id: "1", sku: "TSHIRT-01", nome: "Camiseta Básica Branca", categoria: "Vestuário", precoBase: 49.90, custoUnitario: 15.00, imagemUrl: "", estoque: { quantidadeDisponivel: 120, quantidadeReservada: 5 } }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProdutos();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;
    try {
      await api.delete(`/produtos/${id}`);
      toast({ title: "Produto excluído", description: "O produto foi removido com sucesso." });
      fetchProdutos();
    } catch (error) {
      toast({ variant: "destructive", title: "Erro", description: "Não foi possível excluir o produto." });
    }
  };

  const handleEdit = (produto: Produto) => {
    setEditingProduto(produto);
    setIsFormOpen(true);
  };

  const openNewForm = () => {
    setEditingProduto(null);
    setIsFormOpen(true);
  };

  const filteredProdutos = produtos.filter(p => 
    p.nome.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Catálogo de Produtos</h1>
          <p className="text-muted-foreground">Gerencie seus produtos, SKUs e saldo de estoque.</p>
        </div>
        <RequirePermission allowedRoles={['ADMIN', 'GERENTE']} behavior="disable">
          <Button onClick={openNewForm} className="shrink-0 bg-primary hover:bg-primary/90 text-white">
            <Plus className="mr-2 h-4 w-4" /> Novo Produto
          </Button>
        </RequirePermission>
      </div>

      <div className="flex items-center gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            type="text" 
            placeholder="Buscar por SKU ou Nome..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-background"
          />
        </div>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-16">Img</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead className="text-right">Preço Base</TableHead>
              <TableHead className="text-right">Estoque</TableHead>
              <TableHead className="w-[100px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">Carregando...</TableCell>
              </TableRow>
            ) : filteredProdutos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  Nenhum produto encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredProdutos.map((produto) => (
                <TableRow key={produto.id}>
                  <TableCell>
                    {produto.imagemUrl ? (
                      <img src={produto.imagemUrl} alt={produto.nome} className="w-10 h-10 rounded-md object-cover border" />
                    ) : (
                      <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center border">
                        <Package className="h-5 w-5 text-muted-foreground/50" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-mono font-medium text-xs">{produto.sku}</TableCell>
                  <TableCell className="font-semibold">{produto.nome}</TableCell>
                  <TableCell>{produto.categoria || '-'}</TableCell>
                  <TableCell className="text-right text-emerald-600 font-medium">
                    R$ {Number(produto.precoBase).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {produto.estoque?.quantidadeDisponivel || 0}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <RequirePermission allowedRoles={['ADMIN', 'GERENTE']} behavior="disable">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(produto)} className="h-8 w-8 text-blue-600">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </RequirePermission>
                      <RequirePermission allowedRoles={['ADMIN', 'GERENTE']} behavior="disable">
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(produto.id)} className="h-8 w-8 text-rose-600 hover:bg-rose-50 hover:text-rose-700">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </RequirePermission>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ProdutoForm 
        open={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        produtoToEdit={editingProduto} 
        onSuccess={fetchProdutos} 
      />
    </div>
  );
}
