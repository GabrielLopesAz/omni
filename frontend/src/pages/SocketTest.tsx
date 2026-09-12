import { useState, useEffect } from 'react';
import { useSocketIO, setServerIp, getServerIp } from '@/hooks/useSocketIO';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader, Clock, Send, Wifi, WifiOff, MessageSquare, AlertCircle, Save, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SocketMessage {
  id: string;
  message: string;
  timestamp: string;
  type: 'received' | 'sent' | 'system';
}

export default function SocketTest() {
  const { socket, connected, connectionUrl } = useSocketIO();
  const [messages, setMessages] = useState<SocketMessage[]>([]);
  const [pingResults, setPingResults] = useState<{ sent: string; received: string; latency: number }[]>([]);
  const [serverTime, setServerTime] = useState<string | null>(null);
  const [clientCount, setClientCount] = useState<number>(0);
  const [serverIp, setServerIpState] = useState(getServerIp() || '');
  const [isVercel, setIsVercel] = useState(false);

  useEffect(() => {
    // Verificar se estamos em produção (Vercel)
    const vercelDomain = window.location.hostname.includes('vercel.app');
    setIsVercel(vercelDomain);
    
    // Adicionar mensagem de diagnóstico no carregamento da página
    addMessage(`Ambiente: ${vercelDomain ? 'Vercel (Produção)' : 'Desenvolvimento Local'}`, 'system');
    addMessage(`Hostname: ${window.location.hostname}`, 'system');
    addMessage(`Tentando conectar em: ${connectionUrl}`, 'system');
  }, [connectionUrl]);

  // Função para adicionar mensagem ao histórico
  const addMessage = (message: string, type: 'received' | 'sent' | 'system') => {
    const newMessage: SocketMessage = {
      id: Math.random().toString(36).substring(2, 9),
      message,
      timestamp: new Date().toISOString(),
      type
    };
    setMessages(prev => [...prev, newMessage]);
  };

  // Inicializar ouvintes de eventos do socket
  useEffect(() => {
    if (!socket) return;

    // Adicionar mensagem de sistema quando o socket conectar
    addMessage('Socket conectado ao servidor', 'system');

    // Ouvir evento de boas-vindas do servidor
    socket.on('welcome', (data) => {
      addMessage(`Bem-vindo! ${data.message}`, 'received');
      setServerTime(data.time);
    });

    // Ouvir evento de outros clientes conectados
    socket.on('client_connected', (data) => {
      addMessage(`Novo cliente conectado: ${data.id}`, 'system');
      // Atualizar contador de clientes (simulação)
      setClientCount(prev => prev + 1);
    });

    // Ouvir evento de clientes desconectados
    socket.on('client_disconnected', (data) => {
      addMessage(`Cliente desconectado: ${data.id} (Razão: ${data.reason})`, 'system');
      // Atualizar contador de clientes (simulação)
      setClientCount(prev => Math.max(0, prev - 1));
    });

    // Ouvir respostas de ping
    socket.on('pong_server', (data) => {
      const sentTime = new Date(data.clientTimestamp).getTime();
      const receivedTime = new Date().getTime();
      const latency = receivedTime - sentTime;
      
      setPingResults(prev => [...prev.slice(-4), {
        sent: data.clientTimestamp,
        received: data.receivedAt,
        latency
      }]);
      
      addMessage(`Pong recebido! Latência: ${latency}ms`, 'received');
    });

    // Ouvir eventos de alterações em dados
    socket.on('cliente_criado', (data) => {
      addMessage(`Cliente criado: ${data.nome}`, 'received');
    });

    socket.on('cliente_atualizado', (data) => {
      addMessage(`Cliente atualizado: ${data.nome}`, 'received');
    });

    socket.on('cliente_excluido', (data) => {
      addMessage(`Cliente excluído: ${data.nome}`, 'received');
    });

    socket.on('fornecedor_criado', (data) => {
      addMessage(`Fornecedor criado: ${data.nome}`, 'received');
    });

    socket.on('fornecedor_atualizado', (data) => {
      addMessage(`Fornecedor atualizado: ${data.nome}`, 'received');
    });

    socket.on('fornecedor_excluido', (data) => {
      addMessage(`Fornecedor excluído: ${data.nome}`, 'received');
    });

    socket.on('produto_criado', (data) => {
      addMessage(`Produto criado: ${data.nome}`, 'received');
    });

    socket.on('produto_atualizado', (data) => {
      addMessage(`Produto atualizado: ${data.nome}`, 'received');
    });

    socket.on('produto_excluido', (data) => {
      addMessage(`Produto excluído: ${data.nome}`, 'received');
    });

    // Registrar erros de conexão
    socket.on('connect_error', (err) => {
      addMessage(`Erro de conexão: ${err.message}`, 'system');
    });

    // Limpar todos os listeners ao desmontar
    return () => {
      socket.off('welcome');
      socket.off('client_connected');
      socket.off('client_disconnected');
      socket.off('pong_server');
      socket.off('cliente_criado');
      socket.off('cliente_atualizado');
      socket.off('cliente_excluido');
      socket.off('fornecedor_criado');
      socket.off('fornecedor_atualizado');
      socket.off('fornecedor_excluido');
      socket.off('produto_criado');
      socket.off('produto_atualizado');
      socket.off('produto_excluido');
      socket.off('connect_error');
    };
  }, [socket]);

  // Enviar ping para o servidor
  const sendPing = () => {
    if (!socket || !connected) return;
    
    const timestamp = new Date().toISOString();
    socket.emit('ping_server', { timestamp });
    addMessage('Ping enviado para o servidor', 'sent');
  };

  // Salvar o IP do servidor
  const handleSaveServerIp = () => {
    setServerIp(serverIp);
    addMessage(`Configuração de servidor alterada para: ${serverIp}`, 'system');
  };

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Teste de Conexão Socket.IO</CardTitle>
              <CardDescription>Use esta página para testar a conexão em tempo real entre máquinas</CardDescription>
            </div>
            <Badge variant={connected ? "success" : "destructive"} className="h-8 px-3 flex items-center gap-2">
              {connected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
              {connected ? 'Conectado' : 'Desconectado'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isVercel && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Ambiente Vercel Detectado</AlertTitle>
              <AlertDescription>
                Você está acessando pelo Vercel. Para conexões Socket.IO funcionarem, você precisa:
                <ol className="list-decimal pl-5 mt-2 space-y-1">
                  <li>Certificar-se de que o servidor backend está rodando em uma máquina acessível</li>
                  <li>Configurar o endereço IP correto do servidor no campo abaixo</li>
                  <li>Verificar se as portas estão abertas no firewall</li>
                </ol>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Configuração do Servidor */}
          <Card>
            <CardHeader className="py-2">
              <CardTitle className="text-sm">Configuração do Servidor</CardTitle>
            </CardHeader>
            <CardContent className="py-2">
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label htmlFor="server-ip">Endereço IP do Servidor</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="server-ip" 
                      value={serverIp} 
                      onChange={(e) => setServerIpState(e.target.value)}
                      placeholder="Exemplo: 192.168.0.10"
                    />
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={handleSaveServerIp}
                      className="shrink-0"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Salvar
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  <p>URL de conexão atual: <code className="bg-muted px-1 rounded">{connectionUrl}</code></p>
                  <p className="mt-1">Para usar conexões em rede, digite o IP da máquina onde o servidor está rodando.</p>
                  {isVercel && (
                    <p className="mt-1 text-yellow-600">Em produção (Vercel), você precisa usar o IP da sua máquina na rede Radmin VPN.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="py-2">
                <CardTitle className="text-sm">Informações da Conexão</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">Status:</span>
                    <span>{connected ? 'Conectado' : 'Desconectado'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Socket ID:</span>
                    <span>{socket?.id || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Ambiente:</span>
                    <span>{isVercel ? 'Vercel (Produção)' : 'Desenvolvimento Local'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Servidor:</span>
                    <span>{serverIp || window.location.hostname}:8687</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Hora do servidor:</span>
                    <span>{serverTime ? new Date(serverTime).toLocaleTimeString() : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Clientes conectados:</span>
                    <span>{clientCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="py-2">
                <CardTitle className="text-sm">Teste de Latência</CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <div className="space-y-2">
                  {pingResults.length > 0 ? (
                    <div className="space-y-1 text-sm">
                      {pingResults.map((ping, index) => (
                        <div key={index} className="flex justify-between">
                          <span className="font-medium">Ping #{index + 1}:</span>
                          <span className={ping.latency > 100 ? 'text-yellow-500' : 'text-green-500'}>
                            {ping.latency} ms
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center text-sm text-muted-foreground">
                      Nenhum teste de ping realizado
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="py-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={!connected} 
                  onClick={sendPing}
                  className="w-full"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Testar Ping
                </Button>
              </CardFooter>
            </Card>
          </div>
          
          <Card>
            <CardHeader className="py-2">
              <CardTitle className="text-sm flex items-center">
                <MessageSquare className="h-4 w-4 mr-2" />
                Log de Mensagens
              </CardTitle>
            </CardHeader>
            <CardContent className="py-2 max-h-[300px] overflow-y-auto">
              {messages.length > 0 ? (
                <div className="space-y-2">
                  {messages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`p-2 rounded-lg text-sm ${
                        msg.type === 'received' 
                          ? 'bg-blue-50 text-blue-700' 
                          : msg.type === 'sent' 
                            ? 'bg-green-50 text-green-700' 
                            : 'bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex justify-between mb-1">
                        <span className="font-medium">
                          {msg.type === 'received' 
                            ? 'Servidor' 
                            : msg.type === 'sent' 
                              ? 'Você' 
                              : 'Sistema'}
                        </span>
                        <span className="text-xs opacity-70">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p>{msg.message}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma mensagem recebida</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="py-2 flex justify-between">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={!connected} 
                onClick={sendPing}
              >
                <Send className="h-4 w-4 mr-2" />
                Enviar Ping
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setMessages([])}
              >
                Limpar Histórico
              </Button>
            </CardFooter>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
} 