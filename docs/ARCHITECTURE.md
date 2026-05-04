# Arquitetura do app

O projeto segue uma arquitetura por feature. Cada feature deve concentrar sua tela, regras, hooks e integrações em um unico modulo dentro de `src/features`.

## Estrutura principal

```txt
src/
  app/          Tipos e configuracoes globais do app
  features/     Modulos de negocio
  navigation/   Navegacao e rotas
  shared/       Codigo reutilizavel entre features
```

## Estrutura de uma feature

Use esta estrutura como padrao quando a feature crescer:

```txt
features/example/
  index.ts
  screens/
  components/
  hooks/
  services/
  domain/
  data/
```

- `screens`: telas registradas na navegacao.
- `components`: componentes especificos da feature.
- `hooks`: composicao de estado e efeitos da feature.
- `services`: acesso a Firebase, APIs e comandos externos.
- `domain`: tipos, constantes e regras puras de negocio.
- `data`: normalizers, mappers e conversao de dados externos.

## Imports

Entre features, importe pela API publica da feature:

```ts
import { useShop } from '@features/shops';
import { AppointmentScreen } from '@features/appointments';
```

Evite importar internals de outra feature:

```ts
import { useShop } from '@features/shops/context/ShopContext';
```

Dentro da propria feature, prefira imports relativos para deixar claro que o codigo e interno:

```ts
import { normalizeAppointment } from '../data/appointment.normalizers';
```

## Shared

Use `src/shared` apenas para codigo realmente reutilizavel por mais de uma feature, como tema, inputs genericos, formatadores e validadores. Codigo que so pertence a um fluxo deve ficar dentro da feature correspondente.

## Telas grandes

Quando uma tela passar de algumas centenas de linhas, extraia primeiro:

- componentes visuais repetidos para `components`;
- efeitos e carregamento de dados para `hooks`;
- regras puras para `domain`;
- conversao de dados para `data`.
