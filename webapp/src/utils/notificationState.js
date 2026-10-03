// Estado de uma notificação: enviada (tem data de envio ou destinatários), agendada (data marcada) ou rascunho
export function notificationStatus(n) {
  if (n.sent_at || n.recipients > 0) return "sent";
  if (n.scheduled_at) return "scheduled";
  return "draft";
}
