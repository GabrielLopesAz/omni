import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';
import { Loader2, Plus, Unplug, RefreshCcw, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'react-router-dom';

const PROVIDERS = [
  { id: 'FAKE_MARKETPLACE', name: 'Fake Marketplace (Dev/Test)' },
  { id: 'SHOPEE', name: 'Shopee' },
  { id: 'MERCADO_LIVRE', name: 'Mercado Livre' },
  { id: 'BLING', name: 'Bling ERP' },
];

export function IntegracoesTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Show toast if redirected from callback
  useEffect(() => {
    const status = searchParams.get('status');
    const msg = searchParams.get('message');
    const provider = searchParams.get('provider');

    if (status === 'success') {
      toast({
        title: 'Conexão realizada',
        description: `Integração com ${provider} concluída com sucesso.`,
      });
      // Limpa os params para n exibir novamente no reload
      setSearchParams(new URLSearchParams());
    } else if (status === 'error') {
      toast({
        variant: 'destructive',
        title: 'Falha na conexão',
        description: `Erro ao conectar ${provider}: ${msg || 'Desconhecido'}`,
      });
      setSearchParams(new URLSearchParams());
    }
  }, [searchParams, setSearchParams, toast]);

  const { data: integracoes, isLoading } = useQuery({
    queryKey: ['integracoes'],
    queryFn: async () => {
      const res = await api.get('/api/v1/integracoes');
      return res.data;
    }
  });

  const connectMutation = useMutation({
    mutationFn: async (provider: string) => {
      const res = await api.post(`/api/v1/integracoes/${provider}/connect`);
      return res.data.authorizationUrl;
    },
    onSuccess: (url) => {
      // Redireciona o usuario para o marketplace
      window.location.href = url;
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro de infraestrutura',
        description: error.response?.data?.message || 'Falha ao solicitar URL de autorização.'
      });
    }
  });

  const disconnectMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/api/v1/integracoes/${id}/disconnect`);
    },
    onSuccess: () => {
      toast({ title: 'Desconectado', description: 'Credenciais apagadas com sucesso.' });
      queryClient.invalidateQueries({ queryKey: ['integracoes'] });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao desconectar',
        description: error.response?.data?.message || 'Falha ao processar operação.'
      });
    }
  });

  const getStatusBadge = (status: string, health: string) => {
    if (status === 'DESCONECTADO') return <Badge variant="secondary"><Unplug className="mr-1 h-3 w-3"/> Desconectado</Badge>;
    if (status === 'PENDENTE') return <Badge variant="outline" className="text-yellow-600"><RefreshCcw className="mr-1 h-3 w-3 animate-spin"/> Pendente</Badge>;
    if (health === 'OK') return <Badge className="bg-emerald-500 hover:bg-emerald-600"><CheckCircle2 className="mr-1 h-3 w-3"/> Conectado</Badge>;
    if (health === 'ATENCAO') return <Badge variant="destructive"><AlertTriangle className="mr-1 h-3 w-3"/> Expirado/Requer Atenção</Badge>;
    return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3"/> Erro</Badge>;
  };

  if (isLoading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {PROVIDERS.map(p => {
        // Encontra integrações ativas para este provider
        const connectedInstances = integracoes?.filter((i: any) => i.provider === p.id) || [];
        
        return (
          <Card key={p.id} className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg">{p.name}</CardTitle>
              <CardDescription>Gerencie suas contas conectadas</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 space-y-4">
              {connectedInstances.length === 0 ? (
                <div className="text-sm text-muted-foreground italic text-center py-4">Nenhuma conta conectada.</div>
              ) : (
                <div className="space-y-3">
                  {connectedInstances.map((inst: any) => (
                    <div key={inst.id} className="border rounded-md p-3 text-sm flex flex-col space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium truncate pr-2" title={inst.externalAccountName || 'Conta Padrão'}>
                          {inst.externalAccountName || 'Conta Padrão'}
                        </span>
                        {getStatusBadge(inst.status, inst.health)}
                      </div>
                      
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-xs text-muted-foreground">ID: {inst.externalAccountId || 'N/A'}</span>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="h-7 text-xs px-2"
                          disabled={inst.status === 'DESCONECTADO' || disconnectMutation.isPending}
                          onClick={() => {
                            if(confirm(`Tem certeza que deseja desconectar ${inst.externalAccountName || 'esta conta'}?`)) {
                              disconnectMutation.mutate(inst.id);
                            }
                          }}
                        >
                          Desconectar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            <CardFooter className="bg-muted/30 pt-4 rounded-b-lg">
              <Button 
                className="w-full" 
                variant="outline" 
                disabled={connectMutation.isPending}
                onClick={() => connectMutation.mutate(p.id)}
              >
                {connectMutation.isPending && connectMutation.variables === p.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Nova Conexão Segura
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
