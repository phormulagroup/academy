import { Button, Tooltip } from "antd";
import { RxReload } from "react-icons/rx";
import { useTranslation } from "react-i18next";

// Botão de atualizar uma listagem: só o ícone, com um tooltip a dizer para que serve
export default function RefreshButton({ title, ...props }) {
  const { t } = useTranslation();
  return (
    <Tooltip title={title ?? t("Refresh")}>
      <Button icon={<RxReload />} aria-label={title ?? t("Refresh")} {...props} />
    </Tooltip>
  );
}
