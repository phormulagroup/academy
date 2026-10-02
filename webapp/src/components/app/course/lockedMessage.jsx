import { RxLockClosed } from "react-icons/rx";

/**
 * @component LockedMessage
 * @description Aviso de conteúdo bloqueado no eLearning (tópico/teste/módulo): fundo laranja Bial, cadeado
 * e textos responsivos.
 */
function LockedMessage({ title, description, icon }) {
  const Icon = icon || RxLockClosed;
  return (
    <div className="flex items-center gap-3 sm:gap-4 bg-[#FF7D5A] text-white rounded-[5px] mt-4 p-3 sm:p-4 lg:p-5">
      <Icon className="shrink-0 w-7 h-7 sm:w-9 sm:h-9 lg:w-10 lg:h-10" />
      <div className="min-w-0">
        <p className="font-ryker font-bold leading-tight text-[15px] sm:text-[18px] lg:text-[20px]">
          {title}
        </p>
        {description && (
          <p className="text-[12px] sm:text-[14px] lg:text-[15px] mt-0.5 sm:mt-1">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

export default LockedMessage;
