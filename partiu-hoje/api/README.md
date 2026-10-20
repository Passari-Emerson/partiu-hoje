# Partiu Hoje?

App para deslizar (esquerda/direita) e dar match com restaurantes, bares, cafés e passeios **reais** perto de você. Funciona no navegador do celular e pode ser instalado na tela inicial.

## Como funciona

1. Você escolhe categorias, valores, restrição alimentar, orçamento e o **raio de busca (de 1 a 50 km)**.
2. O app pega a localização do celular. Se você negar, ele pede uma cidade ou bairro.
3. Para cada categoria, ele pergunta ao **Google Maps** quais lugares existem dentro do raio. O Google informa o tipo de cada lugar, e o app só mostra comida e bebida em categorias de comer e beber.
4. Só depois disso entra o seu gosto: os lugares são ordenados pelo **match** com o que você marcou, com a nota do Google, com a distância e com o que você curtiu e recusou.
5. Cada card mostra fotos do próprio lugar (toque na foto para ver a próxima), nota, número de avaliações, se está aberto agora, endereço e link para o Google Maps.

**O app nunca mostra lugares de exemplo.** Se o Google não responder, aparece uma mensagem dizendo o que falta configurar.

## Arquivos

- `public/index.html`: o app.
- `api/places.js`: busca lugares no Google dentro do raio.
- `api/photo.js`: entrega as fotos sem expor a chave.
- `api/geocode.js`: transforma o nome de uma cidade em coordenadas.
- `api/health.js`: diagnóstico. Abra `seu-endereco.vercel.app/api/health` para ver se a chave do Google está funcionando.
- `api/_google.js`: parte comum das rotas, com as mensagens de erro em português.

## Atualizar o app que já está no ar

Se você já publicou uma versão antes:

1. Descompacte este zip no computador.
2. No GitHub, abra o seu repositório `partiu-hoje` e entre na pasta onde ficam `api` e `public` (no seu caso, `partiu-hoje/partiu-hoje`).
3. Clique em **Add file > Upload files**, arraste de dentro da pasta descompactada as pastas `api` e `public` e o arquivo `README.md`, e clique em **Commit changes**. Os arquivos com o mesmo nome são substituídos.
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

## Custos e limites

- Cada busca nova faz até 10 consultas ao Google (uma por categoria marcada, no máximo) e, enquanto você desliza, até mais 12 para trazer outras páginas de resultados. Cada foto aberta também é uma chamada.
- Marque poucas categorias nos testes e use o limite diário de cota do Google. Esse limite é a sua proteção contra gasto inesperado.
- O plano gratuito (Hobby) da Vercel é para uso pessoal e sem fins comerciais.
- Qualquer pessoa com o link usa a sua cota do Google. Compartilhe só com quem você quer.

## O que o Google informa e o que ele não informa

- **Informa:** nome, tipo, endereço, nota, número de avaliações, faixa de preço, fotos, aberto agora, aceita cachorro, área externa, opção para crianças, acesso para cadeira de rodas, bom para grupos, música ao vivo, aceita reserva, serve comida vegetariana.
- **Não informa:** "sustentável", "local", "romântico", vegano, sem glúten, sem lactose. Por isso esses itens não aparecem nos valores. Para as restrições alimentares, o app só confirma "vegetariano" e avisa para conferir as demais com o local.
- **Eventos:** o Google não lista eventos. Dá para integrar Sympla ou Eventbrite no futuro.

## O que ainda não está pronto

- **Match em grupo** com amigos fora do protótipo do Claude: precisa de banco de dados e login (sugestão: Supabase). Está no protótipo publicado na conversa, mas não neste projeto.
- **Dados guardados no aparelho:** o app guarda no celular o nome, as fotos (como referência) e a nota dos lugares que você curtiu, para montar a lista de matches. Antes de abrir ao público, vale conferir as regras de armazenamento dos dados do Google Maps e guardar só o identificador do lugar.
- **Fotos e créditos:** o app mostra o nome do autor da foto e "Dados: Google Maps" em cada card, como o Google pede. Se mudar o visual, mantenha esses créditos.
