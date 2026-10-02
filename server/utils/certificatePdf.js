const PDFDocument = require("pdfkit");
const path = require("path");

const PAGE_WIDTH = 842; // A4 horizontal, em pt
const PAGE_HEIGHT = 595;

// Ryker Text: a fonte da Bial (a mesma do site)
const FONT_REGULAR = path.join(__dirname, "../fonts/rykertext-regular.otf");
const FONT_BOLD = path.join(__dirname, "../fonts/rykertext-bold.otf");
const REGULAR = "Ryker";
const BOLD = "Ryker-Bold";

const NAMED_ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  "#39": "'",
  apos: "'",
  nbsp: " ",
};

function decodeEntities(str) {
  return str.replace(/&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z0-9]+);/g, (match, code) => {
    if (code[0] === "#") {
      const codePoint = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isNaN(codePoint) ? match : String.fromCodePoint(codePoint);
    }
    return NAMED_ENTITIES[code] ?? match;
  });
}

function renderVariables(template, data) {
  return template.replace(/{{\s*([^}]+?)\s*}}/g, (_, key) => data[key] ?? "");
}

// O nome do aluno vem do perfil (editável pelo próprio): sem escapar, "<strong>X</strong>" como nome seria
// interpretado como negrito real. Escapado aqui, o parser vê entidades inertes que decodeEntities devolve como texto.
function escapeForTemplate(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Tamanho de cada tipo de bloco, relativo ao tamanho base do texto (títulos <h1>–<h3> do editor; h4–h6 contam como h3)
const HEADING_SCALE = { 0: 1, 1: 1.7, 2: 1.35, 3: 1.15 };

// O texto vem de um editor rich-text: parágrafos (<p>), títulos (<h1>–<h3>) e <strong>/<b>. Isto NÃO é um parser HTML
// genérico: só entende o suficiente para desenhar blocos no PDF; qualquer outra tag é removida. Cada bloco é
// { level, runs } (level 0 = parágrafo) ou { spacer: true } para uma linha em branco entre blocos.
function htmlToBlocks(html) {
  const blocks = html.split(/<br\s*\/?>|<\/p>|<\/h[1-6]>/gi).map((raw) => {
    const heading = raw.match(/<h([1-6])[^>]*>/i);
    const level = heading ? Math.min(3, Number(heading[1])) : 0;
    const cleaned = raw.replace(/<(?:p|h[1-6])[^>]*>/gi, "").trim();
    if (!decodeEntities(cleaned.replace(/<[^>]+>/g, "")).trim()) return { spacer: true };

    const runs = [];
    const tagRegex = /<(\/?)(strong|b)[^>]*>/gi;
    let lastIndex = 0;
    let bold = level > 0; // os títulos são sempre a negrito
    let match;

    const pushRun = (rawText) => {
      let text = decodeEntities(rawText.replace(/<[^>]+>/g, ""));
      // Um espaço a abrir um run que não é o primeiro ficaria "solto" e uma linha podia nascer com ele à frente
      // (parecia um avanço à esquerda): cola-se ao fim do run anterior.
      const leadingSpace = text.match(/^\s+/)?.[0];
      if (leadingSpace && runs.length > 0) {
        runs[runs.length - 1].text += leadingSpace;
        text = text.slice(leadingSpace.length);
      }
      if (text) runs.push({ text, bold });
    };

    while ((match = tagRegex.exec(cleaned))) {
      pushRun(cleaned.slice(lastIndex, match.index));
      bold = match[1] !== "/" || level > 0;
      lastIndex = tagRegex.lastIndex;
    }
    pushRun(cleaned.slice(lastIndex));

    return { level, runs };
  });

  // Linhas em branco só contam entre blocos de texto (as do início e do fim do editor são ruído)
  while (blocks.length && blocks[0].spacer) blocks.shift();
  while (blocks.length && blocks[blocks.length - 1].spacer) blocks.pop();
  return blocks;
}

// Layout de um bloco feito aqui (e não pelo "continued" do pdfkit): um bloco mistura texto normal e negrito, e o
// pdfkit alinha cada pedaço "continued" à parte. Parte-se o texto em palavras, mede-se cada uma na fonte certa,
// quebra-se em linhas que cabem na largura, e cada linha é desenhada já com o desvio do alinhamento.
function layoutParagraph(doc, runs, width, lineGap, fontSize) {
  const tokens = [];
  runs.forEach((run) => {
    doc.font(run.bold ? BOLD : REGULAR).fontSize(fontSize);
    run.text.split(/(\s+)/).forEach((piece) => {
      if (piece === "") return;
      tokens.push({ text: piece, bold: run.bold, isSpace: /^\s+$/.test(piece), width: doc.widthOfString(piece) });
    });
  });

  const lines = [];
  let line = { tokens: [], width: 0 };
  const pushLine = () => {
    // espaços no fim da linha não contam para a largura (nem para o alinhamento)
    while (line.tokens.length && line.tokens[line.tokens.length - 1].isSpace) {
      line.width -= line.tokens.pop().width;
    }
    lines.push(line);
    line = { tokens: [], width: 0 };
  };
  tokens.forEach((token) => {
    if (token.isSpace) {
      if (line.tokens.length > 0) {
        line.tokens.push(token);
        line.width += token.width;
      }
      return;
    }
    if (line.tokens.length > 0 && line.width + token.width > width) pushLine();
    line.tokens.push(token);
    line.width += token.width;
  });
  if (line.tokens.length > 0) pushLine();

  doc.font(REGULAR).fontSize(fontSize);
  const lineHeight = doc.currentLineHeight(true) + lineGap;
  return { lines, lineHeight, height: lines.length * lineHeight };
}

// Calcula o layout de todos os blocos para um tamanho base: cada bloco tem o seu tamanho (títulos maiores) e
// um espaço a seguir aos títulos
function layoutBlocks(doc, blocks, width, lineGap, baseSize) {
  let height = 0;
  const laid = blocks.map((block) => {
    const size = baseSize * HEADING_SCALE[block.level || 0];
    if (block.spacer) {
      doc.font(REGULAR).fontSize(baseSize);
      const spacerHeight = doc.currentLineHeight(true) + lineGap;
      height += spacerHeight;
      return { ...block, lines: [], lineHeight: 0, height: spacerHeight, size: baseSize };
    }
    const layout = layoutParagraph(doc, block.runs, width, lineGap, size);
    const gap = block.level > 0 ? size * 0.35 : 0;
    height += layout.height + gap;
    return { ...block, ...layout, size, gap };
  });
  return { laid, height };
}

function drawBlock(doc, block, x, y, width, align) {
  doc.fontSize(block.size).fillColor("#fff");
  block.lines.forEach((line, index) => {
    let cursorX = align === "center" ? x + (width - line.width) / 2 : align === "right" ? x + width - line.width : x;
    const lineY = y + index * block.lineHeight;
    line.tokens.forEach((token) => {
      if (!token.isSpace) {
        doc.font(token.bold ? BOLD : REGULAR).text(token.text, cursorX, lineY, { lineBreak: false });
      }
      cursorX += token.width;
    });
  });
}

// Alinhamento do texto (course_certificate.text_align): além de alinhar as linhas, define de que lado da página o
// bloco fica (esquerda → junto à margem esquerda, centro → ao meio, direita → junto à margem direita). Qualquer
// outro valor (ou a coluna ainda não existir na BD) cai em "left".
const ALIGNMENTS = ["left", "center", "right"];
function normalizeAlign(value) {
  return ALIGNMENTS.includes(value) ? value : "left";
}

// Posição do bloco (course_certificate.text_x / text_y): percentagem da página (0–100) onde fica o CENTRO do bloco,
// x da esquerda para a direita e y de cima para baixo. null/vazio = automático (ancorado pelo alinhamento e
// centrado na vertical).
function normalizePosition(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(100, Math.max(0, number)) : null;
}

// Variáveis do texto: {{name}}, {{course}} e {{date}} (e os nomes {{course_name}} e {{completed_date}} do eLearning)
function generateCertificatePdf({ backgroundBuffer, text, name, course, date, align: rawAlign, x: rawX, y: rawY }) {
  const align = normalizeAlign(rawAlign);
  const posX = normalizePosition(rawX);
  const posY = normalizePosition(rawY);
  const doc = new PDFDocument({ size: [PAGE_WIDTH, PAGE_HEIGHT], margin: 0 });
  doc.registerFont(REGULAR, FONT_REGULAR);
  doc.registerFont(BOLD, FONT_BOLD);

  // A imagem de fundo ocupa a página inteira (estica), como já acontecia nos certificados desta aplicação: um corte
  // "cover" cortaria o logótipo do fundo atual da Bial (16:9) na página A4. O ideal é um fundo já com o rácio A4.
  doc.image(backgroundBuffer, 0, 0, { width: PAGE_WIDTH, height: PAGE_HEIGHT });

  const SIDE_MARGIN = 60;
  const textWidth = PAGE_WIDTH * 0.5;
  // Sem posição escolhida, o bloco ancora-se pelo alinhamento; com posição, o centro do bloco vai para x% da
  // largura (sem sair da página).
  const EDGE_MARGIN = 20;
  const textX =
    posX !== null
      ? Math.min(PAGE_WIDTH - EDGE_MARGIN - textWidth, Math.max(EDGE_MARGIN, (posX / 100) * PAGE_WIDTH - textWidth / 2))
      : align === "center"
        ? (PAGE_WIDTH - textWidth) / 2
        : align === "right"
          ? PAGE_WIDTH - SIDE_MARGIN - textWidth
          : SIDE_MARGIN;
  const lineGap = 6;

  const blocks = htmlToBlocks(
    renderVariables(text || "", {
      name: escapeForTemplate(name),
      course: escapeForTemplate(course),
      course_name: escapeForTemplate(course),
      date: escapeForTemplate(date),
      completed_date: escapeForTemplate(date),
    }),
  );

  // Nome/curso muito longos podiam ultrapassar a altura da página: como a página tem tamanho fixo (imagem de fundo)
  // e o desenho usa coordenadas explícitas, o texto a mais desapareceria sem aviso. Encolhe o tamanho de letra até
  // caber, com um mínimo legível.
  const DEFAULT_FONT_SIZE = 16;
  const MIN_FONT_SIZE = 11;
  const VERTICAL_MARGIN = 50;
  const availableHeight = PAGE_HEIGHT - 2 * VERTICAL_MARGIN;
  let fontSize = DEFAULT_FONT_SIZE;
  let layout = layoutBlocks(doc, blocks, textWidth, lineGap, fontSize);
  while (fontSize > MIN_FONT_SIZE && layout.height > availableHeight) {
    fontSize -= 1;
    layout = layoutBlocks(doc, blocks, textWidth, lineGap, fontSize);
  }

  // O bloco todo fica centrado na vertical da página (ou no y escolhido)
  let cursorY =
    posY !== null
      ? Math.min(PAGE_HEIGHT - EDGE_MARGIN - layout.height, Math.max(EDGE_MARGIN, (posY / 100) * PAGE_HEIGHT - layout.height / 2))
      : Math.max(VERTICAL_MARGIN, (PAGE_HEIGHT - layout.height) / 2);

  layout.laid.forEach((block) => {
    if (!block.spacer) drawBlock(doc, block, textX, cursorY, textWidth, align);
    cursorY += block.height + (block.gap || 0);
  });

  return doc;
}

module.exports = { generateCertificatePdf, normalizeAlign, normalizePosition };
