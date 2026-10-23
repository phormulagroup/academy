import { useRef, useState } from "react";
import { Button, Modal } from "antd";
import {
  LuCircleAlert,
  LuCircleCheck,
  LuInfo,
  LuTrash2,
  LuTriangleAlert,
} from "react-icons/lu";
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
// `hideCancel` mostra só um botão (avisos). `okClassName`/`cancelClassName` acrescentam classes aos botões (ex.: cores do site público).
export default function ConfirmModal({
  open,
  onCancel,
  onConfirm,
  title,
  description,
  tone = "info",
  icon,
  okText,
  cancelText,
  hideCancel = false,
  danger,
  loading = false,
  children,
  width = 440,
  okClassName = "",
  cancelClassName = "",
}) {
  const { t } = useTranslation();
  const style = TONES[tone] ?? TONES.info;

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      width={width}
      // No topo, a 40px da margem do ecrã (em vez de centrada na vertical)
      style={{ top: 40 }}
      destroyOnHidden
      mask={{ closable: !loading }}
      closable={!loading}
      // Ecrãs estreitos: menos margem interior, para o conteúdo e os botões caberem a partir de 320px
      className="max-sm:[&_.ant-modal-container]:px-4! max-sm:[&_.ant-modal-container]:py-5!"
      footer={
        // Em ecrãs estreitos os botões ficam em coluna, a toda a largura, com o de confirmar em cima
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-center">
          {!hideCancel && (
            <Button
              disabled={loading}
              onClick={onCancel}
              className={`w-full sm:w-auto max-sm:h-10! ${cancelClassName}`}>
              {cancelText ?? t("Cancel")}
            </Button>
          )}
          <Button
            type="primary"
            danger={danger ?? tone === "danger"}
            loading={loading}
            onClick={onConfirm}
            className={`w-full sm:w-auto max-sm:h-10! ${okClassName}`}>
            {okText ?? t("Confirm")}
          </Button>
        </div>
      }>
      <div className="flex flex-col items-center px-0 pt-2 text-center sm:px-2 sm:pt-4">
        <span
          className="mb-3 flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[22px] sm:mb-4 sm:h-14 sm:w-14 sm:text-[26px]"
          style={{ background: style.bg, color: style.color }}>
          {icon ?? style.icon ?? <LuCircleAlert />}
        </span>
        <p className="mb-2! text-[16px] leading-snug font-bold sm:text-[18px]">
          {title}
        </p>
        {description && (
          <p className="mb-0! text-[13px] leading-relaxed text-[#5B5F6B] sm:text-[14px]">
            {description}
          </p>
        )}
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

  const holder = (
    <ConfirmModal
      {...(lastConfig.current ?? {})}
      open={open}
      loading={loading}
      onCancel={() => setOpen(false)}
      onConfirm={handleConfirm}
    />
  );
  return [confirm, holder];
}
