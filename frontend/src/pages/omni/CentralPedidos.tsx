import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PackageOpen, AlertCircle, RefreshCcw, Eye } from "lucide-react";
import { pedidosService, PedidoResumo } from "@/services/pedidosService";

export default function CentralPedidos() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState<PedidoResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("todos");

  useEffect(() => {
    const carregarPedidos = async () => {
      try {
        setLoading(true);
        setError(null);
        const status = statusFilter !== "todos" ? statusFilter : undefined;
        const data = await pedidosService.listar(status);
        setPedidos(data);
      } catch (err: unknown) {
        console.error(err);
        setError("Não foi possível carregar os pedidos. Tente novamente.");
      } finally {
        setLoading(false);
      }
    };
    carregarPedidos();
  }, [statusFilter]);

  const tentarNovamente = () => {
    setLoading(true);
    setStatusFilter(prev => prev === "todos" ? "todos " : "todos"); // Força trigger do effect
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Central de Pedidos</h1>
          <p className="text-muted-foreground">Gerencie e visualize os pedidos dos marketplaces</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="Pendente">Pendente</SelectItem>
              <SelectItem value="Conferido">Conferido</SelectItem>
              <SelectItem value="Despachado">Despachado</SelectItem>
              <SelectItem value="Cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={tentarNovamente} disabled={loading}>
            <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {error ? (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="flex flex-col items-center justify-center py-10 text-destructive">
            <AlertCircle className="h-10 w-10 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Erro ao carregar</h3>
            <p className="mb-4">{error}</p>
            <Button variant="outline" onClick={tentarNovamente}>Tentar Novamente</Button>
          </CardContent>
        </Card>
      ) : loading && pedidos.length === 0 ? (
        <Card>
          <CardContent className="flex justify-center items-center py-20">
            <RefreshCcw className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : pedidos.length === 0 ? (
        <Card className="border-dashed bg-muted/10">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
            <div className="h-20 w-20 bg-background border shadow-sm rounded-full flex items-center justify-center mb-6">
              <PackageOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">Nenhum pedido encontrado</h3>
            <p className="text-muted-foreground">Não há pedidos para os filtros selecionados.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Marketplace</TableHead>
                <TableHead>ID Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidos.map((pedido) => (
                <TableRow key={pedido.id}>
                  <TableCell className="font-medium">
                    {pedido.integracao?.nome || 'Desconhecido'}
                  </TableCell>
                  <TableCell>{pedido.idPedidoMarketplace}</TableCell>
                  <TableCell>{pedido.clienteNome}</TableCell>
                  <TableCell>{new Date(pedido.dataPedido).toLocaleString()}</TableCell>
                  <TableCell>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(pedido.valorTotal))}
                  </TableCell>
                  <TableCell>
                    <Badge variant={pedido.status === 'Pendente' ? 'outline' : pedido.status === 'Cancelado' ? 'destructive' : 'default'}>
                      {pedido.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/omni/pedidos/${pedido.id}`)}>
                      <Eye className="h-4 w-4 mr-1" />
                      Detalhes
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
