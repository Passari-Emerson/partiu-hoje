# Partiu Hoje?

App para deslizar (esquerda/direita) e dar match com restaurantes, bares, cafés e passeios **reais** perto de você. Funciona no navegador do celular e pode ser instalado na tela inicial.

## Como funciona

1. Você escolhe categorias, valores, restrição alimentar, orçamento e o **raio de busca (de 1 a 50 km)**.
2. O app pega a localização do celular. Se você negar, ele pede uma cidade ou bairro.
3. Para cada categoria, ele pergunta ao **Google Maps** quais lugares existem dentro do raio. O Google informa o tipo de cada lugar, e o app só mostra comida e bebida em categorias de comer e beber.
4. Só depois disso entra o seu gosto: os lugares são ordenados pelo **match** com o que você marcou, com a nota do Google, com a distância e com o que você curtiu e recusou.
5. Cada card mostra fotos do próprio lugar (toque na foto para ver a próxima), nota, número de avaliações, se está aberto agora, endereço e link para o Google Maps.

**O app nunca mostra lugares de exemplo.** Se o Google não responder, aparece uma mensagem dizendo o que falta configurar.

## Minha lista, conta e compartilhamento

- **Lista pessoal:** em cada lugar você marca **Quero ir** ou **Já fui**, dá de 0 a 5 estrelas (com meia estrela) e escreve uma anotação. Tudo fica na aba **Lista**.
- **Conta (opcional):** entrando com Google ou com um código de 6 números enviado por e-mail, sua lista fica salva na nuvem e aparece em qualquer celular. Sem conta, o app funciona igual, só neste aparelho.
- **Compartilhar:** em **Lista > Compartilhar** você gera um link (WhatsApp ou copiar). Quem abrir **não precisa de conta**: vê a sua lista, o que vocês têm em comum e sugestões (lugares que você foi e deu nota 4 ou mais), e pode adicionar à lista dele. Anotações e e-mail nunca são compartilhados. Dá para parar de compartilhar a qualquer momento; o link antigo morre na hora.
- **O que fica guardado:** só o código do lugar no Google, o status, a nota e a anotação. Nome, foto e nota do Google são buscados de novo a cada vez, como os termos do Google pedem.

## Arquivos

- `public/index.html` e `public/app.js`: o app (telas e lógica).
- `public/cloud.js`: login e sincronização com o Supabase.
- `public/privacidade.html`: página de privacidade (preencha o seu contato no final).
- `supabase/setup.sql`: cria as tabelas e as regras de privacidade do banco.
- `api/config.js`: entrega ao app o endereço e a chave PÚBLICA do Supabase.
- `api/details.js`: busca no Google o nome, foto e endereço dos lugares da sua lista.
- `api/places.js`: busca lugares no Google dentro do raio.
- `api/photo.js`: entrega as fotos sem expor a chave.
- `api/geocode.js`: transforma o nome de uma cidade em coordenadas.
- `api/health.js`: diagnóstico. Abra `seu-endereco.vercel.app/api/health` para ver se a chave do Google está funcionando.
- `api/_google.js`: parte comum das rotas, com as mensagens de erro em português.

## Atualizar o app que já está no ar

Se você já publicou uma versão antes:

1. Descompacte este zip no computador.
2. No GitHub, abra o seu repositório `partiu-hoje` e entre na pasta onde ficam `api` e `public` (no seu caso, `partiu-hoje/partiu-hoje`).
3. Clique em **Add file > Upload files**, arraste de dentro da pasta descompactada as pastas `api`, `public` e `supabase` e o arquivo `README.md`, e clique em **Commit changes**. Os arquivos com o mesmo nome são substituídos.
4. Se existir o arquivo `api/tripadvisor.js` no GitHub, abra-o, clique nos três pontinhos e em **Delete file**. O app não usa mais.
5. A Vercel publica sozinha em cerca de um minuto. Acompanhe em **Deployments**.
6. Se você tinha criado a variável `TRIPADVISOR_API_KEY` na Vercel, pode apagá-la em **Settings > Environment Variables**. A `GOOGLE_MAPS_API_KEY` continua.
7. Abra `seu-endereco.vercel.app/api/health`. Se aparecer `"ok": true`, está tudo certo. Se aparecer `"ok": false`, o campo `o_que_fazer` explica o próximo passo.
8. No celular, feche a aba do app e abra de novo. Se ainda aparecer a versão antiga, limpe os dados do site nas configurações do navegador.

## Primeira publicação (passo a passo)

### 1. Chave do Google

