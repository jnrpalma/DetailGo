# Contribuindo com o DetailGo 🚗

Este projeto utiliza um **padrão simples e obrigatório** para criação de branches
e commits, com o objetivo de manter o histórico limpo, legível e profissional.

Não utilize commits genéricos ou fora do padrão.

---

## 🌱 Padrão de Branch

Formato:
tipo/descricao-curta

diff
Copiar código

Tipos permitidos:
- feat → nova funcionalidade
- fix → correção de bug
- refactor → refatoração
- docs → documentação
- chore → ajustes técnicos

Exemplos:
feat/admin-agendamentos
fix/dashboard-servicos
refactor/availability
docs/commits

yaml
Copiar código

---

## ✍️ Padrão de Commit (OBRIGATÓRIO)

Formato:
tipo(escopo): descrição curta

fixes <numero>

markdown
Copiar código

### Tipos permitidos
- feat
- fix
- refactor
- docs
- chore

### Escopo
Indica a parte do sistema alterada, por exemplo:
admin
dashboard
auth
scheduling
availability
firestore
navigation

yaml
Copiar código

### Regras da descrição
- sempre em minúsculo
- verbo no imperativo
- sem ponto final
- máximo de 72 caracteres
- clara e objetiva

---

## ✅ Exemplos CORRETOS

feat(admin): adiciona nome do cliente no agendamento

fixes 23

Copiar código
fix(dashboard): corrige lista de serviços concluídos

fixes 41

Copiar código
refactor(availability): simplifica regra de capacidade

yaml
Copiar código

---

## ❌ Exemplos PROIBIDOS

update
ajustes
teste
wip
commit final

yaml
Copiar código

Commits fora do padrão **não devem ser aceitos**.

---

## 📌 Regra Final

Antes de commitar, pergunte:
> “Esse commit explica claramente o que foi feito?”

Se a resposta for não, ajuste a mensagem.