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
1. Enviar e extrair `server-staging.zip` numa pasta **fora** do `public_html` (ex.: `~/academy-api`). Os certificados são gerados aqui (`pdfkit`, com a pasta `fonts/` do zip).
2. Editar `.env.staging` no servidor:
   | Variável | Valor |
   |---|---|
   | `API_PREFIX` | `/api` |
   | `DB_*` | credenciais da BD de staging |
   | `IEC_DIR` | `/home/<utilizador-cpanel>/public_html/regional/wp-content/uploads/iec` |
   | `IEC_PUBLIC_URL` | `https://academy.phormuladev.com/regional/wp-content/uploads/iec` |
   | `MEDIA_FALLBACK_URL` | vazio (usa `https://academy.phormuladev.com/api/media/`) |
   | `DB_POOL_SIZE` | opcional: ligações simultâneas à base de dados (por omissão 10); baixar se o alojamento limitar |
   | `SLOW_REQUEST_MS` | opcional: pedidos mais lentos do que isto (por omissão 1500 ms) ficam como aviso "Pedido lento" em *Monitorização → Erros do servidor*, com o tempo total e o tempo na base de dados |
   | `API_PUBLIC_URL` | `https://academy.phormuladev.com/api` (endereço público da API: links de rastreio das comunicações) |
   | `JWT_SECRET` | **Obrigatório.** Segredo que assina as sessões e os links de rastreio (a API não arranca sem ele). Em staging/produção usar um valor longo e aleatório e nunca o pôr no código. Mudá-lo termina todas as sessões |
   | _(já preenchidas no `.env.staging` do zip)_ | `TRUST_PROXY=1`, `CORS_ORIGINS=https://academy.phormuladev.com`, `DB_POOL_SIZE=10` e `SLOW_REQUEST_MS=1500` |
   | `CORS_ORIGINS` | opcional: endereços da webapp autorizados a chamar a API, separados por vírgulas (por omissão `APP_PUBLIC_URL`) |
   | `TRUST_PROXY` | opcional: nº de proxies à frente da API (Cloudflare = 1; Cloudflare + Apache = 2), para o limite de pedidos usar o IP real |
   | `COMMUNICATION_BATCH_SIZE` / `COMMUNICATION_TICK_SECONDS` | opcionais: e-mails por lote e segundos entre lotes (por omissão 10 e 5). Ajustar ao limite de envio do cPanel (ver «Comunicações no cPanel») |
