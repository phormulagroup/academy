require("./helpers/env");
const test = require("node:test");
const assert = require("node:assert/strict");
const { safeFileName, validateUpload, UploadError } = require("../utils/fileTypes");

const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)]);
const pdf = Buffer.from("%PDF-1.7\n....");
const zip = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(32)]);
const file = (name, data, extra = {}) => ({ name, data, size: data.length, ...extra });

test("safeFileName: sem pastas, sem ../, sem símbolos estranhos, extensão em minúsculas", () => {
  assert.equal(safeFileName("../../etc/passwd.PNG"), "passwd.png");
  assert.equal(safeFileName("C:\\Users\\x\\foto final.JPG"), "foto final.jpg");
  assert.equal(safeFileName("a'; DROP TABLE media;--.png"), "a_ DROP TABLE media_--.png");
  assert.equal(safeFileName(".htaccess"), "htaccess");
  assert.equal(safeFileName("relatório Diacol – PT.pdf"), "relatório Diacol _ PT.pdf");
  assert.equal(safeFileName(""), "file");
  assert.ok(safeFileName("x".repeat(500) + ".png").length <= 125);
});

test("validateUpload aceita ficheiros certos para cada destino", () => {
  assert.deepEqual(validateUpload(file("a.png", png), "multimedia"), { name: "a.png", ext: "png" });
  assert.deepEqual(validateUpload(file("a.JPG", jpg), "avatar"), { name: "a.jpg", ext: "jpg" });
  assert.equal(validateUpload(file("relatorio.pdf", pdf), "multimedia").ext, "pdf");
  assert.equal(validateUpload(file("slides.pptx", zip), "multimedia").ext, "pptx");
  assert.equal(validateUpload(file("anexo.pdf", pdf), "ticket").ext, "pdf");
});

test("recusa extensões perigosas ou fora do destino (svg, html, js, php, exe)", () => {
  for (const name of ["x.svg", "x.html", "x.js", "x.php", "x.exe", "x.sh", "semextensao"]) {
    assert.throws(() => validateUpload(file(name, png), "multimedia"), UploadError, name);
  }
  // Um avatar não pode ser PDF nem Office; um e-mail não pode ser PDF
  assert.throws(() => validateUpload(file("a.pdf", pdf), "avatar"), UploadError);
  assert.throws(() => validateUpload(file("a.pdf", pdf), "email"), UploadError);
});

test("recusa conteúdo que não corresponde à extensão (um HTML ou script com extensão .png)", () => {
  assert.throws(() => validateUpload(file("a.png", Buffer.from("<html><script>alert(1)</script></html>")), "multimedia"), /does not match/);
  assert.throws(() => validateUpload(file("a.pdf", png), "multimedia"), /does not match/);
  assert.throws(() => validateUpload(file("a.png", Buffer.alloc(0)), "multimedia"), UploadError);
});

test("recusa ficheiros acima do limite do destino (413) e truncados", () => {
  const big = Buffer.concat([png, Buffer.alloc(6 * 1024 * 1024)]);
  assert.throws(() => validateUpload(file("a.png", big), "avatar"), (err) => err.status === 413);
  assert.doesNotThrow(() => validateUpload(file("a.png", big), "multimedia"));
  assert.throws(() => validateUpload(file("a.png", png, { truncated: true }), "multimedia"), (err) => err.status === 413);
});

test("os erros de upload têm estado 400/413 e podem mostrar-se ao cliente", () => {
  try {
    validateUpload(file("x.exe", png), "multimedia");
    assert.fail("devia recusar");
  } catch (err) {
    assert.equal(err.status, 400);
    assert.equal(err.expose, true);
  }
});
