const fs = require("fs");
const { once } = require("events");

// ZIP sem dependências, escrito em streaming para a resposta: método "stored" (sem compressão; PDF e MP4 já vêm comprimidos),
// nomes em UTF-8 (bit 11), sem ZIP64 — até 65 535 ficheiros e 4 GB no total (suficiente para os IECs)
const MAX_ENTRIES = 0xffff;
const MAX_SIZE = 0xffffffff;

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

async function crc32File(file) {
  let crc = 0xffffffff;
  for await (const chunk of fs.createReadStream(file)) {
    for (let i = 0; i < chunk.length; i++) crc = CRC_TABLE[(crc ^ chunk[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Data/hora no formato MS-DOS que o ZIP usa
function dosDateTime(date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

// entries: [{ name, path }]. Valida os limites antes de escrever: devolve uma mensagem de erro ou null
function zipLimitsError(entries) {
  if (entries.length > MAX_ENTRIES) return `Too many files for one ZIP (max ${MAX_ENTRIES})`;
  const total = entries.reduce((sum, e) => sum + fs.statSync(e.path).size + 30 + 46 + Buffer.byteLength(e.name) * 2, 22);
  if (total > MAX_SIZE) return "The selected files exceed 4 GB, select fewer files";
  return null;
}

async function writeZip(res, entries) {
  const write = async (buf) => {
    if (!res.write(buf)) await once(res, "drain");
  };
  const central = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const { size, mtime } = fs.statSync(entry.path);
    const crc = await crc32File(entry.path);
    const { time, day } = dosDateTime(mtime);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // assinatura do cabeçalho local
    local.writeUInt16LE(20, 4); // versão necessária (2.0)
    local.writeUInt16LE(0x0800, 6); // bit 11: nome em UTF-8
    local.writeUInt16LE(0, 8); // método 0 = stored
    local.writeUInt16LE(time, 10);
    local.writeUInt16LE(day, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(size, 18); // tamanho comprimido
    local.writeUInt32LE(size, 22); // tamanho original
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    await write(local);
    await write(name);
    for await (const chunk of fs.createReadStream(entry.path)) await write(chunk);

    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0); // assinatura do diretório central
    cd.writeUInt16LE(20, 4); // versão que criou
    cd.writeUInt16LE(20, 6); // versão necessária
    cd.writeUInt16LE(0x0800, 8);
    cd.writeUInt16LE(0, 10);
    cd.writeUInt16LE(time, 12);
    cd.writeUInt16LE(day, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(size, 20);
    cd.writeUInt32LE(size, 24);
    cd.writeUInt16LE(name.length, 28);
    cd.writeUInt32LE(offset, 42); // posição do cabeçalho local
    central.push(cd, name);
    offset += local.length + name.length + size;
  }
  const centralBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); // fim do diretório central
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(offset, 16);
  await write(centralBuf);
  await write(end);
  res.end();
}

module.exports = { writeZip, zipLimitsError };
