import { useContext, useRef, useState } from "react";
import { Button, Popconfirm, Tooltip } from "antd";
import { TbCameraPlus, TbTrash } from "react-icons/tb";
import { useTranslation } from "react-i18next";

import { Context } from "../utils/context";
import UserAvatar from "../utils/userAvatar";
import {
  AVATAR_ACCEPT,
  avatarFileError,
  removeUserAvatar,
  uploadUserAvatar,
} from "../utils/avatar";

// Tamanho do avatar no perfil (site e backoffice): em destaque, maior que os ícones de ação
const PROFILE_AVATAR_SIZE = {
  xs: 120,
  sm: 136,
  md: 152,
  lg: 160,
  xl: 160,
  xxl: 160,
};

// Avatar do perfil com as ações no próprio avatar (ícones nos cantos inferiores, encostados à borda para tapar o mínimo):
// sem foto só "carregar" (câmara); com foto "mudar" (câmara, à direita) e "remover" (lixo, à esquerda, com confirmação).
// Usado em "A minha conta" (site) e no perfil do utilizador no backoffice. onChange recebe o utilizador atualizado.

/**
 * @function UserAvatarEditor
 * @description Renders a user avatar with edit and remove actions for the user's profile.
 * @param {Object} props - The component props.
 * @param {Object} props.user - The user object containing avatar information.
 * @param {boolean} [props.canEdit=true] - Whether the avatar can be edited.
 * @param {boolean} [props.isOwnAccount=true] - Whether the current user is viewing their own account.
 * @param {Function} [props.onChange] - Callback function called with the updated user object after avatar change or removal.
 */

export default function UserAvatarEditor({
  user,
  canEdit = true,
  isOwnAccount = true,
  onChange,
}) {
  const { toastApi } = useContext(Context);
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const busy = isUploading || isRemoving;

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const error = avatarFileError(file);
    if (error) return toastApi.error(t(error));
    setIsUploading(true);
    try {
      const res = await uploadUserAvatar(file, user);
      onChange?.(res.user);
      toastApi.success(t("Avatar updated successfully"));
    } catch (err) {
      console.log(err);
      toastApi.error(t("Could not update the avatar, please try again"));
    } finally {
      setIsUploading(false);
    }
  }

  async function handleRemove() {
    setIsRemoving(true);
    try {
      const res = await removeUserAvatar(user);
      onChange?.(res.user);
      toastApi.success(t("Avatar removed successfully"));
    } catch (err) {
      console.log(err);
      toastApi.error(t("Could not remove the avatar, please try again"));
    } finally {
      setIsRemoving(false);
    }
  }

  if (!canEdit) return <UserAvatar user={user} size={PROFILE_AVATAR_SIZE} />;

  const iconButton =
    "absolute! bottom-1 h-9! w-9! min-w-9! border-[3px]! border-white! shadow-md";
  const changeLabel = user.img ? t("Change avatar") : t("Add avatar");
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label={changeLabel}
        title={changeLabel}
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="block cursor-pointer rounded-full border-0 bg-transparent p-0">
        <UserAvatar user={user} size={PROFILE_AVATAR_SIZE} />
      </button>
      <Tooltip title={changeLabel}>
        <Button
          shape="circle"
          aria-label={changeLabel}
          loading={isUploading}
          disabled={isRemoving}
          icon={<TbCameraPlus className="text-[17px]" />}
          onClick={() => inputRef.current?.click()}
          className={`${iconButton} right-1 bg-[#163986]! text-white! hover:bg-[#00B9D6]!`}
        />
      </Tooltip>
      {user.img && (
        <Popconfirm
          title={
            isOwnAccount
              ? t("Remove your avatar?")
              : t("Remove this user's avatar?")
          }
          description={t("The default avatar will be shown instead.")}
          okText={t("Remove")}
          okButtonProps={{ danger: true }}
          cancelText={t("Cancel")}
          onConfirm={handleRemove}>
          <Tooltip title={t("Remove avatar")}>
            <Button
              shape="circle"
              aria-label={t("Remove avatar")}
              loading={isRemoving}
              disabled={isUploading}
              icon={<TbTrash className="text-[17px]" />}
              className={`${iconButton} left-1 bg-[#FFF1F0]! text-[#D9363E]! hover:bg-[#FFE1DE]!`}
            />
          </Tooltip>
        </Popconfirm>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_ACCEPT}
        hidden
        onChange={handleFile}
      />
    </div>
  );
}
