# PRISMA FLOW V12 DEFINITIVO

**Build: 12.3.0-DEFINITIVO-20261005**

Esta branch é a versão autocontida para uso normal.

## Abrir

1. Baixe o ZIP da branch prisma-flow-v12-definitivo.
2. Extraia.
3. Entre em prisma-flow-v12-test.
4. Execute ABRIR_PRISMA.bat.

A base operacional já está embutida. Não é necessário selecionar a V11.

## Embutido na própria pasta

- catálogo operacional;
- WhatsApp;
- detalhes de pontos;
- detalhes de máquinas;
- roteador e regras históricas;
- Leaflet local;
- SheetJS local para XLS/XLSX;
- documentação/auditorias do projeto;
- todos os módulos V12.

Os arquivos grandes de dados foram particionados somente para armazenamento no GitHub. A V12 recompõe os payloads automaticamente antes de descompactar a base.

## Funcionalidades

- busca global;
- Explorar: pontos, máquinas, WhatsApp, eventos, ativos e chamados;
- Meu Turno;
- captura rápida;
- Ponto 360º;
- mapa navegável;
- Google Maps;
- Ponto → Grupo;
- Roteador NOC;
- Rotas WhatsApp e evidências cruzadas;
- grupos e mensagens;
- modelos PRISMA;
- Operações;
- senhas/notas locais;
- correções reversíveis;
- importador adaptativo XLS/XLSX/CSV/TXT/JSON;
- detecção de cabeçalho e melhor aba;
- SHA-256 e diff de importação;
- overlays ativáveis/desativáveis;
- backup completo V12;
- estrutura preparada para Slack.

## Offline

O núcleo abre sem CDN e sem instalar bibliotecas.

Funcionam localmente: base, busca, WhatsApp, roteador, XLS/XLSX, CSV/JSON, tarefas, correções, Ponto 360º e demais módulos.

No mapa, os pontos continuam funcionando offline. Quando não houver conexão, a V12 usa Sem fundo. As camadas Ruas / Satélite / Claro e o botão Google Maps são serviços online opcionais.

## Base externa

O botão Trocar base (opcional) continua disponível para testar outra pasta. Ele não é necessário para a base definitiva.

## Mídias históricas pesadas

As referências das mídias estão na base de WhatsApp. Os binários antigos de foto/vídeo do pacote de centenas de MB não são necessários para a aplicação iniciar.

Se quiser incorporar também esses arquivos binários, deixe o pacote antigo em Downloads ou FONTES e execute MONTAR_PRISMA_DEFINITIVO.bat. O montador cria outra pasta definitiva contendo também o material encontrado, sem alterar os originais.

## Segurança dos dados

A base embutida é tratada como fonte. Correções, tarefas, favoritos, modelos, imports e preferências ficam no IndexedDB separado prisma_flow_v12_test.
