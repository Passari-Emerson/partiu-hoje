# Partiu Hoje?

App para deslizar (esquerda/direita) e dar match com restaurantes, bares, cafés e passeios perto de você, de acordo com gostos, valores, orçamento e distância.

Esta versão busca **lugares reais no Google Places** e cruza com a nota do **TripAdvisor**. Funciona no navegador do celular e pode ser instalada na tela inicial.

## O que tem aqui

- `public/index.html`: o app (telas, deslizar, matches, perfil).
- `api/places.js`: busca lugares no Google, dentro do raio escolhido.
- `api/tripadvisor.js`: acha o mesmo lugar no TripAdvisor e devolve nota e número de avaliações.
- `api/photo.js`: entrega as fotos dos lugares sem expor a chave.

As chaves ficam só no servidor. Sem a chave do Google, o app abre com lugares de exemplo. Sem a chave do TripAdvisor, ele funciona só com o Google.

## Categorias

- **Comer:** italiana, brasileira, churrasco, pizza, japonesa, chinesa, oriental, tailandesa, coreana, árabe, mexicana, frutos do mar, hambúrguer, vegana, contemporânea.
- **Beber e café:** cafés, padarias, bares, cerveja preta, cerveja artesanal, drinks, sorvete e sobremesas.
- **Passear:** música ao vivo, natureza, feiras, oficinas.

Para criar outra categoria, adicione uma linha em `LIKE_GROUPS` (nome na tela) e em `LIKE_Q` (o que o Google deve pesquisar), ambas em `public/index.html`.

## Como funciona a busca

1. O app pede a localização do celular. Se você negar, ele usa o centro de Porto Alegre e avisa.
2. Para cada categoria que você marcou, ele pergunta ao Google por lugares dentro do raio do controle "Raio de busca". Cada categoria pode usar até duas pesquisas.
3. Os lugares são ordenados por match com seus gostos, valores e orçamento. Só aparecem os que estão dentro do raio.
4. Conforme você desliza e a fila diminui, o app busca a próxima página de resultados do Google.
5. Os três primeiros cards da fila são cruzados com o TripAdvisor. Quando há correspondência, aparece a nota dele ao lado da do Google, com link para a página no TripAdvisor.

Aumentar o raio busca mais lugares. Diminuir só filtra o que já foi carregado.

## Passo a passo para colocar no ar

Você vai precisar de contas no Google Cloud, TripAdvisor, GitHub e Vercel.

### 1. Chave do Google [AIzaSyANQMVxFzU3uNIUuY79pasZqVWrz5sAR2I]

1. Entre em https://console.cloud.google.com e crie um projeto (ex.: "partiu-hoje").
2. Ative o faturamento do projeto. O Google exige cartão para usar o Places, mas tem cota gratuita mensal. Confira a tabela de preços atual antes de seguir.
3. Em **APIs e serviços > Biblioteca**, procure **Places API (New)** e clique em **Ativar**.
4. Em **APIs e serviços > Credenciais > Criar credenciais > Chave de API**, crie a chave.
5. Clique na chave e, em **Restrições de API**, escolha **Restringir chave** e marque só **Places API (New)**.
6. Em **Faturamento > Orçamentos e alertas**, crie um alerta (ex.: R$ 50). Em **APIs e serviços > Places API (New) > Cotas**, defina um limite diário de requisições.

### 2. Chave do TripAdvisor [75ff93c5-41e6-44c7-8a56-648580515754]

1. Crie uma conta no portal de desenvolvedores do TripAdvisor (procure por "Tripadvisor Content API") e assine o plano pago por uso.
2. Defina um **orçamento diário máximo**. É ele que limita o gasto: ao atingir o teto, a API para de responder.
3. Segundo a documentação do TripAdvisor, as primeiras 5.000 chamadas por mês são grátis, mas é preciso cartão de crédito. Confira os valores atuais na página do plano.
4. Copie a chave que aparece na sua conta. Cada conta tem uma só.

### 3. Código no GitHub

1. Crie uma conta em https://github.com e um repositório novo chamado `partiu-hoje`.
2. Clique em **uploading an existing file** e envie todos os arquivos desta pasta, mantendo as pastas `api` e `public`.

### 4. Publicar na Vercel

1. Entre em https://vercel.com com sua conta do GitHub e clique em **Add New > Project**.
2. Escolha o repositório `partiu-hoje` e clique em **Import**.
3. Em **Environment Variables**, adicione `GOOGLE_MAPS_API_KEY` (chave do passo 1) e `TRIPADVISOR_API_KEY` (chave do passo 2).
4. Clique em **Deploy**. Em cerca de um minuto você recebe o endereço do app.

### 5. Testar no celular

Abra o endereço no celular, permita a localização e deslize. No menu do navegador, use **Adicionar à tela inicial**.

## Custos e limites

- Cada categoria marcada gera até 2 pesquisas no Google, e cada rolagem de página gera outra. O app limita a 14 pesquisas por vez. Marque poucas categorias nos testes.
- Cada card cruzado com o TripAdvisor usa 2 chamadas dele (busca e detalhes). O app só cruza os 3 primeiros da fila e lembra o resultado durante a sessão.
- Os limites diários que você definiu no Google e no TripAdvisor são a proteção contra gasto inesperado. Não pule esse passo.

## O que ainda não está pronto

- **Logo do TripAdvisor:** os termos de uso exigem o logotipo oficial e as "bolhas" de nota ao lado dos dados, com altura mínima definida. O app hoje mostra só o texto "TripAdvisor" e o link. Antes de lançar ao público, baixe o logotipo no portal de marca do TripAdvisor e inclua nos cards.
- **Campos do TripAdvisor:** a rota `api/tripadvisor.js` foi escrita seguindo a documentação, mas só foi testada com respostas simuladas. Com a chave real, vale conferir uma busca e ajustar os nomes dos campos se algum vier diferente.
- **Match em grupo** com amigos fora do protótipo: precisa de banco de dados e login (sugestão: Supabase). É o próximo passo.
- **Eventos:** o Google Places não lista eventos. Dá para integrar Sympla ou Eventbrite.
- **Valores** (local, sustentável, romântico): o Google só informa alguns (aceita cachorro, área externa, acessibilidade, opção para crianças). O restante precisa de curadoria própria ou de IA lendo as avaliações.
- **Restrições alimentares:** o Google só informa "serve comida vegetariana". Vegano, sem glúten e sem lactose aparecem com aviso para confirmar com o local. Bares e cervejarias não são filtrados por restrição alimentar.
- **Termos de guarda de dados:** o app guarda no aparelho os dados dos lugares curtidos para montar a lista de matches. Antes de lançar ao público, o ideal é guardar só o identificador do lugar e consultar os detalhes na hora, e conferir as regras de armazenamento do Google e do TripAdvisor.