1. Entre em https://console.cloud.google.com e crie um projeto (ex.: "partiu-hoje").
2. Ative o faturamento. O Google exige cartão para usar o Places, mas tem uso gratuito mensal. Confira a tabela de preços atual antes de seguir.
3. Em **APIs e serviços > Biblioteca**, procure **Places API (New)** e clique em **Ativar**. Precisa ser a versão "(New)".
4. Em **APIs e serviços > Credenciais > Criar credenciais > Chave de API**, crie a chave.
5. Clique na chave e, em **Restrições de API**, escolha **Restringir chave** e marque só **Places API (New)**. Não use restrição por site nem por IP, porque as chamadas saem do servidor da Vercel.
6. Em **Faturamento > Orçamentos e alertas**, crie um alerta (ex.: R$ 50). Em **APIs e serviços > Places API (New) > Cotas**, defina um limite diário de requisições.

### 2. GitHub

1. Crie um repositório chamado `partiu-hoje` em https://github.com.
2. Clique em **uploading an existing file** e envie as pastas `api` e `public` e os arquivos soltos.

### 3. Vercel

1. Entre em https://vercel.com com a conta do GitHub, clique em **Add New > Project** e importe o repositório.
2. Se as pastas `api` e `public` estiverem dentro de outra pasta no GitHub, vá em **Settings > Build and Deployment > Root Directory** e digite o caminho dessa pasta.
3. Em **Settings > Environment Variables**, adicione `GOOGLE_MAPS_API_KEY` com a chave do passo 1.
4. Em **Settings > Deployment Protection**, desligue a **Vercel Authentication** para abrir o app sem login.
5. Faça um novo deploy (**Deployments > ... > Redeploy**) e abra o endereço no celular.
6. Para virar ícone: **Compartilhar > Adicionar à Tela de Início** (iPhone) ou menu do navegador > **Adicionar à tela inicial** (Android).

## Ligar a conta na nuvem (Supabase)

Esta parte é opcional. Sem ela o app funciona só no aparelho, e o botão Entrar explica que a conta não está ativada. Os nomes dos menus do Supabase mudam de vez em quando; se algo estiver em outro lugar, procure pelo nome em inglês entre parênteses.

### 1. Criar o projeto
1. Entre em https://supabase.com, crie a conta e clique em **New project**. Escolha um nome, uma senha do banco (guarde) e a região mais próxima (ex.: São Paulo).
2. Espere o projeto terminar de ser criado.

### 2. Criar as tabelas
1. No menu da esquerda, abra **SQL Editor** e clique em **New query**.
2. Abra o arquivo `supabase/setup.sql` deste projeto, copie tudo, cole e clique em **Run**. Deve aparecer "Success". Pode rodar de novo quando atualizar o app: ele não apaga dados.

### 3. Copiar o endereço e a chave pública
1. Abra **Project Settings > API** (ou **API Keys**).
2. Copie o **Project URL** (algo como `https://abcd1234.supabase.co`) e a chave **anon** (ou **publishable**).
3. **Nunca use a chave `service_role` / `secret`.** O app recusa essa chave de propósito.

### 4. Colocar na Vercel
1. Em **Settings > Environment Variables**, crie `SUPABASE_URL` (o Project URL) e `SUPABASE_ANON_KEY` (a chave pública).
2. Faça um novo deploy (**Deployments > ... > Redeploy**).
3. Abra `seu-endereco.vercel.app/api/health`: o campo `conta_na_nuvem` deve dizer "configurada".

### 5. Endereços permitidos
Em **Authentication > URL Configuration**:
- **Site URL**: `https://seu-endereco.vercel.app`
- **Redirect URLs**: adicione `https://seu-endereco.vercel.app/**`

### 6. Login por e-mail com código
1. Em **Authentication > Email Templates**, abra o modelo **Magic Link** e troque o texto para mostrar o código, por exemplo:
   `<h2>Seu código do Partiu Hoje?</h2><p>Digite este código no app: <strong>{{ .Token }}</strong></p>`
2. Em **Authentication > Sign In / Providers**, deixe **Email** ativado.
3. O envio de e-mails embutido do Supabase tem limite baixo (poucos e-mails por hora) e serve só para testar. Para uso real, configure um SMTP próprio em **Authentication > SMTP Settings** (por exemplo Resend ou Brevo).

### 7. Login com Google (opcional)
1. No Google Cloud, em **APIs e serviços > Credenciais > Criar credenciais > ID do cliente OAuth**, escolha **Aplicativo da Web**.
2. Em **URIs de redirecionamento autorizados**, cole o endereço de retorno que o Supabase mostra em **Authentication > Sign In / Providers > Google** (termina em `/auth/v1/callback`).
3. Copie o **ID do cliente** e a **chave secreta do cliente** para a tela do Google no Supabase e ative.
4. Na tela de consentimento OAuth, publique o app, senão só os e-mails de teste conseguem entrar.

### Cuidados
- No iPhone, entrar pelo ícone da tela inicial (app instalado) e pelo Safari usam armazenamentos separados: entre de novo se trocar.
- O plano gratuito do Supabase pausa projetos sem uso por algumas semanas; é só reativar no painel.
- Em **Perfil > Excluir minha conta**, a pessoa apaga a conta, a lista e o link para sempre.
- Preencha o seu nome e e-mail no final de `public/privacidade.html` antes de divulgar o app.

