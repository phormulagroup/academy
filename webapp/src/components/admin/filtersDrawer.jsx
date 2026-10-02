import { Button, Drawer } from "antd";
import { useTranslation } from "react-i18next";

// Drawer com todos os filtros de uma listagem (pesquisa incluída), aberto pelo ícone de filtro na barra da página.
// O rascunho só se aplica ao clicar em "Aplicar"; Limpar/Aplicar ficam no cabeçalho do Drawer, sempre visíveis.
export default function FiltersDrawer({ open, onClose, title, onApply, onClear, children }) {
  const { t } = useTranslation();

  return (
    <Drawer
      title={title ?? t("Filters")}
      open={open}
      onClose={onClose}
      size={500}
      extra={
        <div className="flex gap-2">
          <Button onClick={onClear}>{t("Clear")}</Button>
          <Button type="primary" onClick={onApply}>
            {t("Apply")}
          </Button>
        </div>
      }>
      <div className="flex flex-col gap-4">{children}</div>
    </Drawer>
  );
}
