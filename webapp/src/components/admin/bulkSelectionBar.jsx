import { Button, Tooltip } from "antd";
import { useTranslation } from "react-i18next";

// Ação que precisa de pelo menos um ficheiro selecionado: com nada selecionado fica desativada e explica porquê.
// O span à volta é necessário porque um botão desativado não dispara os eventos do Tooltip.
export function SelectionAction({ selection, children }) {
  const { t } = useTranslation();
  return (
    <Tooltip
      title={selection.count === 0 ? t("Select at least one file") : null}>
      <span className="inline-flex">{children}</span>
    </Tooltip>
  );
}

/**
 * @function BulkSelectionBar
 * @description A bar component for managing bulk selection actions, displaying the number of selected items, and providing buttons for selecting all, clearing the selection, and additional custom actions.
 * @param {Object} props
 * @param {Object} props.selection - The current selection state.
 * @param {number} props.total - The total number of items available for selection.
 * @param {Function} props.onSelectAll - Callback to select all items.
 * @param {React.ReactNode} props.children - Additional action buttons to display.
 */

export default function BulkSelectionBar({
  selection,
  total,
  onSelectAll,
  children,
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="min-w-30 text-[13px] font-semibold text-[#163986] tabular-nums">
        {t("{{count}} selected", { count: selection.count })}
      </span>
      <Button
        loading={selection.isSelectingAll}
        disabled={total === 0 || selection.count >= total}
        onClick={onSelectAll}>
        {t("Select all")} ({total})
      </Button>
      <SelectionAction selection={selection}>
        <Button disabled={selection.count === 0} onClick={selection.clear}>
          {t("Clear")}
        </Button>
      </SelectionAction>
      {children}
      <Button onClick={selection.exit}>{t("Cancel")}</Button>
    </div>
  );
}