3. **Base de dados** (uma vez por ambiente, antes de arrancar): correr, por esta ordem, os ficheiros de `server/database/migrations/`
   (todos são aditivos e podem repetir-se sem estragar nada):
   - `2026-10-02-certificate-text-layout.sql`: acrescenta `text_align`, `text_x` e `text_y` a `course_certificate`. Sem isto o
     backoffice mostra o alinhamento e a posição do certificado desativados e não os guarda.
   - `2026-10-02-course-access.sql`: cria `user_group`, `user_group_member`, `course_user_access` e `course_group` (acesso a cursos
     por utilizadores e grupos).
   - `2026-10-02-permissions.sql`: cria `permission` (permissões por função e secção do backoffice). Sem esta tabela só o Admin
     entra no backoffice; as outras funções ficam sem acesso até o Admin lhes dar permissões em *Gestão → Permissões*.
   - `2026-10-03-tickets.sql` e `2026-10-03-tickets-import.sql`: criam `ticket` e `ticket_message` (substituem a caixa de entrada) e copiam as
     conversas antigas de `thread`/`thread_message` (que ficam intactas). O segundo só copia se `ticket` estiver vazia.
   - `2026-10-03-faqs-position.sql`: acrescenta `position` a `faqs` (ordem das FAQs por drag and drop) e preenche-a com a ordem atual.
   - `2026-10-03-monitoring.sql`: cria `server_log`, `email_log`, `server_heartbeat` e `downtime` (monitorização: erros do servidor, registo de e-mails e
     tempo em baixo) e acrescenta a função "Gestor". O Gestor não tem acesso por omissão: dar a permissão "Monitorização do sistema" em Permissões.
   - `2026-10-04-communications.sql`: cria `communication` e `communication_recipient` (Comunicações: e-mails enviados a um público escolhido). O envio é feito em
     lotes pelo próprio servidor (por omissão 10 e-mails de 5 em 5 segundos; ajustável com `COMMUNICATION_BATCH_SIZE` e `COMMUNICATION_TICK_SECONDS`), com o SMTP
     das definições, por isso respeita os limites do servidor de e-mail. Dar a permissão "Comunicações" em Permissões a quem a deva ver.
   - `2026-10-05-communication-tracking.sql`: acrescenta as colunas de rastreio a `communication` e `communication_recipient` e cria `communication_click`
     (estatísticas de cliques das comunicações; as aberturas não se medem). Correr **uma única vez** (um `ADD COLUMN` não se repete). Sem esta migração as comunicações
     continuam a enviar-se normalmente, só sem cliques. Os links de rastreio apontam para `API_PUBLIC_URL` (o endereço público da API
     com o prefixo, ex.: `https://academy.phormuladev.com/api`); sem esta variável usa o endereço por onde chegou o pedido de envio. O endereço `/t/c/` é
     público (sem login), por isso tem de estar acessível a partir da internet.
   - `2026-10-06-email-library.sql`: cria `email_library` (blocos e modelos de e-mail guardados, partilhados pela equipa no editor das Comunicações e dos Templates).
     Sem esta tabela o editor funciona na mesma, só que a biblioteca da equipa fica vazia e não deixa guardar.
   - `2026-10-09-notification-schedule.sql`: acrescenta `scheduled_at` e `sent_at` à tabela `notification` (agendar notificações) e marca como enviadas as que já tinham destinatários.
     Sem ela as notificações funcionam como antes, só não é possível agendar. O envio das agendadas corre no mesmo serviço em segundo plano das comunicações.
   - `2026-10-10-security-blocks.sql`: cria `security_block` (bloqueios por tentativas excessivas de login e de recuperação de password, visíveis e desbloqueáveis em *Monitorização → Bloqueios*).
     Sem ela os limites funcionam em memória, mas não se veem nem se desbloqueiam.
   - `2026-10-11-indexes.sql`: cria 18 índices nas tabelas principais (`logs`, `course_user_activity`, `user`, `course`, módulos, tópicos, testes, notificações, submissões).
     Antes só tinham a chave primária e cada listagem lia a tabela inteira. Repetível (só cria o que não existe) e não altera dados; demora segundos com poucos dados.
   - `2026-10-12-team-email-templates.sql`: cria os e-mails para a equipa (novo registo, novo pedido, resposta a um pedido) e converte os templates de recuperação de password
     que ainda estavam no editor antigo (Unlayer) para o editor novo. Só toca nos que ainda estão no editor antigo; repetível. Sem as linhas na BD os e-mails saem na mesma (modelos de origem).
   - `2026-10-13-template-names.sql`: tira o "(equipa)" do fim do nome dos e-mails para a equipa (a coluna "Enviado para" já o diz).
   - `2026-10-13-audit-log.sql`: cria `audit_log` (registo de atividade: quem criou, editou ou apagou o quê, com o antes e o depois, sem passwords). Aparece em *Monitorização → Atividade*
     e guarda-se um ano. Sem a tabela a API funciona na mesma, só não regista.
   - `2026-10-14-permissions-audit-security.sql`: duas secções novas nas permissões, "Registo de atividade" (ver) e "Acessos bloqueados" (ver e desbloquear), que saem de "Monitorização".
     Cada função fica com nelas o que já tinha em Monitorização, por isso ninguém perde acesso. Repetível.
   As fontes da marca para os e-mails (Ryker) estão em `server/public/fonts/` e a API serve-as em `/fonts/` (por isso essa pasta tem de ir no `server-staging.zip`).
   Os e-mails apontam para este endereço: se a URL da API mudar, os e-mails já enviados deixam de carregar a Ryker (mostram a alternativa).
   Os anexos dos tickets ficam em `media-private/ticket/` (dentro da pasta da API, nunca pública; muda-se com `TICKET_ATTACHMENTS_DIR`).
   Esta pasta tem de sobreviver aos deploys: não a apagar ao extrair um novo `server-staging.zip`.
   Depois, importar as traduções novas (`docs/translations/admin-redesign-translations.xlsx`) para a tabela `language`.
4. cPanel → *Setup Node.js App* → *Create*:
   - Application root: a pasta da API · Application URL: `academy.phormuladev.com/api` · Startup file: `index.js`
   - Variável de ambiente **`NODE_ENV=staging`** (sem ela carrega `.env.development`)
   - *Run NPM Install* (os avisos `npm warn deprecated … glob` são inofensivos) e *Restart*.
5. Se o Passenger **tirar** o `/api` antes de chegar ao Node, pôr `API_PREFIX=` (vazio) e reiniciar.

## E-mails automáticos da plataforma
A plataforma envia sozinha estes e-mails (templates em *E-mail → Templates*, um por língua: pt, es, en, fr): registo recebido, conta aprovada, conta não aprovada,
acesso à conta (contas criadas ou importadas por um administrador, com o código para definir a password), recuperação de password, password alterada, pedido
(ticket) recebido, resposta ao pedido, mensagem de contacto recebida e nova (para a equipa), resposta ao formulário de contacto e curso concluído.
- `2026-10-08-form-submission-reply.sql`: cria `form_submission_reply` (respostas às submissões do formulário de contacto, enviadas pela plataforma: quem, quando, o texto
  e se o e-mail saiu, com a razão se falhou). Sem a tabela as Submissões funcionam como antes, com o botão que abre o programa de e-mail.
