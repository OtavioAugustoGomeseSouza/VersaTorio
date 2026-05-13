# Detalhamento e Estruturação da Solução para o Sistema de Geração de Provas Impressas

## Sumário
1. INTRODUÇÃO  
   1.1 Escopo do sistema  
   1.2 Público-alvo  
2. Definições de termos técnicos  
3. Definições do fluxo de geração de provas  
   1.3 Visão geral  
   1.4 Fluxo macro (descrição textual)  
4. Casos de Uso  
   1.5 Sistema Web  
   1.6 Professor  
5. Requisitos e Regras de Negócio  
   1.7 Requisitos Funcionais  
   1.8 Requisitos Não Funcionais  
   1.9 Regras de Negócio  
6. Diagramas  

---

# 1. INTRODUÇÃO

Este documento apresenta o detalhamento e a estruturação da solução para um sistema web de geração de provas impressas, de uso gratuito, com código aberto (Open Source) disponibilizado no GitHub.

O objetivo principal da plataforma é apoiar professores e instituições no processo avaliativo, fornecendo uma ferramenta organizada para:

- cadastrar e gerenciar bancos de questões;
- montar provas personalizadas;
- reutilizar modelos de provas já criados;
- organizar questões por disciplina e temas;
- exportar provas e gabaritos em formatos prontos para impressão (PDF e DOCX);
- gerar diferentes versões da mesma prova (com questões e alternativas embaralhadas) para reduzir fraudes acadêmicas, como cola e compartilhamento de respostas.

A plataforma foi pensada para ser gratuita e não comercial, permitindo que qualquer professor ou instituição utilize o sistema sem custo, e que outros desenvolvedores possam evoluir a solução a partir do código fonte.

---

## 1.1 Escopo do sistema

### Estão dentro do escopo:
- Interface web para professores cadastrarem questões e provas.
- Organização de questões por: disciplina, conteúdo/tema, nível de dificuldade, tipo de questão.
- Criação, edição, duplicação e exclusão de modelos de prova.
- Geração de múltiplas versões da prova com embaralhamento controlado.
- Exportação de provas e gabaritos em PDF e DOCX.
- Contas de usuário com autenticação.
- Mecanismos básicos de auditoria.

### Estão fora do escopo nesta primeira versão:
- Correção automática de provas.
- Aplicação de provas online.
- Integração com sistemas acadêmicos externos.
- Relatórios avançados de desempenho.

---

## 1.2 Público-alvo

- Professores do Ensino Fundamental, Médio e Superior.
- Coordenadores pedagógicos que queiram padronizar modelos de prova.
- Instituições de ensino que desejem minimizar fraudes em avaliações impressas.

---

# 2. Definições de termos técnicos

Alguns termos utilizados ao longo deste documento:

- **Questão:** item avaliativo cadastrado no sistema.
- **Banco de Questões:** conjunto de questões cadastradas por um usuário ou instituição.
- **Disciplina:** área de conhecimento associada à prova/questão.
- **Tema/Conteúdo:** tópico específico dentro da disciplina.
- **Modelo de Prova:** estrutura de prova com título, cabeçalho e lista de questões.
- **Versão de Prova:** instância gerada do modelo (Prova A, B, C...).
- **Gabarito:** documento contendo respostas corretas.
- **Aleatorização:** embaralhamento de questões e/ou alternativas.
- **Exportação:** geração de arquivos PDF ou DOCX.
- **Usuário (Professor):** pessoa que utiliza o sistema.
- **Administrador do Sistema:** usuário com permissões elevadas.

---

# 3. Definições do fluxo de geração de provas

## 1.3 Visão geral

Fluxo geral do sistema:

1. Cadastro e login do professor.
2. Configuração inicial do banco de questões.
3. Criação de um modelo de prova.
4. Associação a uma turma (opcional).
5. Geração de versões (A, B, C...).
6. Geração do gabarito correspondente.
7. Exportação em PDF ou DOCX.

---

## 1.4 Fluxo macro (descrição textual)

1. Início: professor acessa o sistema.
2. Autenticação: cadastro ou login.
3. Configuração: disciplinas e questões.
4. Criação de prova.
5. Geração de versões.
6. Exportação para download.

---

# 4. Casos de Uso

## 1.5 Sistema Web
A plataforma será acessada via navegador.

## 1.6 Professor

### CSU01 – Realizar Cadastro
**Descrição:** Permite criar conta.  
**Atores:** Professor, Sistema.  
**Pré-condições:** Não possuir conta.  
**Pós-condições:** Conta criada.

Fluxo:
1. Acessa cadastro.
2. Informa dados.
3. Sistema valida.
4. Sistema verifica duplicidade.
5. Cria usuário.
6. Confirma cadastro.

---

### CSU02 – Realizar Login
Permite acesso ao sistema com credenciais.

Fluxo:
1. Acessa login.
2. Informa dados.
3. Sistema valida.
4. Cria sessão.

---

### CSU03 – Recuperar Senha
Permite redefinição de senha via e-mail.

---

### CSU04 – Gerenciar Perfil
Atualização de dados pessoais.

---

### CSU05 – Cadastrar Questão
Cadastro de novas questões.

---

### CSU06 – Editar e Remover Questão
Alteração ou exclusão de questões.

---

### CSU07 – Organizar Banco de Questões por Disciplina
Criação de disciplinas e temas.

---

### CSU08 – Criar Modelo de Prova
Definição da estrutura de prova.

---

### CSU09 – Reutilizar Modelo de Prova
Duplicação de modelos existentes.

---

### CSU10 – Configurar Aleatorização e Gerar Prova (PDF/DOCX)

Fluxo:
1. Acessa modelo.
2. Seleciona exportação.
3. Configura aleatorização.
4. Confirma geração.
5. Sistema aplica algoritmo.
6. Cria versões.
7. Gera gabaritos.
8. Disponibiliza download.

---

# 5. Requisitos e Regras de Negócio

## 1.7 Requisitos Funcionais

- RF01 – Cadastro de usuários.
- RF02 – Autenticação.
- RF03 – Recuperação de senha.
- RF04 – Cadastro de disciplinas e temas.
- RF05 – Cadastro/edição/remoção de questões.
- RF06 – Associação de questões a metadados.
- RF07 – CRUD de modelos de prova.
- RF08 – Seleção de questões.
- RF09 – Configuração de aleatorização.
- RF10 – Geração de múltiplas versões.
- RF11 – Geração de gabaritos.
- RF12 – Exportação PDF.
- RF13 – Exportação DOCX.
- RF14 – Logs básicos.

---

## 1.8 Requisitos Não Funcionais

- RNF01 – Interface responsiva.
- RNF02 – Senhas criptografadas.
- RNF03 – Sistema web.
- RNF04 – Tempo de geração aceitável.
- RNF05 – Conformidade com LGPD.

---

## 1.9 Regras de Negócio

- RN01 – Prova precisa ter ao menos 1 questão.
- RN02 – Questão pode estar em várias provas.
- RN03 – Versões mantêm mesma distribuição.
- RN04 – Alternativas podem ser embaralhadas.

---

# 6. Diagramas

(Seção reservada para diagramas UML, fluxos ou arquitetura.)
