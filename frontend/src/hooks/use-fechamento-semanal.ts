import { useState, useCallback } from 'react';
import { 
  gerarRelatorioSemanal, 
  salvarFechamentoSemanal,
  finalizarFechamentoSemanal,
  finalizarFechamentoBanca,
  gerarComprovantePDF,
  listarFechamentosHistoricos,
  buscarFechamentoPorId
} from '@/services/fechamentoService';
import { FechamentoBanca, RelatorioSemanal } from '@/types/fechamento';
import { useToast } from '@/hooks/use-toast';

export function useFechamentoSemanal() {
  const [relatorio, setRelatorio] = useState<RelatorioSemanal | null>(null);
  const [historicoFechamentos, setHistoricoFechamentos] = useState<RelatorioSemanal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistorico, setIsLoadingHistorico] = useState(false);
  const { toast } = useToast();

  /**
   * Gera o fechamento semanal para o período informado
   */
  const gerarFechamento = useCallback(async (dataInicio?: Date, dataFim?: Date) => {
    setIsLoading(true);
    try {
      const resultado = await gerarRelatorioSemanal(dataInicio, dataFim);
      setRelatorio(resultado);
      
      toast({
        title: "Fechamento gerado",
        description: `Fechamento gerado para o período de ${resultado.dataInicio} a ${resultado.dataFim}.`,
      });
      
      return resultado;
    } catch (error) {
      console.error('Erro ao gerar fechamento:', error);
      toast({
        title: "Erro ao gerar fechamento",
        description: "Ocorreu um erro ao gerar o fechamento semanal.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  /**
   * Carrega o histórico de fechamentos
   */
  const carregarHistorico = useCallback(async () => {
    setIsLoadingHistorico(true);
    try {
      const historico = await listarFechamentosHistoricos();
      setHistoricoFechamentos(historico);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      toast({
        title: "Erro ao carregar histórico",
        description: "Ocorreu um erro ao carregar o histórico de fechamentos.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingHistorico(false);
    }
  }, [toast]);

  /**
   * Busca um fechamento específico do histórico
   */
  const buscarFechamentoHistorico = useCallback(async (id: string) => {
    try {
      const fechamento = await buscarFechamentoPorId(id);
      return fechamento;
    } catch (error) {
      console.error('Erro ao buscar fechamento histórico:', error);
      toast({
        title: "Erro ao buscar fechamento",
        description: "Ocorreu um erro ao buscar o fechamento.",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  /**
   * Salva o fechamento semanal atual
   */
  const salvarFechamento = useCallback(async () => {
    if (!relatorio) {
      toast({
        title: "Nenhum relatório para salvar",
        description: "Gere um relatório de fechamento primeiro.",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading(true);
    try {
      const resultado = await salvarFechamentoSemanal(relatorio);
      if (resultado) {
        toast({
          title: "Fechamento salvo",
          description: "O fechamento semanal foi salvo com sucesso.",
        });
      }
      return resultado;
    } catch (error) {
      console.error('Erro ao salvar fechamento:', error);
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar o fechamento semanal.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [relatorio, toast]);

  /**
   * Finaliza o fechamento semanal atual
   */
  const finalizarFechamento = useCallback(async () => {
    if (!relatorio) {
      toast({
        title: "Nenhum relatório para finalizar",
        description: "Gere um relatório de fechamento primeiro.",
        variant: "destructive",
      });
      return false;
    }

    // Verifica se todas as bancas estão pagas
    const todasBancasPagas = relatorio.fechamentos.length > 0 && 
                            relatorio.fechamentos.every(fechamento => fechamento.status === 'pago');
    
    if (!todasBancasPagas) {
      toast({
        title: "Não é possível finalizar",
        description: "Todas as bancas devem estar pagas para finalizar o fechamento semanal.",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading(true);
    try {
      const resultado = await finalizarFechamentoSemanal(relatorio.id);
      if (resultado) {
        // Atualiza o status do relatório para pago
        setRelatorio({
          ...relatorio,
          status: 'pago'
        });
        
        // Recarregar o histórico para atualizar o número no card
        carregarHistorico();
        
        toast({
          title: "Fechamento finalizado",
          description: "O fechamento semanal foi finalizado e marcado como pago com sucesso.",
        });
      }
      return resultado;
    } catch (error) {
      console.error('Erro ao finalizar fechamento:', error);
      toast({
        title: "Erro ao finalizar",
        description: "Ocorreu um erro ao finalizar o fechamento semanal.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [relatorio, toast, carregarHistorico]);

  /**
   * Finaliza o fechamento de uma banca específica
   */
  const finalizarBanca = useCallback(async (idBanca: string) => {
    if (!relatorio) {
      toast({
        title: "Nenhum relatório disponível",
        description: "Gere um relatório de fechamento primeiro.",
        variant: "destructive",
      });
      return false;
    }

    setIsLoading(true);
    try {
      const resultado = await finalizarFechamentoBanca(relatorio.id, idBanca);
      if (resultado) {
        // Encontra o fechamento da banca para atualizar
        const fechamentosAtualizados = [...relatorio.fechamentos];
        const index = fechamentosAtualizados.findIndex(f => f.idBanca === idBanca);
        
        if (index !== -1) {
          // Cria um novo objeto para o fechamento atualizado
          const fechamentoAtualizado: FechamentoBanca = {
            ...fechamentosAtualizados[index],
            status: 'pago',
            dataPagamento: new Date().toLocaleDateString('pt-BR')
          };
          
          // Substitui o fechamento no array
          fechamentosAtualizados[index] = fechamentoAtualizado;
          
          // Atualiza o relatório
          setRelatorio({
            ...relatorio,
            fechamentos: fechamentosAtualizados
          });
          
          // Recarregar o histórico para atualizar o número no card
          carregarHistorico();
          
          toast({
            title: "Fechamento de banca finalizado",
            description: "O fechamento da banca foi finalizado com sucesso.",
          });
        }
      }
      return resultado;
    } catch (error) {
      console.error('Erro ao finalizar banca:', error);
      toast({
        title: "Erro ao finalizar",
        description: "Ocorreu um erro ao finalizar o fechamento da banca.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [relatorio, toast, carregarHistorico]);

  /**
   * Gera e imprime o comprovante de fechamento para uma banca
   */
  const imprimirComprovante = useCallback(async (fechamento: FechamentoBanca) => {
    setIsLoading(true);
    try {
      // Gera o comprovante PDF
      const resultado = await gerarComprovantePDF(fechamento);
      
      if (resultado) {
        toast({
          title: "Comprovante gerado",
          description: `O comprovante para ${fechamento.nomeBanca} foi gerado com sucesso.`,
        });
      }
      
      return resultado;
    } catch (error) {
      console.error('Erro ao gerar comprovante:', error);
      toast({
        title: "Erro ao gerar comprovante",
        description: "Não foi possível gerar o comprovante de fechamento.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return {
    relatorio,
    historicoFechamentos,
    isLoading,
    isLoadingHistorico,
    gerarFechamento,
    carregarHistorico,
    buscarFechamentoHistorico,
    salvarFechamento,
    finalizarFechamento,
    finalizarBanca,
    imprimirComprovante
  };
} 