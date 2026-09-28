import { Tag } from "antd";
import { useTranslation } from "react-i18next";

// Estado de um registo nas tabelas do backoffice (is_deleted = 1 → inativo)
export default function StatusTag({ isDeleted }) {
  const { t } = useTranslation();

  return isDeleted ? (
    <Tag variant="outlined" color={"#F04C4B"}>
      {t("Inactive")}
    </Tag>
  ) : (
    <Tag variant="outlined" color={"#06D186"}>
      {t("Active")}
    </Tag>
  );
}
