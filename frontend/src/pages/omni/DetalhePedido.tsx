import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, RefreshCcw, Package } from "lucide-react";
import { pedidosService, PedidoDetalhe } from "@/services/pedidosService";

export default function DetalhePedido() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pedido, setPedido] = useState<PedidoDetalhe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const carregarDetalhe = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await pedidosService.buscarPorId(id);
      setPedido(data);
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 404) {
        setError("Pedido não encontrado (404).");
      } else {
        setError("Não foi possível carregar os detalhes do pedido.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDetalhe();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto p-4 flex h-[calc(100vh-8rem)] items-center justify-center">
        <RefreshCcw className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !pedido) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto p-4 flex h-[calc(100vh-8rem)] items-center justify-center">
        <Card className="border-destructive/50 bg-destructive/10 w-full max-w-2xl">
          <CardContent className="flex flex-col items-center justify-center py-20 text-destructive text-center">
            <AlertCircle className="h-12 w-12 mb-4" />
            <h3 className="text-xl font-bold mb-2">Erro ao carregar pedido</h3>
            <p className="mb-6">{error || "Pedido não encontrado."}</p>
            <div className="flex gap-4">
              <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
              <Button variant="outline" onClick={carregarDetalhe}>Tentar Novamente</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pedido {pedido.idPedidoMarketplace}</h1>
          <p className="text-muted-foreground">ID do Sistema: {pedido.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{pedido.clienteNome}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Marketplace</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{pedido.integracao?.nome || 'Desconhecido'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Valor Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(pedido.valorTotal))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="mt-1" variant={pedido.status === 'Pendente' ? 'outline' : pedido.status === 'Cancelado' ? 'destructive' : 'default'}>
              {pedido.status}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Itens do Pedido
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Qtd</TableHead>
                <TableHead className="text-right">Preço Un.</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedido.itens && pedido.itens.length > 0 ? (
                pedido.itens.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.produto?.sku || '-'}</TableCell>
                    <TableCell>{item.produto?.nome || 'Produto não encontrado'}</TableCell>
                    <TableCell className="text-right">{item.quantidade}</TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.precoUnitario))}
                    </TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.quantidade) * Number(item.precoUnitario))}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                    Nenhum item vinculado a este pedido.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
