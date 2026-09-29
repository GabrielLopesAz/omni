import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ScanLine, CheckSquare, XCircle, Package, Search, Loader2,
  CheckCircle2, AlertCircle, ShipIcon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logisticaService, type PedidoConferencia, type ItemConferencia } from "@/services/logisticaService";
import axios from "axios";

type ScanFeedback = { type: 'success' | 'error'; message: string } | null;

function playBeep(success: boolean) {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = success ? 880 : 220;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // Web Audio API pode não estar disponível
  }
}

export default function Conferencia() {
  const [orderBarcode, setOrderBarcode] = useState("");
  const [pedido, setPedido] = useState<PedidoConferencia | null>(null);
  const [loadingPedido, setLoadingPedido] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [loadingScan, setLoadingScan] = useState(false);
  const [loadingExpedir, setLoadingExpedir] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<ScanFeedback>(null);
  const [lastScannedSku, setLastScannedSku] = useState<string | null>(null);
  const { toast } = useToast();

  const scanInputRef = useRef<HTMLInputElement>(null);
  const orderInputRef = useRef<HTMLInputElement>(null);

  // Foco automático no campo de pedido ao montar
  useEffect(() => {
    orderInputRef.current?.focus();
  }, []);

  // Volta foco para scanner após feedback
  useEffect(() => {
    if (pedido && !loadingScan) {
      setTimeout(() => scanInputRef.current?.focus(), 100);
    }
  }, [pedido, loadingScan]);

  const handleBuscarPedido = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const id = orderBarcode.trim();
    if (!id || loadingPedido) return;

    setLoadingPedido(true);
    setPedido(null);
    setScanFeedback(null);
    setLastScannedSku(null);

    try {
      const data = await logisticaService.getPedido(id);
      setPedido(data);
      setOrderBarcode("");
      // Foco no scanner após carregar
      setTimeout(() => scanInputRef.current?.focus(), 150);
    } catch (error: unknown) {
      let msg = "Erro ao buscar pedido.";
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) msg = "Pedido não encontrado.";
        else if (error.response?.status === 400) msg = error.response?.data?.message || "Pedido inválido.";
        else if (error.response?.status === 401) msg = "Não autorizado.";
        else if (error.response?.status === 403) msg = "Sem permissão para acessar este pedido.";
        else msg = error.response?.data?.message || msg;
      }
      toast({ variant: "destructive", title: "Erro", description: msg });
      orderInputRef.current?.focus();
    } finally {
      setLoadingPedido(false);
    }
  }, [orderBarcode, loadingPedido, toast]);

  const handleBipar = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const sku = scanInput.trim();
    if (!sku || !pedido || loadingScan) return;

    setScanInput("");
    setLoadingScan(true);
    setScanFeedback(null);
    setLastScannedSku(sku);

    try {
      const result = await logisticaService.bipar(pedido.id, sku);
      playBeep(true);
      setScanFeedback({ type: 'success', message: result.message });

      // Atualizar estado local do pedido
      setPedido(prev => {
        if (!prev) return prev;
        const novosItens = prev.itens.map(item =>
          item.sku === sku ? { ...item, quantidadeBipada: result.quantidadeBipada } : item
        );
        return { ...prev, status: result.pedidoStatus, itens: novosItens };
      });

      if (result.pedidoStatus === 'Conferido') {
        toast({ title: "✅ Conferência Concluída!", description: "Todos os itens foram conferidos com sucesso." });
      }
    } catch (error: unknown) {
      playBeep(false);
      let msg = "Erro na bipagem.";
      if (axios.isAxiosError(error)) {
        msg = error.response?.data?.message || msg;
      }
      setScanFeedback({ type: 'error', message: msg });
    } finally {
      setLoadingScan(false);
    }
  }, [scanInput, pedido, loadingScan, toast]);

  const handleExpedir = useCallback(async () => {
    if (!pedido || loadingExpedir) return;

    setLoadingExpedir(true);
    try {
      const result = await logisticaService.expedir(pedido.id);
      setPedido(prev => prev ? { ...prev, status: result.status } : prev);
      toast({ title: "🚚 Pedido Expedido!", description: result.message });
    } catch (error: unknown) {
      let msg = "Erro ao expedir pedido.";
      if (axios.isAxiosError(error)) {
        msg = error.response?.data?.message || msg;
      }
      toast({ variant: "destructive", title: "Erro na expedição", description: msg });
    } finally {
      setLoadingExpedir(false);
    }
  }, [pedido, loadingExpedir, toast]);

  const totalItens = pedido?.itens.length ?? 0;
  const totalBipados = pedido?.itens.filter(i => i.quantidadeBipada >= i.quantidade).length ?? 0;
  const totalUnidades = pedido?.itens.reduce((s, i) => s + i.quantidade, 0) ?? 0;
  const totalBipadasUnidades = pedido?.itens.reduce((s, i) => s + i.quantidadeBipada, 0) ?? 0;
  const progresso = totalUnidades > 0 ? Math.round((totalBipadasUnidades / totalUnidades) * 100) : 0;
  const isConferido = pedido?.status === 'Conferido';
  const isDespachado = pedido?.status === 'Despachado';

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ScanLine className="h-6 w-6 text-primary" />
          Conferência de Pedidos
        </h1>
        <p className="text-muted-foreground text-sm">Bipagem e validação de itens para expedição</p>
      </div>

      {/* Busca de Pedido */}
      <Card>
        <CardContent className="pt-4">
          <form onSubmit={handleBuscarPedido} className="flex gap-2">
            <Input
              ref={orderInputRef}
              autoFocus
              placeholder="Código / ID do pedido (Enter para buscar)"
              value={orderBarcode}
              onChange={e => setOrderBarcode(e.target.value)}
              disabled={loadingPedido}
              className="font-mono"
            />
            <Button type="submit" disabled={loadingPedido || !orderBarcode.trim()}>
              {loadingPedido ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Conteúdo principal */}
      {!pedido && !loadingPedido && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <Package className="h-16 w-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Busque um pedido para iniciar a conferência</p>
          </div>
        </div>
      )}

      {pedido && (
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Info do pedido */}
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <p className="text-xs text-muted-foreground">Pedido</p>
              <p className="font-mono font-bold">{pedido.id.slice(0, 8).toUpperCase()}</p>
            </div>
            {pedido.clienteNome && (
              <div>
                <p className="text-xs text-muted-foreground">Cliente</p>
                <p className="font-semibold">{pedido.clienteNome}</p>
              </div>
            )}
            <div className="ml-auto">
              <Badge variant={
                pedido.status === 'Conferido' ? 'default' :
                pedido.status === 'Despachado' ? 'secondary' :
                pedido.status === 'Cancelado' ? 'destructive' : 'outline'
              }>
                {pedido.status}
              </Badge>
            </div>
          </div>

          {/* Progresso */}
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-semibold">Progresso geral</span>
                <span className="font-mono font-bold">{totalBipadasUnidades}/{totalUnidades} unidades — {progresso}%</span>
              </div>
              <Progress value={progresso} className="h-3" />
            </CardContent>
          </Card>

          <div className="flex-1 flex flex-col gap-4 overflow-hidden lg:flex-row">
            {/* Painel scanner */}
            <div className="flex flex-col gap-3 lg:w-80">
              {/* Input scanner */}
              <Card>
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ScanLine className="h-4 w-4" /> Scanner / Bipagem
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleBipar} className="flex flex-col gap-2">
                    <Input
                      ref={scanInputRef}
                      placeholder="Bipar SKU (Enter)"
                      value={scanInput}
                      onChange={e => setScanInput(e.target.value)}
                      disabled={loadingScan || isConferido || isDespachado || pedido.status === 'Cancelado'}
                      className="font-mono"
                      autoComplete="off"
                    />
                    <Button
                      type="submit"
                      disabled={loadingScan || !scanInput.trim() || isConferido || isDespachado || pedido.status === 'Cancelado'}
                    >
                      {loadingScan ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ScanLine className="h-4 w-4 mr-2" />}
                      Confirmar
                    </Button>
                  </form>

                  {/* Feedback último scan */}
                  {scanFeedback && (
                    <div className={`mt-3 flex items-start gap-2 rounded-md p-3 text-sm font-medium ${
                      scanFeedback.type === 'success'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {scanFeedback.type === 'success'
                        ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                        : <XCircle className="h-4 w-4 shrink-0 mt-0.5" />}
                      <span>{scanFeedback.message}</span>
                    </div>
                  )}

                  {lastScannedSku && (
                    <p className="mt-2 text-xs text-muted-foreground font-mono">
                      Último scan: <span className="font-bold">{lastScannedSku}</span>
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Status e ações */}
              {(isConferido || isDespachado) && (
                <Card className="border-emerald-200 bg-emerald-50">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2 text-emerald-700 font-semibold mb-3">
                      <CheckSquare className="h-5 w-5" />
                      {isDespachado ? "Pedido Despachado" : "Conferência Concluída"}
                    </div>
                    {isConferido && !isDespachado && (
                      <Button
                        className="w-full"
                        onClick={handleExpedir}
                        disabled={loadingExpedir}
                      >
                        {loadingExpedir
                          ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          : <ShipIcon className="h-4 w-4 mr-2" />}
                        Expedir Pedido
                      </Button>
                    )}
                    {isDespachado && (
                      <Button variant="outline" className="w-full" onClick={() => { setPedido(null); setOrderBarcode(""); setScanFeedback(null); setTimeout(() => orderInputRef.current?.focus(), 100); }}>
                        Conferir Próximo Pedido
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}

              {pedido.status === 'Cancelado' && (
                <Card className="border-rose-200 bg-rose-50">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2 text-rose-700 font-semibold">
                      <AlertCircle className="h-5 w-5" />
                      Pedido Cancelado — bipagem bloqueada
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Lista de itens */}
            <Card className="flex-1 overflow-hidden flex flex-col">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Itens do Pedido</span>
                  <span className="font-mono text-emerald-600">{totalBipados}/{totalItens} itens completos</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-auto flex-1 p-3 space-y-2">
                {pedido.itens.length === 0 && (
                  <p className="text-muted-foreground text-sm text-center py-8">Nenhum item neste pedido.</p>
                )}
                {pedido.itens.map((item: ItemConferencia) => {
                  const itemCompleto = item.quantidadeBipada >= item.quantidade;
                  const itemAtivo = lastScannedSku === item.sku;
                  const progressoItem = item.quantidade > 0 ? Math.round((item.quantidadeBipada / item.quantidade) * 100) : 0;

                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        itemAtivo && scanFeedback?.type === 'error' ? 'bg-rose-50 border-rose-300 ring-1 ring-rose-300' :
                        itemAtivo && scanFeedback?.type === 'success' ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-300' :
                        itemCompleto ? 'bg-emerald-50 border-emerald-200' : 'bg-background border-border'
                      }`}
                    >
                      {/* Imagem ou ícone */}
                      {item.imagemUrl ? (
                        <img src={item.imagemUrl} alt={item.nomeProduto} className="w-12 h-12 rounded-md object-cover border shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-md bg-muted flex items-center justify-center border shrink-0">
                          <Package className="h-5 w-5 text-muted-foreground/50" />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-sm truncate ${itemCompleto ? 'text-emerald-700' : ''}`}>
                          {item.nomeProduto}
                        </p>
                        <p className="text-xs font-mono text-muted-foreground mt-0.5">{item.sku}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Progress value={progressoItem} className="h-1.5 flex-1" />
                          <span className={`text-xs font-bold font-mono shrink-0 ${itemCompleto ? 'text-emerald-600' : 'text-foreground'}`}>
                            {item.quantidadeBipada}/{item.quantidade}
                          </span>
                        </div>
                      </div>

                      {itemCompleto && (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