## Limites de uso e planos

Cada lugar mostrado custa dinheiro no Google, então o app limita o uso. O limite é contado no banco (Supabase) e conferido pelo servidor antes de chamar o Google. Não dá para burlar limpando os dados do celular. O dia vira à meia-noite, no horário de Brasília. Um lugar só conta quando aparece na tela, e vê-lo de novo no mesmo dia não gasta outra unidade.

| Plano | Lugares por dia | Fotos por lugar | Preço |
|---|---|---|---|
| Visitante (sem conta) | 10 no total | 2 | grátis |
| Grátis (com conta) | 20 | 2 | grátis |
| Premium | 60 | 3 | R$ 5 por semana ou R$ 15 por mês |
| Premium Gold | 120 | 5 | R$ 10 por semana ou R$ 30 por mês |

- **Mudar números e preços:** no Supabase, abra **Table Editor > plans** e edite a linha. Rodar o `setup.sql` de novo não apaga a sua edição.
- **Cuidado com o custo:** pelas minhas contas, cada lugar mostrado custa em torno de US$ 0,01 no Google (a foto pesa mais). Quem usa o teto todo dia custa mais do que paga: 60 por dia fica perto de US$ 16 por mês e 120 por dia perto de US$ 32, contra R$ 15 e R$ 30 de receita. Quase ninguém usa o teto todo dia, mas meça antes de divulgar. Para ver o uso real, rode no SQL Editor: `select day, count(*) lugares, count(distinct user_id) pessoas from public.views where kind = 'card' group by day order by day desc;`
- **Visitante sem conta:** o app cria uma sessão anônima no Supabase para contar os 10 lugares. Em **Authentication > Sign In / Providers**, ative **Allow anonymous sign-ins**. Sem isso, o app avisa o que falta. Quem limpa os dados do celular ganha mais 10, então considere ligar a proteção contra robôs (CAPTCHA) em **Authentication > Attack Protection**.
- **Dar um plano a alguém (teste ou cortesia):** no SQL Editor, rode `select public.admin_grant_plan('amigo@email.com', 'premium', 7);` (7 dias de Premium). Use `'gold'` para Gold e `'free'`, com 0 dias, para voltar ao grátis.
- **Cobrança:** a tela de planos já existe, mas o botão **Assinar** só aparece quando você coloca um link de pagamento na Vercel (`CHECKOUT_PREMIUM_WEEK`, `CHECKOUT_PREMIUM_MONTH`, `CHECKOUT_GOLD_WEEK`, `CHECKOUT_GOLD_MONTH`). O app anexa o código da conta ao link. **A liberação automática do plano depois do pagamento ainda não está pronta.** Hoje você libera na mão com `admin_grant_plan`. Ela depende do provedor de pagamento que você escolher.
- Sem as variáveis do Supabase, o app funciona sem conta e **sem limite nenhum**. Confira em `/api/health` o campo `limites_de_uso`.

## Custos e limites

- Cada busca nova faz até 10 consultas ao Google (uma por categoria marcada, no máximo) e, enquanto você desliza, até mais 12 para trazer outras páginas de resultados. Cada foto aberta também é uma chamada.
- Marque poucas categorias nos testes e use o limite diário de cota do Google. Esse limite é a sua proteção contra gasto inesperado.
- O plano gratuito (Hobby) da Vercel é para uso pessoal e sem fins comerciais.
- A tela da lista busca no Google só os 20 lugares que aparecem de cada vez (nome, foto, endereço), o que também gera chamadas. Quem abre o link de um amigo também usa a sua cota.
- Qualquer pessoa com o link usa a sua cota do Google. Compartilhe só com quem você quer.

## O que o Google informa e o que ele não informa

- **Informa:** nome, tipo, endereço, nota, número de avaliações, faixa de preço, fotos, aberto agora, aceita cachorro, área externa, opção para crianças, acesso para cadeira de rodas, bom para grupos, música ao vivo, aceita reserva, serve comida vegetariana.
- **Não informa:** "sustentável", "local", "romântico", vegano, sem glúten, sem lactose. Por isso esses itens não aparecem nos valores. Para as restrições alimentares, o app só confirma "vegetariano" e avisa para conferir as demais com o local.
- **Eventos:** o Google não lista eventos. Dá para integrar Sympla ou Eventbrite no futuro.

## O que ainda não está pronto

- **Deslizar junto com um amigo** (match em tempo real com duas pessoas) ainda não existe. O que existe é compartilhar a lista e ver o que têm em comum.
- **Eventos:** o Google não lista eventos.
- **Testes:** o app foi testado em navegador simulado com um Supabase simulado (Postgres real, mesmas regras de privacidade). Ainda não foi testado com o seu projeto Supabase nem com o login real do Google; use o passo a passo acima e confira `/api/health`.
- **Fotos e créditos:** mantenha o nome do autor da foto e "Dados: Google Maps" nos cards, como o Google pede.
