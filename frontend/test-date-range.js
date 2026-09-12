// Função para obter o primeiro e último dia da semana atual
function getCurrentWeekRange() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Domingo, 1 = Segunda, etc.
  
  // Calcular o primeiro dia da semana (Segunda-feira)
  const firstDay = new Date(now);
  firstDay.setDate(now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
  firstDay.setHours(0, 0, 0, 0);
  
  // Calcular o último dia da semana (Domingo)
  const lastDay = new Date(firstDay);
  lastDay.setDate(firstDay.getDate() + 6);
  lastDay.setHours(23, 59, 59, 999);
  
  console.log('getCurrentWeekRange - Primeiro dia da semana:', firstDay.toISOString().split('T')[0]);
  console.log('getCurrentWeekRange - Último dia da semana:', lastDay.toISOString().split('T')[0]);
  
  return { from: firstDay, to: lastDay };
}

// Testar a função
const range = getCurrentWeekRange();
console.log('Range completo:', range);
console.log('Data atual:', new Date().toISOString().split('T')[0]); 