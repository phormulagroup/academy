# Deploy — staging (https://academy.phormuladev.com)

Tudo num só domínio: React na raiz, API Node em `/api`, IECs em `/regional/wp-content/uploads/iec/<ficheiro>`
(o mesmo caminho da produção, para testar as regras do servidor web). O domínio está atrás da **Cloudflare**.

## Resumo (ordem a seguir)
1. Gerar os zips (secção 1).
2. Enviar a **webapp** para `public_html` (secção 2).
3. Enviar a **API**, configurar o `.env.staging` e criar/arrancar a app no cPanel (secção 3).
4. Copiar a pasta **media** e os **IECs** (secções 4 e 5).
5. Configurar a **Cache Rule da Cloudflare** (secção 6, só na primeira vez). Num deploy normal **não é preciso purge**.
6. Verificar (secção 7).

> Faça a webapp **antes** da app Node: o cPanel escreve o bloco do Passenger dentro do `.htaccess` da raiz e extrair o
> `.htaccess` da webapp por cima apaga-o (ver secção 8).

## 1. Gerar os zips
Na raiz do projeto:
```
# Webapp (usa webapp/.env.staging → VITE_API_URL=https://academy.phormuladev.com/api)
cd webapp && npm run build:staging && cd ..
mkdir -p deploy
(cd webapp/dist && zip -qr ../../deploy/webapp-staging.zip . -x ".DS_Store")

# API (sem node_modules, sem media, sem os .env de dev/produção)
(cd server && zip -qr ../deploy/server-staging.zip . -x "node_modules/*" -x "media/*" -x ".env.development" -x ".env.production" -x ".DS_Store" -x "*/.DS_Store" && zip -q ../deploy/server-staging.zip media/)
```
A pasta `deploy/` não vai para o git. O zip da API inclui o `.env.staging` (credenciais da BD): tratar como sensível.

## 2. Webapp (React)
- Extrair `webapp-staging.zip` **na raiz do domínio** (`public_html`): o **conteúdo**, não uma pasta. Confirmar que o `.htaccess`
  (ficheiro escondido) ficou lá.
- O `.htaccess` faz: HTTPS; fallback da SPA para `index.html`; deixa `/api` e a pasta dos IECs fora do fallback;
  cache longa só em `assets/` (ficheiros com hash); `no-cache` no `index.html` e nos IECs; bloqueia listagem de pastas e ficheiros `.`.
- Os erros 500/502/503/504 do servidor web mostram `maintenance.html` (estática, 4 línguas, volta a tentar a cada 20 s).

## 3. API (Node.js)
1. Enviar e extrair `server-staging.zip` numa pasta **fora** do `public_html` (ex.: `~/academy-api`).
2. Editar `.env.staging` no servidor:
   | Variável | Valor |
   |---|---|
   | `API_PREFIX` | `/api` |
   | `DB_*` | credenciais da BD de staging |
   | `IEC_DIR` | `/home/<utilizador-cpanel>/public_html/regional/wp-content/uploads/iec` |
   | `IEC_PUBLIC_URL` | `https://academy.phormuladev.com/regional/wp-content/uploads/iec` |
   | `MEDIA_FALLBACK_URL` | vazio (usa `https://academy.phormuladev.com/api/media/`) |
3. cPanel → *Setup Node.js App* → *Create*:
   - Application root: a pasta da API · Application URL: `academy.phormuladev.com/api` · Startup file: `index.js`
   - Variável de ambiente **`NODE_ENV=staging`** (sem ela carrega `.env.development`)
   - *Run NPM Install* (os avisos `npm warn deprecated … glob` são inofensivos) e *Restart*.
4. Se o Passenger **tirar** o `/api` antes de chegar ao Node, pôr `API_PREFIX=` (vazio) e reiniciar.

## 4. Pasta `media`
A webapp vai buscar as imagens/documentos a `https://academy.phormuladev.com/api/media/<ficheiro>`.
- Copiar `server/media/` (≈1,4 GB, ~4800 ficheiros) para **dentro da pasta da API** (`~/academy-api/media`).
  Mais rápido: copiar do servidor antigo (`academyapi…`) pelo gestor de ficheiros do cPanel.
- Sem os ficheiros, as capas dos cursos, thumbnails e documentos aparecem vazios (404).

