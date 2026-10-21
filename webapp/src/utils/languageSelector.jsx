import { Dropdown } from "antd";

export default function LanguageSelector({
  languages,
  selectedLanguage,
  onSelect,
  className = "",
  placement = "bottomRight",
  children, // botão personalizado (por omissão, a pastilha com a bandeira e o código)
  // Opcional (ex.: formulários de autenticação): o idioma escolhe-se também pelo teclado (Enter no item do menu, foco no menu ao abrir)
  keyboardSelect = false,
}) {
  const textSize = "text-[12px] sm:text-[13px] md:text-[14px] lg:text-[14px]";

  return (
    <Dropdown
      menu={{
        ...(keyboardSelect && {
          selectable: true,
          selectedKeys: selectedLanguage ? [selectedLanguage.code] : [],
          onClick: ({ key }) => onSelect(languages.find((l) => l.code === key)),
        }),
        items: languages.map((item) => ({
          key: item.code,
          label: (
            <div
              className={`dropdown-language-item flex items-center font-medium ${textSize} ${
                selectedLanguage?.id === item.id
                  ? "text-[#00B9D6]"
                  : "text-[#163986]"
              }`}
              onClick={keyboardSelect ? undefined : () => onSelect(item)}>
              <img src={item.flag} className="max-w-5 mr-2" alt={item.name} />
              <p>{item.name}</p>
            </div>
          ),
        })),
      }}
      trigger={["click"]}
      autoFocus={keyboardSelect}
      placement={placement}>
      {children || (
      <div
        className={`flex justify-center items-center cursor-pointer border border-[#163986] bg-[#E6F8FB] leading-1 p-2 rounded-full ${className}`}>
        <div
          className="w-5 h-5 rounded-full bg-cover bg-center mr-2"
          style={{ backgroundImage: `url(${selectedLanguage?.flag})` }}></div>
        <p className={`text-[#163986] font-medium ${textSize}`}>
          {selectedLanguage?.code?.toUpperCase()}
        </p>
      </div>
      )}
    </Dropdown>
  );
}
