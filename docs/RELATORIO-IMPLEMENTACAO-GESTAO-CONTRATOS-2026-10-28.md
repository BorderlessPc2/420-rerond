# Relatório de implementação — Gestão de Contratos

**Data:** 28/10/2026  
**Escopo:** Gestão de Contratos, Protocolos, Pontos e acompanhamento territorial  
**Branch:** `main`

## Resumo

Implementado fluxo operacional visual para acompanhar contratos, protocolos e pontos em um dashboard unificado com mapa real gratuito.

A entrega não altera os fluxos de análise ou melhoria da IA. O foco ficou restrito à gestão operacional dos contratos.

## Fluxo macro entregue

```text
Contrato
→ Dashboard unificado
→ Filtros operacionais
→ Mapa real com pontos
→ Seleção de ponto
→ Painel de andamento
→ Protocolo contextual
→ Mapa restrito ao protocolo
→ Foco em ponto específico
```

## Fluxos micro

### 1. Criar protocolo com pontos

```text
Contrato
→ Novo protocolo
→ Informar título, concessionária e rodovia
→ Adicionar pontos
→ Informar dados e coordenadas opcionais
→ Salvar protocolo e pontos em operação atômica
→ Atualizar dashboard e mapa
```

### 2. Criar pontos depois

```text
Contrato
→ Protocolos
→ Selecionar protocolo
→ Pontos
→ Novo ponto
→ Validar vínculo com concessionária e rodovia
→ Salvar ponto
→ Exibir no mapa quando houver coordenadas
```

### 3. Consultar mapa do contrato

```text
Contrato
→ Mapa
→ Exibir pontos geolocalizados
→ Colorir por situação operacional
→ Clicar no marcador
→ Visualizar dados e andamento do ponto
```

### 4. Consultar mapa do protocolo

```text
Protocolo
→ Mapa do protocolo
→ Exibir somente pontos vinculados
→ Ajustar enquadramento aos pontos do protocolo
→ Selecionar ponto
→ Abrir contexto do ponto
```

### 5. Abrir ponto diretamente

```text
Lista de pontos ou pendências
→ Ver no mapa
→ /gestao-contratos/:contratoId/mapa?ponto=:pontoId
→ Validar ponto no contrato
→ Centralizar mapa
→ Exibir painel do ponto
```

O mesmo contexto pode ser preservado ao abrir o protocolo:

```text
/gestao-contratos/:contratoId/protocolos/:protocoloId?ponto=:pontoId
```

### 6. Tratar ponto sem coordenadas

Pontos sem latitude ou longitude não são removidos do fluxo.

Eles aparecem:

- na contagem de pendências;
- na lista de coordenadas pendentes;
- no dashboard do contrato;
- com ação para abrir o mapa e registrar localização.

## Mapa

Implementado com:

- Leaflet;
- OpenStreetMap;
- sem chave paga;
- sem Google Maps;
- sem geocodificação;
- sem cálculo de rotas;
- atribuição visível do OpenStreetMap.

Comportamentos implementados:

- ajuste automático aos pontos do recorte;
- centralização no ponto selecionado;
- cores por situação operacional;
- tooltip com código, rodovia e quilômetro;
- seleção por clique;
- seleção por teclado;
- `aria-label` nos marcadores;
- fallback informativo caso o mapa ou tiles não carreguem.

## Filtros

O dashboard passa a suportar filtros por:

- estado;
- concessionária;
- rodovia;
- protocolo;
- código do ponto;
- status;
- classificação do ponto;
- etapa;
- previsão inicial;
- previsão final.

O mesmo recorte alimenta:

- mapa;
- marcadores;
- contadores;
- indicadores;
- lista de pontos;
- lista de protocolos;
- seleção atual.

Seleção inválida ou removida pelo filtro é limpa sem quebrar a tela.

## Painel do ponto

Ao selecionar um ponto, o painel mostra:

- código;
- estado;
- concessionária;
- rodovia;
- quilômetro;
- situação;
- tipo;
- resultado;
- protocolo vinculado;
- previsão;
- realização;
- link para andamento completo do protocolo.

## Arquivos principais

- `src/components/gestao/MapaLeaflet.tsx`
- `src/components/gestao/MapaLeaflet.css`
- `src/components/gestao/mapaUtils.ts`
- `src/components/gestao/mapaUtils.test.ts`
- `src/views/GestaoContratoDetalhe.tsx`
- `src/views/GestaoProtocolos.tsx`
- `src/views/GestaoMapa.tsx`
- `src/views/GestaoPontos.tsx`
- `src/services/gestaoContratos.ts`
- `src/services/gestaoContratos.test.ts`

Dependências adicionadas:

- `leaflet`
- `@types/leaflet`

## Validação

Comandos executados:

```bash
npm test -- --run
npx tsc --noEmit
npm run build
npm run lint
git diff --check
```

Resultado:

- 30 arquivos de teste passaram;
- 116 testes passaram;
- TypeScript passou;
- build passou;
- lint passou;
- verificação de diff passou.

## Limitações conhecidas

- O fluxo autenticado não foi exercitado integralmente no navegador local porque a aplicação redirecionou para login sem sessão disponível.
- O build mantém warning existente de sintaxe CSS.
- O bundle principal permanece acima de 500 kB; otimização de bundle não faz parte desta entrega.
- Pontos ainda dependem de coordenadas fornecidas pelo operador; não foi adicionada geocodificação automática.
- Tiles dependem de conectividade com OpenStreetMap; existe fallback visual para indisponibilidade do mapa.

## Próximos passos recomendados

1. Validar o fluxo autenticado em ambiente de deploy.
2. Confirmar dados reais de contratos, protocolos e pontos no Firestore.
3. Revisar visualmente mapa e filtros em desktop e mobile.
4. Melhorar o dashboard de visão geral após validação operacional.
5. Avaliar code splitting do bundle em etapa separada.
