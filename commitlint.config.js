module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Tipos permitidos conforme padrão PO-UI
    'type-enum': [
      2,
      'always',
      ['build', 'docs', 'feat', 'fix', 'perf', 'refactor', 'test'],
    ],

    // Tipo obrigatório e em minúsculo
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],

    // Escopo obrigatório e em minúsculo
    'scope-case': [2, 'always', 'lower-case'],
    'scope-empty': [2, 'never'],

    // Descrição: obrigatória, minúscula, sem ponto final
    'subject-case': [2, 'always', 'lower-case'],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],

    // Cabeçalho máximo 72 caracteres (tipo + escopo + descrição)
    'header-max-length': [2, 'always', 72],

    // Corpo: máximo 72 caracteres por linha
    'body-max-line-length': [2, 'always', 72],

    // Linha em branco obrigatória antes do corpo
    'body-leading-blank': [2, 'always'],

    // Linha em branco obrigatória antes do rodapé
    'footer-leading-blank': [1, 'always'],
  },
  parserPreset: {
    parserOpts: {
      // Permite descrição em português e inglês
      headerPattern: /^(\w+)\(([^)]+)\):\s(.+)$/,
      headerCorrespondence: ['type', 'scope', 'subject'],
    },
  },
};
