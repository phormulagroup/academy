import { useRef, useState } from "react";
import { Button, Modal } from "antd";
import { LuCircleAlert, LuCircleCheck, LuInfo, LuTrash2, LuTriangleAlert } from "react-icons/lu";
import { useTranslation } from "react-i18next";

// Cor e ícone de cada tipo de confirmação: danger (apagar), warning (repor/fechar), success (completar), info
const TONES = {
  danger: { icon: <LuTrash2 />, bg: "#FDECEC", color: "#DB0709" },
  warning: { icon: <LuTriangleAlert />, bg: "#FFF4E5", color: "#E67E00" },
  success: { icon: <LuCircleCheck />, bg: "#E8F5EC", color: "#2F8351" },
  info: { icon: <LuInfo />, bg: "#E6F9FC", color: "#163986" },
};

// Janela de confirmação de uma ação: ícone de cor, título, descrição, conteúdo extra (children) e botões.
// `tone` define a cor e o ícone (pode ser substituído por `icon`); em "danger" o botão de confirmar é vermelho (ou força com `danger`).
// `hideCancel` mostra só um botão (avisos).
export default function ConfirmModal({ open, onCancel, onConfirm, title, description, tone = "info", icon, okText, cancelText, hideCancel = false, danger, loading = false, children, width = 440 }) {
  const { t } = useTranslation();
  const style = TONES[tone] ?? TONES.info;

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      width={width}
      centered
      destroyOnHidden
      mask={{ closable: !loading }}
      closable={!loading}
      footer={
        <div className="flex justify-end gap-2">
          {!hideCancel && (
            <Button disabled={loading} onClick={onCancel}>
              {cancelText ?? t("Cancel")}
            </Button>
          )}
          <Button type="primary" danger={danger ?? tone === "danger"} loading={loading} onClick={onConfirm}>
            {okText ?? t("Confirm")}
          </Button>
        </div>
      }>
      <div className="flex flex-col items-center px-2 pt-4 text-center">
        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full text-[26px]" style={{ background: style.bg, color: style.color }}>
          {icon ?? style.icon ?? <LuCircleAlert />}
        </span>
        <p className="mb-2! text-[18px] font-bold">{title}</p>
        {description && <p className="mb-0! text-[14px] leading-relaxed text-[#5B5F6B]">{description}</p>}
        {children && <div className="mt-4 w-full text-left">{children}</div>}
      </div>
    </Modal>
  );
}

// Para confirmar ações a partir de um botão sem gerir o estado da janela em cada sítio:
//   const [confirm, confirmHolder] = useConfirm();   ... {confirmHolder} ... confirm({ title, description, tone, onOk })
// `onOk` pode ser assíncrona: o botão fica a carregar e a janela fecha quando termina.
export function useConfirm() {
  const [config, setConfig] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const lastConfig = useRef(null);
  if (config) lastConfig.current = config;

  const confirm = (next) => {
    setConfig(next);
    setOpen(true);
  };

  async function handleConfirm() {
    setLoading(true);
    try {
      await config?.onOk?.();
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  const holder = <ConfirmModal {...(lastConfig.current ?? {})} open={open} loading={loading} onCancel={() => setOpen(false)} onConfirm={handleConfirm} />;
  return [confirm, holder];
}
