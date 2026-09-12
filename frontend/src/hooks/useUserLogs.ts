import { supabase } from "@/integrations/supabase/client";

export const useUserLogs = () => {
  const registerUserAction = async (acao: string, userId?: string) => {
    // Se não tiver userId, nem tenta registrar
    if (!userId) {
      console.log('Log ignorado: usuário não identificado');
      return;
    }
    
    try {
      console.log('Registrando ação:', acao, 'para usuário:', userId);
      
      const logData = {
        usuario_id: userId,
        acao,
        ip: 'cliente-web',
        timestamp: new Date().toISOString()
      };
      
      // Usar upsert para ser mais tolerante a erros
      const { error } = await supabase
        .from('logs')
        .upsert(logData, { onConflict: 'usuario_id,acao,timestamp' })
        .select();
        
      if (error) {
        // Apenas registra o erro sem interromper a aplicação
        console.warn('Erro ao registrar log:', error.message);
      }
    } catch (error) {
      // Falha silenciosa para não afetar a experiência do usuário
      console.warn('Erro ao registrar ação no log:', error);
    }
  };

  return { registerUserAction };
};