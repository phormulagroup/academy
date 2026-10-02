import { Button, Dropdown, Tooltip } from "antd";
import { IoIosOptions } from "react-icons/io";

// Ações de uma linha de tabela. Com 2 ou mais opções é o dropdown de opções; com UMA só mostra-se o ícone dessa opção
// diretamente (com tooltip). Sem nenhuma não mostra nada, em vez de um menu vazio.
// `items`: os itens de menu do antd (label, key, icon, onClick, danger, disabled); valores falsos (`cond && {...}`) são ignorados.
export default function RowActions({ items, icon = <IoIosOptions />, loading }) {
  const visible = (items || []).filter(Boolean);
  if (visible.length === 0) return null;

  if (visible.length === 1) {
    const [item] = visible;
    return (
      <Tooltip title={item.label}>
        <Button
          type="text"
          danger={item.danger}
          disabled={item.disabled}
          loading={loading}
          aria-label={typeof item.label === "string" ? item.label : undefined}
          icon={item.icon}
          // A linha da tabela pode ser clicável (abre os detalhes): este clique é só da ação
          onClick={(event) => {
            event.stopPropagation();
            item.onClick?.(event);
          }}
        />
      </Tooltip>
    );
  }

  return (
    <Dropdown trigger={["click"]} placement="bottomRight" menu={{ items: visible }}>
      {/* Só ícone (via prop icon), para ter o mesmo tamanho quadrado do botão de uma só ação */}
      <Button type="text" loading={loading} icon={icon} aria-label="Opções" />
    </Dropdown>
  );
}
