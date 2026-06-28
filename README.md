# VersaTório

**VersaTório** é uma ferramenta web gratuita e de código aberto voltada à geração automatizada de provas impressas com múltiplas versões. O sistema permite embaralhar questões e alternativas, emitir gabaritos correspondentes e exportar tudo em PDF — reduzindo o esforço manual e dificultando a troca de respostas entre estudantes em avaliações presenciais.

Desenvolvido como Trabalho de Conclusão de Curso no Instituto de Ciências Exatas e Tecnológicas da Universidade Federal de Viçosa – Campus Florestal (UFV).

---

## Funcionalidades

- Cadastro e autenticação de usuários (JWT)
- Gerenciamento de disciplinas, tópicos e banco de questões reutilizável
- Questões de múltipla escolha e dissertativas (com suporte a imagens)
- Criação de provas com seleção manual ou sorteio de questões por tópico
- Embaralhamento de questões e/ou alternativas com até 26 versões distintas
- Distribuição proporcional das alternativas corretas entre as posições (A, B, C…)
- Geração de PDF das provas e dos gabaritos correspondentes
- Customização de cabeçalho, layout (1 ou 2 colunas) e tema visual via variáveis de ambiente
- Dashboard com resumo dos dados cadastrados

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Backend | Node.js, NestJS, TypeScript |
| Banco de dados | MySQL 8.0, Prisma ORM |
| Frontend | React, Vite |
| Autenticação | JWT |
| Geração de PDF | pdfmake |
| Testes | Jest |
| Infraestrutura | Docker, Docker Compose |

---

## Pré-requisitos

- [Docker](https://www.docker.com/) e [Docker Compose](https://docs.docker.com/compose/) instalados

> Para rodar sem Docker, são necessários Node.js 20+ e MySQL 8.0 instalados localmente.

---

## Instalação e execução

### Com Docker (recomendado)

1. Clone o repositório:

```bash
git clone https://github.com/OtavioAugustoGomeseSouza/tcc-otavio-augusto.git
cd tcc-otavio-augusto
```

2. Copie o arquivo de variáveis de ambiente e preencha os valores:

```bash
cp .envmodel .env
```

Edite o `.env` e defina ao menos a variável `JWT_SECRET` com uma chave segreta de sua escolha. As demais variáveis já possuem valores padrão funcionais.

3. Suba os serviços:

```bash
docker compose up --build
```

O Docker irá subir o banco de dados, executar as migrations e iniciar o backend e o frontend automaticamente.

4. Acesse a aplicação em:

```
http://localhost:5174
```

A API estará disponível em `http://localhost:3001`.

---

### Sem Docker (execução manual)

#### Banco de dados

Crie um banco MySQL 8.0 e um usuário com permissões sobre ele.

#### Backend

```bash
cd backend
cp .env.example .env   # ou configure manualmente as variáveis
npm install
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

O frontend estará disponível em `http://localhost:5173`.

---

## Variáveis de ambiente

Todas as variáveis são definidas no arquivo `.env` na raiz do projeto. O arquivo `.envmodel` contém o modelo completo com descrição de cada variável.

As principais são:

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | URL de conexão do Prisma com o MySQL |
| `JWT_SECRET` | Chave secreta para assinar os tokens JWT |
| `VITE_API_URL` | URL base da API consumida pelo frontend |
| `APP_CORS_ORIGINS` | Origens permitidas pelo CORS do backend |
| `APP_THEME_*` | Cores do tema visual da interface |
| `APP_PDF_*` | Configurações de formatação dos PDFs gerados |

---

## Estrutura do projeto

```
tcc-otavio-augusto/
├── backend/          # API NestJS
│   ├── prisma/       # Schema e migrations do banco de dados
│   └── src/          # Código-fonte do backend
├── frontend/         # Interface React + Vite
│   └── src/          # Código-fonte do frontend
├── mysql/            # Scripts de inicialização do banco
├── docker-compose.yml
└── .envmodel         # Modelo de variáveis de ambiente
```

---

## Testes

```bash
cd backend
npm test              # Executa os testes unitários
npm run test:cov      # Executa com relatório de cobertura
```

---

## Limitações conhecidas

- Versões diferentes de uma mesma prova podem, eventualmente, ter a mesma ordem de questões/alternativas em provas com poucos itens.
- A versão atual não possui edição de perfil, recuperação de senha ou exportação em DOCX.

---

## Licença

Este projeto foi desenvolvido para fins acadêmicos. O código é disponibilizado publicamente como referência.
