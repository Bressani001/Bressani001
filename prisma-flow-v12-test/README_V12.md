# PRISMA FLOW V12 TESTE

Build isolada para testes. Não substitui e não grava na pasta da V11.

## Como testar
1. Baixe a pasta `prisma-flow-v12-test` desta branch.
2. Abra `index.html` no Chrome ou Edge.
3. Clique em **Conectar base PRISMA** e selecione a pasta onde hoje você abre o `index.html` da V11.
4. A V12 lê os arquivos selecionados no navegador. Ela não altera esses arquivos.
5. Correções e importações ficam no IndexedDB separado: `prisma_flow_v12_test`.

## Implementado nesta build
- aplicação independente da V11;
- leitura de `catalog.js`, `point_details.js`, `machine_details.js` e `whatsapp.js`;
- busca única por pontos, máquinas, WhatsApp e registros importados;
- mapa navegável com OpenStreetMap/Leaflet;
- pins por latitude/longitude já existentes no cadastro detalhado;
- abrir ponto no Google Maps;
- edição/correção reversível de ponto sem apagar o valor original;
- importação CSV, JSON, XLS/XLSX;
- inferência de colunas por nome e conteúdo;
- revisão manual do mapeamento antes de importar;
- armazenamento V12 isolado;
- exclusão reversível de importações;
- base preparada para adicionar Slack como outra fonte normalizada.

## Internet
A aplicação principal e a leitura da V11 são locais. O mapa usa tiles do OpenStreetMap e a leitura XLS/XLSX usa SheetJS por CDN nesta build de teste, então essas duas funções precisam de internet. CSV e JSON não dependem do SheetJS.

## Segurança
Esta branch não modifica a main e a pasta V11 selecionada é usada somente como fonte de leitura.
