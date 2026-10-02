import { Avatar } from "antd";
import { Link } from "react-router-dom";
import { FaRegUser } from "react-icons/fa";
import { useTranslation } from "react-i18next";

import config from "../../utils/config";

// Utilizador nas tabelas dos relatórios: avatar quadrado + nome e e-mail empilhados, igual em todos os relatórios.
export default function UserCell({ id, name, email, img, linkToProfile = true }) {
  const { t } = useTranslation();
  // Sem id, nome nem e-mail: a conta foi eliminada
  const isRemoved = !id && !name && !email;

  const content = (
    <div className="flex items-center min-w-0">
      <Avatar
        shape="square"
        size={40}
        style={{ backgroundColor: "#E6F9FC" }}
        src={img ? `${config.server_ip}/media/${img}` : undefined}
        icon={<FaRegUser className="text-[#163986]" />}
        className="mr-2! shrink-0"
      />
      <div className="flex flex-col min-w-0">
        {isRemoved ? (
          <>
            <p className="truncate italic text-[#8A8D98] mb-0!">{t("Deleted user")}</p>
            <p className="text-[10px] truncate italic text-[#8A8D98] mb-0!">{t("Deleted e-mail")}</p>
          </>
        ) : (
          <>
            <p className="truncate mb-0!">{name}</p>
            <p className="text-[10px] truncate mb-0!">{email}</p>
          </>
        )}
      </div>
    </div>
  );

  if (linkToProfile && id) return <Link to={`/admin/users/${id}`}>{content}</Link>;
  return content;
}