## 5. IECs
- Criar `public_html/regional/wp-content/uploads/iec` e copiar para lá os ficheiros (em local: `server/media/iec`, ≈270 MB).
- Dentro do `public_html` o Apache serve-os diretamente, sem passar pelo Node.
- O caminho funciona **com ou sem `/regional/`** (`/wp-content/uploads/iec/…` e `/regional/wp-content/uploads/iec/…`). O `IEC_PUBLIC_URL` define qual dos dois vai no QR novo.
- O `.htaccess` tem duas regras de segurança para este caminho:
  - **Ficheiro que não existe na pasta pública** → redireciona (302) para o mesmo ficheiro servido pela API (`/api/iecs/<ficheiro>`).
    Ajuda enquanto os IECs ainda estão na pasta da API (`IEC_DIR` vazio), mas **não é o desejável**: o QR passa a depender de o Node estar de pé.
    O correto é ter `IEC_DIR` na pasta pública, para o Apache servir diretamente.
  - **A pasta sem nome de ficheiro** (`/regional/wp-content/uploads/iec/`) → redireciona (302) para a página inicial. A pasta nunca é listada.
- O backoffice lista automaticamente os PDF/MP4/PNG/JPG que estiverem na pasta (registados na tabela `iec`).
- **O URL e o nome de cada ficheiro nunca podem mudar**: é o que está nos QRCodes impressos. Substituir = mesmo nome.

## 6. Cloudflare (obrigatório)
A Cloudflare faz cache de PDF/MP4/imagens (por omissão 4 h, `cache-control: max-age=14400` imposto por ela) e pode guardar
404s. Sem esta regra, **depois de substituir um IEC o QRCode continua a mostrar o ficheiro antigo** durante horas.

**Cache Rule** (Caching → Cache Rules → Create rule):
- Se: *URI Path* **starts with** `/regional/wp-content/uploads/iec/` **ou** *URI Path* **starts with** `/api/`
- Então: *Eligible for cache* · **Edge TTL: Use cache-control header if present, bypass cache if not** · **Browser TTL: Respect origin TTL**

- **Status code TTL** (na mesma regra): `404` → **Do not cache** (e, se existir a opção, `5xx` também).
  Sem isto a Cloudflare guarda os 404 e diz aos browsers `cache-control: max-age=14400`: um ficheiro que ainda não tinha sido copiado
  fica "em branco" durante 4 h **mesmo depois de existir**, e só em janela anónima se vê bem.

Assim a Cloudflare segue o que o servidor diz (`no-cache` nos IECs; sem cache forçada nas respostas da API).

**Como saber se a regra está ativa:** pedir um ficheiro que não existe e ver os cabeçalhos.
```
curl -sI https://academy.phormuladev.com/api/media/nao-existe.png | grep -iE "^HTTP|cache-control|cf-cache-status"
```
Com a regra correta **não** pode aparecer `cache-control: max-age=14400` nem `cf-cache-status: HIT` num 404.

**Purge Cache: NÃO é preciso em cada deploy.** O `index.html` não é guardado pela Cloudflare (`DYNAMIC`, `no-cache`) e os ficheiros
em `assets/` têm o hash no nome (cada build gera nomes novos), por isso um deploy normal aparece logo. Basta recarregar.
Só faz sentido fazer *Purge* (Caching → Configuration → Purge Cache) nestes casos pontuais:
- Pediram-se ficheiros que ainda não existiam (ex.: `media` por copiar) e a Cloudflare guardou o 404 — sem a regra da secção 6.
  Purgar só esses URLs (*Custom Purge*), não tudo.
- Substituiu-se um ficheiro **sem hash** com o mesmo nome (ex.: `FAVICON.png`, imagens em `public/`).
- Os IECs e `/api/media` ficam cobertos pela Cache Rule: com ela, também não precisam de purge.

Se o browser mostrar algo antigo depois de um problema destes: limpar a cache do browser para o site (ver secção 8).

## 7. Verificar
- `https://academy.phormuladev.com/` abre a app; recarregar numa rota interna (ex. `/pt/login`) não dá 404.
- `https://academy.phormuladev.com/api/` mostra a página "Bial Regional Academy"; `…/api/faqs/read` devolve JSON.
- `https://academy.phormuladev.com/api/health` devolve `{"status":"ok"}` (200). Dá 503 se a base de dados não responder.
- **API em baixo:** parar a app Node no cPanel e abrir o site → tem de aparecer o ecrã "Estamos com problemas no servidor" (não uma página
  em branco), a tentar de novo a cada 10 s; ao arrancar a app outra vez a página recarrega sozinha. (A webapp e a API têm de ir **ambas** atualizadas:
  a verificação usa `/health`.)
