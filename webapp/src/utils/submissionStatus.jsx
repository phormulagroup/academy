import { Tag } from "antd";

// Estado de resposta de uma submissão: respondida (há pelo menos uma resposta enviada), falhou (só há respostas que não saíram) ou por
// responder. `sent` e `failed` são as contagens de respostas enviadas e falhadas.
export function replyState(sent = 0, failed = 0) {
  if (Number(sent) > 0) return "answered";
  if (Number(failed) > 0) return "failed";
  return "waiting";
}

const STATES = {
  answered: { color: "green", label: "Answered" },
  failed: { color: "red", label: "Reply failed" },
  waiting: { color: "gold", label: "Waiting for reply" },
};

export default function SubmissionStatus({ sent, failed, t }) {
  const item = STATES[replyState(sent, failed)];
  return (
    <Tag variant="outlined" color={item.color} className="m-0!">
      {t(item.label)}
    </Tag>
  );
}
