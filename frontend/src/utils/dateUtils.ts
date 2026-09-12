/**
 * Formata uma data para o formato local brasileiro (DD/MM/YYYY)
 */
export function formatDateBR(date: Date): string {
  return date.toLocaleDateString('pt-BR');
}

/**
 * Retorna o número da semana de uma data
 */
export function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

/**
 * Retorna a semana no formato YYYY-WXX (Ex: 2023-W27)
 */
export function getWeekString(date: Date): string {
  const year = date.getFullYear();
  const weekNumber = getWeekNumber(date);
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
}

/**
 * Retorna o primeiro dia da semana (domingo) para uma data
 */
export function getFirstDayOfWeek(date: Date): Date {
  const dayOfWeek = date.getDay(); // 0 (domingo) a 6 (sábado)
  const diff = date.getDate() - dayOfWeek;
  return new Date(date.getFullYear(), date.getMonth(), diff);
}

/**
 * Retorna o último dia da semana (sábado) para uma data
 */
export function getLastDayOfWeek(date: Date): Date {
  const firstDay = getFirstDayOfWeek(date);
  return new Date(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate() + 6);
}

/**
 * Retorna a data de início e fim da semana atual
 */
export function getCurrentWeekRange(): { start: Date; end: Date } {
  const today = new Date();
  return {
    start: getFirstDayOfWeek(today),
    end: getLastDayOfWeek(today)
  };
}

/**
 * Verifica se uma data está dentro de um intervalo
 */
export function isDateInRange(date: Date, startDate: Date, endDate: Date): boolean {
  return date >= startDate && date <= endDate;
}

/**
 * Converte uma string de data (DD/MM/YYYY) para objeto Date
 */
export function parseDate(dateString: string): Date {
  const parts = dateString.split('/');
  return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
} 

/**
 * Formata uma data para o formato MySQL (YYYY-MM-DD)
 */
export function formatDateMySQL(date: Date): string {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const dia = String(date.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

/**
 * Formata uma data para o formato MySQL com hora (YYYY-MM-DD HH:mm:ss)
 */
export function formatDateTimeMySQL(date: Date): string {
  const dataStr = formatDateMySQL(date);
  const hora = String(date.getHours()).padStart(2, '0');
  const minuto = String(date.getMinutes()).padStart(2, '0');
  const segundo = String(date.getSeconds()).padStart(2, '0');
  return `${dataStr} ${hora}:${minuto}:${segundo}`;
} 