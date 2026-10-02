import { useState } from "react";
import { Avatar } from "antd";
import { FaRegUser } from "react-icons/fa";

import { avatarSrc } from "./avatar";

/**
 * @function UserAvatar
 * @description User avatar: uploaded image or, as fallback (no image or load error), the Bial user icon.
 * @param {object} props - user, plus any antd Avatar props (size, className, style...).
 */
export default function UserAvatar({ user, style, ...props }) {
  const src = avatarSrc(user);
  // Imagem que falhou a carregar: mostra o ícone
  const [failedSrc, setFailedSrc] = useState(null);
  const showImg = Boolean(src) && failedSrc !== src;

  return (
    <Avatar
      src={showImg ? src : undefined}
      icon={<FaRegUser />}
      alt={user?.name}
      onError={() => {
        setFailedSrc(src);
        return false;
      }}
      style={{
        color: "#FFFFFF",
        backgroundColor: "#00B9D6",
        ...style,
        ...(showImg ? { backgroundColor: "transparent" } : {}),
      }}
      {...props}
    />
  );
}
