# Guia de Contribuição

Este documento explica como colaborar com o portfólio coletivo de forma organizada e padronizada.

---

## 🚀 Fluxo de Trabalho

1. **Clone o repositório**
   ```bash
   git clone https://github.com/PortfolioColetivo/portfolio-coletivo.git
2. **Crie uma branch exclusiva (exemplo: feature/nome-da-feature)**
   ```bash
   git checkout -b feature/nome-da-feature
3. **Desenvolva**
   - Mantenha o código limpo e organizado
   - Siga as convenções do projeto
   - Adicione testes sempre que possível
4. **Commit e push**
   ```bash
   git add .
   git commit -m "Descrição clara da mudança"
   git push origin feature/nome-da-feature
5. **Abra um Pull Request**
   - Descreva suas mudanças
   - Solicite revisão dos colegas
6. **Revisão e aprovação**
   - Receba feedback
   - Faça ajustes se necessário
   - Merge na branch principal
---

## 🔧 Branching Strategy

**main** – Versão estável e pronta para produção.

**dev** – Branch de desenvolvimento principal, onde as features são integradas.

**feature/*** – Cada nova funcionalidade deve ter sua própria branch.

**fix/*** – Correção de bugs.

**docs/*** – Atualizações na documentação.

---

## 🎯 Convenções de Commit

Use o formato [Conventional Commits](https://www.conventionalcommits.org/):

```
tipo(escopo): descrição curta
```

**Tipos comuns:**
- feat: nova funcionalidade
- fix: correção de bug
- docs: mudanças na documentação
- style: formatação, ponto e vírgula, etc.
- test: adição de testes
- refactor: reestruturação sem mudança de comportamento
- chore: atualizações de build, dependências, etc.

**Exemplo:**

```
feat(auth): adiciona autenticação com Google
```
---

## 🧪 Testes

- Todo novo código deve ter testes
- Mantenha os testes organizados na pasta tests/
- Execute npm test antes de enviar seu código
---

## 📂 Estrutura do Projeto

```
portfolio-coletivo/
├── frontend/            # Código da interface

├── backend/             # Código do servidor

├── projetos/            # Projetos individuais

├── docs/                # Documentação

└── assets/              # Arquivos estáticos
```
---

## 🤝 Regras de Colaboração

1. **Não faça merge direto na main** – sempre use Pull Requests
2. **Respeite os colegas** – feedback construtivo sempre
3. **Mantenha o código limpo** – siga o guia de estilo
4. **Comunique-se** – mantenha o time atualizado
5. **Resolva conflitos** – faça merge frequente da main na sua branch

---

## 📄 Licença
Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

---

## 📚 Recursos Úteis

- [Guia de Estilo](LINKS_ADICIONE_AQUI.md)
- [Guia de Arquitetura](LINKS_ADICIONE_AQUI.md)
- [Convenções de Design](LINKS_ADICIONE_AQUI.md)

---

## 🤝 Agradecimentos

Obrigado a todos que contribuem para este projeto! 🙌
