# Arquitetura do DetailGo

O projeto usa React Native com uma arquitetura por feature. Essa base esta correta para o momento do app, porque separa os fluxos principais por dominio e evita uma pasta unica de `screens`, `services` e `components` crescendo sem contexto.

## Estrutura atual

```txt
src/
  app/          Tipos globais do app, como rotas
  assets/       Assets usados pelo app
  features/     Modulos de negocio
  navigation/   Navegacao principal
  shared/       Codigo reutilizavel entre features
```

## Features

Cada feature deve expor apenas sua API publica pelo `index.ts`.

```txt
features/auth/
  context/
  screens/
  services/
  utils/
  index.ts

features/appointments/
  components/
  data/
  domain/
  hooks/
  screens/
  services/
  index.ts
```

Use esta estrutura quando uma feature crescer:

```txt
features/example/
  index.ts       API publica da feature
  screens/       Telas registradas na navegacao
  components/    Componentes especificos dessa feature
  hooks/         Estado, efeitos e composicao de dados
  services/      Firebase, APIs e comandos externos
  domain/        Tipos, constantes e regras puras
  data/          Normalizers, mappers e conversao externa
```

## Regra de imports

Entre features, prefira importar pela API publica:

```ts
import { useShop } from '@features/shops';
import { AppointmentScreen } from '@features/appointments';
```

Evite importar arquivos internos de outra feature:

```ts
import { useShop } from '@features/shops/context/ShopContext';
```

Dentro da propria feature, imports relativos continuam bons porque deixam claro que o codigo e interno:

```ts
import { normalizeAppointment } from '../data/appointment.normalizers';
```

## O que esta bom

- A separacao por `features` ja da contexto de negocio.
- `shared` concentra tema, componentes genericos, hooks e utils reutilizaveis.
- `domain`, `data`, `services` e `hooks` ja aparecem nas features mais importantes.
- Os aliases `@features`, `@shared`, `@app` e `@assets` deixam os imports mais legiveis.
- `lint` e `tsc --noEmit` estao funcionando e devem continuar como guardrails.

## Pontos para enxugar

As telas abaixo estao grandes demais e concentram UI, regras, estado e acesso ao Firebase:

```txt
AppointmentScreen.tsx
AdminManageScreen.tsx
ProfileScreen.tsx
DashboardScreen.tsx
AdminDashboardScreen.tsx
RegisterScreen.tsx
```

O melhor caminho e refatorar uma tela por vez, sem mudar comportamento.

Para cada tela grande, extraia nesta ordem:

1. Componentes visuais repetidos para `components/`.
2. Estado e efeitos para `hooks/`.
3. Regras puras para `domain/`.
4. Acesso ao Firebase para `services/`.
5. Mappers/normalizers para `data/`.

## Padrao recomendado para telas

Uma tela deve ficar mais parecida com isto:

```tsx
export default function AppointmentScreen() {
  const viewModel = useAppointmentForm();

  return (
    <AppointmentLayout>
      <ServiceSelector {...viewModel.serviceSelector} />
      <DateSelector {...viewModel.dateSelector} />
      <AppointmentSummary {...viewModel.summary} />
    </AppointmentLayout>
  );
}
```

A tela coordena o fluxo. Componentes desenham UI. Hooks carregam dados e mantem estado. Services falam com Firebase. Domain guarda regras puras.

## Prioridade de refatoracao

1. `AppointmentScreen`: maior tela e fluxo central do cliente.
2. `AdminManageScreen`: muita edicao/configuracao na mesma tela.
3. `DashboardScreen` e `AdminDashboardScreen`: extrair drawer, header, cards e hooks de dados.
4. `ProfileScreen`: separar edicao de nome, email, telefone e avatar.
5. `RegisterScreen`: separar formulario por perfil owner/customer.

## Regra pratica

Se um trecho precisa de `useState`, `useEffect`, Firebase e JSX no mesmo bloco, ele provavelmente merece virar hook + componente.

Se uma regra pode ser testada sem React Native, ela deve ir para `domain/`.

Se um arquivo existe apenas para uma tela, ele deve ficar dentro da feature dessa tela, nao em `shared`.