- `https://academy.phormuladev.com/api/media/thumb-vicombil-pt.png` abre a imagem; as capas dos cursos aparecem.
- `https://academy.phormuladev.com/regional/wp-content/uploads/iec/<ficheiro>.pdf` abre o PDF.
- `https://academy.phormuladev.com/maintenance.html` mostra a página de manutenção.
- Backoffice → IECs: lista, upload, **substituição** (modal) e QR com o URL acima.
- **Teste da cache:** substituir um IEC por outro PDF e abrir o URL do QR numa janela anónima logo a seguir — tem de mostrar o
  ficheiro **novo**. Se mostrar o antigo, rever a Cache Rule (secção 6) e ver os cabeçalhos `cf-cache-status` e `cache-control`.
- Sessão: apagar/estragar o `token` do `localStorage` e recarregar → aviso "sessão expirada" e vai para a homepage.

## 8. Problemas conhecidos
| Sintoma | Causa provável | O que fazer |
|---|---|---|
| `/api/` mostra o loading do React | `.htaccess` antigo ativo, ou o bloco `PASSENGER CONFIGURATION` foi apagado ao extrair a webapp | Confirmar o `.htaccess` em `public_html`; guardar de novo a app no *Setup Node.js App* (recria o bloco); a webapp vai antes da app Node |
| `Cannot GET /api/…` | O Passenger já chega ao Node mas o prefixo está errado | Pôr `API_PREFIX=` vazio e reiniciar |
| Imagens/capas em branco (404) | Pasta `media` vazia, ou 404 antigo em cache | Copiar `media` (secção 4), **Purge Cache** na Cloudflare, janela anónima |
| Imagens em branco no browser normal mas OK em janela anónima (mesmo depois do Purge) | O **browser** guardou o 404 (a Cloudflare enviou `max-age=14400` no 404) | Limpar a cache do browser **para o site** (Chrome: DevTools aberto → botão direito em recarregar → *Empty Cache and Hard Reload*, ou *Clear site data*; Safari: Develop → *Empty Caches*) e, para não voltar a acontecer, criar a Cache Rule da secção 6 com *404 → Do not cache* |
| IEC substituído mas o QR mostra o antigo | Cache da Cloudflare/browser | Cache Rule da secção 6 + Purge |
| `/api/media/…` dá 404 com os ficheiros lá | Caminho relativo ao diretório de arranque (já corrigido no código) | Usar o `server-staging.zip` atual |
| Página em branco com a API em baixo | A webapp em produção ainda é um build antigo (sem a verificação `/health`) | Subir o `webapp-staging.zip` mais recente e recarregar |
| Ecrã "estamos com problemas no servidor" | A API não responde (ou `/health` dá 503: a base de dados não responde) | Ver se a app Node está *Started*, `NODE_ENV=staging` e o `.env.staging` |
| App arranca com a config errada | `NODE_ENV` não definido → carrega `.env.development` | Definir `NODE_ENV=staging` no cPanel |

## Notas
- Notificações e mensagens usam **polling** (`VITE_POLL_INTERVAL`, 30 s em staging); já não há WebSocket nem é preciso passá-lo no proxy.
- `academyapi.phormuladev.com` pode ficar ativo até o staging novo estar validado.
- O `.env.production` tem as credenciais da BD **vazias**: preencher antes do deploy de produção (não reutilizar as de staging).

## Produção (https://academy.bial.com)
Os mesmos passos, com estas diferenças:
- Webapp: `npm run build` (usa `webapp/.env.production`, `VITE_API_URL=https://academy.bial.com/api`).
- API: `NODE_ENV=production`, `.env.production` preenchido, Application URL `academy.bial.com/api`.
- IECs: `IEC_PUBLIC_URL=https://academy.bial.com/regional/wp-content/uploads/iec` (é o URL dos QRCodes já impressos).
  Quando o WordPress em `/regional` sair, **mover os ficheiros para uma pasta neutra** e manter este URL a servi-los
  (symlink ou rewrite), com a regra a ficar antes do fallback do React. Os QRCodes impressos não podem deixar de funcionar.
- A Cache Rule da Cloudflare (secção 6) também tem de existir no domínio de produção.
