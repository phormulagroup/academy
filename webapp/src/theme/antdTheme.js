// Tamanhos dos componentes do antd no backoffice (mesmo critério do eLearning): todos os campos e botões têm a mesma
// altura, qualquer que seja o "size". Consumido pelo <ConfigProvider theme={...}> do layout do admin.
// Os tokens vão dentro de `components.<Componente>`, por isso só afetam esse componente.
export const CONTROL_HEIGHT = 40;

const sameHeight = { controlHeight: CONTROL_HEIGHT, controlHeightLG: CONTROL_HEIGHT, controlHeightSM: CONTROL_HEIGHT };

export const adminTheme = {
  components: {
    Button: sameHeight,
    Input: sameHeight,
    Select: sameHeight,
    InputNumber: sameHeight,
    Segmented: sameHeight,
    DatePicker: {
      ...sameHeight,
      // Só a caixa fechada acompanha os 40px: as dimensões do painel do calendário ficam nos valores normais
      cellWidth: 36,
      cellHeight: 24,
      timeColumnWidth: 56,
      timeCellHeight: 28,
      textHeight: CONTROL_HEIGHT,
      withoutTimeCellHeight: 66,
    },
  },
};
