import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";

interface ProdutoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produtoToEdit?: any;
  onSuccess: () => void;
}

export default function ProdutoForm({ open, onOpenChange, produtoToEdit, onSuccess }: ProdutoFormProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    sku: "",
    nome: "",
    categoria: "",
    precoBase: "",
    custoUnitario: "",
    imagemUrl: "",
    estoqueInicial: "0"
  });

  useEffect(() => {
    if (produtoToEdit) {
      setFormData({
        sku: produtoToEdit.sku || "",
        nome: produtoToEdit.nome || "",
        categoria: produtoToEdit.categoria || "",
        precoBase: produtoToEdit.precoBase || "",
        custoUnitario: produtoToEdit.custoUnitario || "",
        imagemUrl: produtoToEdit.imagemUrl || "",
        estoqueInicial: "0" // não permite edição de estoque por aqui após criado
      });
    } else {
      setFormData({ sku: "", nome: "", categoria: "", precoBase: "", custoUnitario: "", imagemUrl: "", estoqueInicial: "0" });
    }
  }, [produtoToEdit, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        precoBase: Number(formData.precoBase) || 0,
        custoUnitario: Number(formData.custoUnitario) || 0,
        estoqueInicial: Number(formData.estoqueInicial) || 0,
      };

      if (produtoToEdit) {
        // delete fields that shouldn't be updated like estoqueInicial
        delete payload.estoqueInicial;
        await api.put(`/produtos/${produtoToEdit.id}`, payload);
        toast({ title: "Sucesso", description: "Produto atualizado!" });
      } else {
        await api.post("/produtos", payload);
        toast({ title: "Sucesso", description: "Produto cadastrado!" });
      }
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      const msg = error.response?.data?.message || "Ocorreu um erro ao salvar o produto.";
      toast({ variant: "destructive", title: "Erro", description: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{produtoToEdit ? "Editar Produto" : "Novo Produto"}</DialogTitle>
            <DialogDescription>
              {produtoToEdit ? "Atualize as informações do seu SKU." : "Preencha os dados do novo produto no catálogo."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">SKU</label>
                <Input required placeholder="Ex: TSHIRT-01" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} disabled={!!produtoToEdit} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Categoria</label>
                <Input placeholder="Ex: Vestuário" value={formData.categoria} onChange={e => setFormData({...formData, categoria: e.target.value})} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">Nome do Produto</label>
              <Input required placeholder="Ex: Camiseta Básica Branca" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold">Preço de Venda (R$)</label>
                <Input required type="number" step="0.01" min="0" value={formData.precoBase} onChange={e => setFormData({...formData, precoBase: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold">Custo Unitário (R$)</label>
                <Input type="number" step="0.01" min="0" value={formData.custoUnitario} onChange={e => setFormData({...formData, custoUnitario: e.target.value})} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold">URL da Imagem</label>
              <Input placeholder="https://..." value={formData.imagemUrl} onChange={e => setFormData({...formData, imagemUrl: e.target.value})} />
            </div>

            {!produtoToEdit && (
              <div className="space-y-1">
                <label className="text-xs font-semibold">Estoque Inicial (Opcional)</label>
                <Input type="number" min="0" value={formData.estoqueInicial} onChange={e => setFormData({...formData, estoqueInicial: e.target.value})} />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Salvar Produto"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
