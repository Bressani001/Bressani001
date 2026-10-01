# PRISMA FLOW V12 TESTE

Build isolada para testes. **Não substitui, não sobrescreve e não grava na pasta da V11.**

A pasta V11 é selecionada pelo navegador e usada somente como fonte. Tudo que é novo da V12 fica no IndexedDB separado:

`prisma_flow_v12_test`

## Como testar

1. Baixe novamente a branch `prisma-flow-v12-test`.
2. Extraia o ZIP.
3. Entre na pasta `prisma-flow-v12-test`.
4. Abra `index.html` no Chrome ou Edge atualizado.
5. Clique em **Conectar pasta V11**.
6. Selecione a pasta completa onde hoje você abre o PRISMA V11.
7. Aguarde o carregamento de catálogo, WhatsApp, detalhes e roteador.

A V12 procura na pasta selecionada:

- `catalog.js`
- `whatsapp.js`
- `point_details.js`
- `machine_details.js`
- `router.js` / `router_v7.js`
- pasta `media/` quando presente

## Restaurado da V7 → V11

- Roteador NOC com perfis, regras, associações, histórico e confirmação manual;
- Rotas direcionais de grupos, inclusive evidências cruzadas e feedback local;
- Ponto → Grupo;
- grupos WhatsApp, cobertura e histórico;
- mensagens originais, mensagens citadas, mídias e vínculos ponto/máquina;
- pontos, máquinas, eventos, ativos e chamados;
- Mensagens PRISMA;
- 8 modelos padrão;
- variáveis e blocos condicionais dos modelos;
- links de grupos WhatsApp;
- canais Slack cadastráveis;
- contatos / @;
- chamado ELT → ID interno do Operações;
- atalhos Operações;
- senhas e notas locais;
- favoritos;
- Meu Turno;
- captura rápida;
- Ponto 360º;
- mapa de relações;
- saúde das bases;
- backup completo V12;
- Ctrl+K e / para abrir a busca;
- migração segura das configurações locais antigas quando existirem no mesmo navegador.

## Melhorias V12

### Busca

Busca única em:

- pontos;
- máquinas;
- grupos;
- WhatsApp;
- chamados;
- ativos;
- registros importados.

A área **Explorar** preserva as antigas visões separadas sem entupir o menu principal.

### Importador adaptativo

Aceita:

- XLSX;
- XLS;
- CSV;
- TXT tabular;
- JSON.

Não exige que a planilha venha no padrão antigo.

A V12:

1. procura automaticamente a linha de cabeçalho;
2. em Excel, analisa as abas e escolhe a tabela mais provável;
3. infere o significado por nome da coluna + conteúdo;
4. mostra o mapeamento antes da gravação;
5. permite corrigir manualmente;
6. aprende o cabeçalho corrigido para a próxima importação;
7. calcula SHA-256;
8. mostra prévia de novos / alterados / iguais / duplicados / inválidos;
9. grava como overlay local;
10. permite pausar, reativar ou excluir a importação.

### Correções

Ponto e máquina podem ser corrigidos sem apagar a fonte.

Registros importados também podem ser corrigidos campo a campo.

A linha original da importação permanece preservada para auditoria.

Mensagens de WhatsApp continuam imutáveis; nelas a V12 permite nota local, não alteração da evidência.

### Mapa

- mapa navegável;
- pesquisa de pontos;
- pins pelas coordenadas do cadastro;
- pontos importados com coordenadas;
- popup com Ponto 360º;
- Operações;
- Google Maps;
- limite visual de 1.800 markers por viewport para não travar o navegador;
- pontos continuam na busca mesmo quando nem todos são desenhados simultaneamente.

O fundo usa Leaflet + CARTO com dados © OpenStreetMap contributors. A troca foi feita para evitar o bloqueio 403 do endpoint comunitário de tiles do OSM que apareceu na build anterior.

## Slack

A arquitetura está preparada para Slack como outra fonte da mesma timeline:

`canal/thread/mensagem → mensagem normalizada → linker de ponto/máquina/chamado/ativo`

O importador real do histórico do Slack será fechado quando a exportação/arquivos reais forem fornecidos, para não inventar um schema que talvez não corresponda ao material que você vai subir.

## Segurança

- branch separada da `main`;
- pasta V11 em somente leitura;
- banco V12 separado;
- evidência original preservada;
- importações reversíveis;
- correções auditáveis;
- mensagem nunca é enviada automaticamente;
- Operações e Google Maps abrem em nova aba;
- arquivo de planilha não executa script ou fórmula no PRISMA.

## Internet

O núcleo e a leitura da V11 são locais.

Nesta build de teste:
- Leaflet é carregado por CDN;
- o fundo do mapa usa tiles online;
- SheetJS é carregado por CDN para XLS/XLSX.

CSV/JSON e o restante do núcleo não dependem do SheetJS.

## Validação

O arquivo `smoke.mjs` verifica:
- arquivos obrigatórios;
- scripts carregados no `index.html`;
- páginas obrigatórias;
- sintaxe de todos os módulos JS;
- banco isolado;
- loaders da V11;
- formatos do importador;
- tile provider;
- sinais do motor de rotas;
- Roteador NOC;
- modelos PRISMA;
- módulos FLOW restaurados.

