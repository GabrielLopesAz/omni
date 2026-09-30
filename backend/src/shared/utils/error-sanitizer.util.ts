export function sanitizeExternalError(error: any): string {
  if (!error) return 'Erro desconhecido';
  let message = typeof error === 'string' ? error : (error.message || String(error));
  
  // Replace tokens and sensitive data
  message = message.replace(/(access_token|refresh_token|authorization|client_secret|code|Bearer)\s*[:=]\s*[^\s&"']+|Bearer\s+[^\s&"']+/gi, '***REDACTED***');

  // Also truncate if too long
  if (message.length > 500) {
    message = message.substring(0, 500) + '... [TRUNCATED]';
  }

  return message;
}
