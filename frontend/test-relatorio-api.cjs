const axios = require('axios');

async function testRelatorioAPI() {
  try {
    console.log('=== Teste das APIs de Relatórios ===\n');

    // Obter a semana atual
    const now = new Date();
    const dayOfWeek = now.getDay();
    const firstDay = new Date(now);
    firstDay.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
    firstDay.setHours(0, 0, 0, 0);
    
    const lastDay = new Date(firstDay);
    lastDay.setDate(firstDay.getDate() + 6);
    lastDay.setHours(23, 59, 59, 999);
    
    const dataInicio = firstDay.toISOString().split('T')[0];
    const dataFim = lastDay.toISOString().split('T')[0];
    
    console.log('Período da semana atual:', dataInicio, 'a', dataFim);
    console.log('');

    // Teste 1: Dados consolidados
    console.log('1. Testando dados consolidados...');
    try {
      const response1 = await axios.get('http://192.168.100.129:8687/api/fichas/dados-consolidados', {
        params: { dataInicio, dataFim }
      });
      console.log('✅ Dados consolidados:', response1.data);
    } catch (error) {
      console.log('❌ Erro dados consolidados:', error.response?.data || error.message);
    }
    console.log('');

    // Teste 2: Peças cortadas
    console.log('2. Testando peças cortadas...');
    try {
      const response2 = await axios.get('http://192.168.100.129:8687/api/fichas/cortadas/ultimos-meses', {
        params: { dataInicio, dataFim }
      });
      console.log('✅ Peças cortadas:', response2.data);
    } catch (error) {
      console.log('❌ Erro peças cortadas:', error.response?.data || error.message);
    }
    console.log('');

    // Teste 3: Peças recebidas
    console.log('3. Testando peças recebidas...');
    try {
      const response3 = await axios.get('http://192.168.100.129:8687/api/fichas/recebidos/ultimos-meses', {
        params: { dataInicio, dataFim }
      });
      console.log('✅ Peças recebidas:', response3.data);
    } catch (error) {
      console.log('❌ Erro peças recebidas:', error.response?.data || error.message);
    }
    console.log('');

    // Teste 4: Peças perdidas
    console.log('4. Testando peças perdidas...');
    try {
      const response4 = await axios.get('http://192.168.100.129:8687/api/fichas/perdidas/ultimos-meses', {
        params: { dataInicio, dataFim }
      });
      console.log('✅ Peças perdidas:', response4.data);
    } catch (error) {
      console.log('❌ Erro peças perdidas:', error.response?.data || error.message);
    }
    console.log('');

    // Teste 5: Verificar dados no banco
    console.log('5. Verificando dados no banco...');
    try {
      const knex = require('knex')({
        client: 'mysql2',
        connection: {
          host: 'localhost',
          user: 'root',
          password: '',
          database: 'sge_fire_blue'
        }
      });

      const fichas = await knex('fichas')
        .whereRaw('DATE(data_entrada) BETWEEN ? AND ?', [dataInicio, dataFim])
        .select('codigo', 'quantidade', 'quantidade_recebida', 'quantidade_perdida', 'data_entrada', 'status');

      console.log(`📊 Total de fichas no período: ${fichas.length}`);
      
      if (fichas.length > 0) {
        const totalCortadas = fichas.reduce((sum, f) => sum + (f.quantidade || 0), 0);
        const totalRecebidas = fichas.reduce((sum, f) => sum + (f.quantidade_recebida || 0), 0);
        const totalPerdidas = fichas.reduce((sum, f) => sum + (f.quantidade_perdida || 0), 0);
        
        console.log(`📊 Total cortadas: ${totalCortadas}`);
        console.log(`📊 Total recebidas: ${totalRecebidas}`);
        console.log(`📊 Total perdidas: ${totalPerdidas}`);
        
        console.log('\nPrimeiras 5 fichas:');
        fichas.slice(0, 5).forEach(ficha => {
          console.log(`- ${ficha.codigo}: ${ficha.quantidade} cortadas, ${ficha.quantidade_recebida} recebidas, ${ficha.quantidade_perdida} perdidas (${ficha.data_entrada}) - ${ficha.status}`);
        });
      } else {
        console.log('⚠️ Nenhuma ficha encontrada no período');
      }

      await knex.destroy();
    } catch (error) {
      console.log('❌ Erro ao verificar banco:', error.message);
    }

  } catch (error) {
    console.error('Erro geral no teste:', error);
  }
}

testRelatorioAPI(); 