- `2026-10-07-email-templates.sql`: cria estes templates na BD (só os que faltam, pode repetir-se). Sem a migração os e-mails saem na mesma, com os modelos de origem
  que o servidor traz (`server/utils/defaultEmailTemplates.json`); com a migração passam a poder editar-se no backoffice (e desativar: um template desativado não envia).
  Gerados por `webapp/scripts/generate-email-templates.mjs` (`node scripts/generate-email-templates.mjs` na pasta `webapp`).
- `APP_PUBLIC_URL` (no `.env.<ambiente>`): endereço da aplicação para os botões dos e-mails (ex.: `https://academy.phormuladev.com`). Sem isto usa `API_PUBLIC_URL` sem o `/api`.
- Se o envio falhar (SMTP por configurar, servidor em baixo) o pedido da pessoa segue normalmente (o registo, o ticket, o formulário...) e a razão fica em *Monitorização → E-mails*.
- A confirmação do formulário de contacto não se repete para o mesmo e-mail em 10 minutos. A equipa que recebe o aviso são os Admin e as funções com permissão de ver as Submissões.

## Comunicações no cPanel
As comunicações enviam-se **dentro da própria aplicação Node** (um temporizador que envia em lotes), por SMTP, com o HTML que ficou guardado no editor e o SMTP das
definições. Não há serviço externo. No cPanel (Passenger) há quatro pontos a ter em conta:
1. **A aplicação tem de estar acordada.** O Passenger pode parar uma app sem pedidos durante algum tempo, e parada não envia nada (um envio agendado só sai quando a app
   voltar a arrancar, e as comunicações pendentes continuam de onde ficaram). Solução: em *cPanel → Cron Jobs* um pedido por minuto ao `/health`:
   `* * * * * curl -fsS https://academy.phormuladev.com/api/health > /dev/null`. Isto também mantém a Monitorização (tempo em baixo) certa.
2. **Limite de envio do cPanel.** O Exim limita os e-mails por hora (muitas vezes 100 a 500 por domínio, ver *cPanel → Email Deliverability* ou perguntar ao alojamento). O ritmo
   por omissão (120 por minuto) passa esse limite e as mensagens seguintes falham. Calcular `COMMUNICATION_BATCH_SIZE` e `COMMUNICATION_TICK_SECONDS` abaixo do limite: por
   exemplo, para 200 por hora usar `COMMUNICATION_BATCH_SIZE=1` e `COMMUNICATION_TICK_SECONDS=20` (180 por hora). Os que falharem ficam com a razão e podem repetir-se.
3. **Mais do que um processo.** Se a app correr em várias instâncias, só uma envia de cada vez (bloqueio na BD), por isso nenhum destinatário recebe duas vezes.
4. **Endereços públicos.** O e-mail leva links absolutos: as imagens (`/api/media/...`), as fontes (`/api/fonts/...`) e os links de rastreio (`/api/t/c/...`, de `API_PUBLIC_URL`)
   têm de abrir sem login e sem passar por uma cache da Cloudflare que os bloqueie. Se o domínio da API mudar, os e-mails já enviados deixam de mostrar essas imagens.

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

## Manter a API acordada (cron)
A app Node do cPanel adormece sem tráfego e o primeiro pedido seguinte demora vários segundos (arranque a frio). No cPanel → *Cron Jobs*, de 5 em 5 minutos:
```
*/5 * * * * curl -s -o /dev/null https://academy.phormuladev.com/api/health
```
Serve também para o serviço em segundo plano (comunicações e notificações agendadas), que só corre com a app acordada.

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

**Ficheiros trocados (multimédia e IECs):** a API serve `/api/media/` e `/api/iecs/` com `Cache-Control: no-cache` (o browser pergunta sempre
e só descarrega se o ficheiro mudou, resposta 304 sem corpo) e os IECs em `/regional/wp-content/uploads/iec/` também (`.htaccess`). Com a regra acima a
Cloudflare segue estes cabeçalhos, por isso um ficheiro substituído (mesmo nome) aparece atualizado sem purge nem esperas.
Já as respostas públicas que mudam pouco levam cache curta de propósito: texto da página inicial (30 s). A lista de idiomas é sempre confirmada na API (resposta 304 minúscula) e as traduções de cada idioma
têm a versão no URL (`/api/language/translation?code=pt&v=...`): ficam em cache um ano, mas mudam de URL assim que se edita uma tradução,
por isso uma tradução editada chega à página seguinte de cada utilizador (ou ao voltar ao separador), sem purge nem esperas.

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
