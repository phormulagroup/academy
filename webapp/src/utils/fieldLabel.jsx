// Nome do campo com a mensagem de erro à frente (formulários de documentos e downloads do backoffice)
export default function FieldLabel({ label, error }) {
  return (
    <span>
      {label}
      {error && <span className="text-red-500 ml-1 text-sm">{error}</span>}
    </span>
  );
}
