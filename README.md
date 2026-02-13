# 🎯 Bingo Online

Aplicação de Bingo online com React + Supabase.

## Setup Rápido

### 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Vá em **SQL Editor** e execute o conteúdo do arquivo `sql/setup.sql`
3. Em **Authentication > Settings**, desabilite "Confirm email" (para testes)
4. Copie a **URL** e **anon key** do projeto (Settings > API)

### 2. Projeto

```bash
# Instalar dependências
npm install

# Criar arquivo .env
cp .env.example .env
# Edite o .env com suas credenciais do Supabase

# Rodar em dev
npm run dev
```

### 3. Criar Admin

Após criar sua conta no app, execute no SQL Editor do Supabase:

```sql
UPDATE public.profiles SET is_admin = true WHERE email = 'seu@email.com';
```

### 4. Deploy (Vercel)

```bash
npm run build
# Faça deploy da pasta dist/ na Vercel
# Configure as variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
```

## Como Funciona

### Participante
1. Cadastra conta → Entra no app
2. Clica em "Participar" na rodada ativa → Cartela 5×5 é gerada
3. Vai em "Tabelas" → Vê sua cartela
4. Conforme o admin sorteia números, clica nos números da cartela para marcar
5. Quando cartela completa → Clica em "BINGO!"

### Admin
1. Acessa o painel Admin
2. Cria nova rodada
3. Clica "Start" para sortear automaticamente (1 número a cada 3 segundos)
4. Pode pausar e retomar a qualquer momento
5. Também pode sortear manualmente com "Sortear 1"
6. Acompanha vencedores com timestamp exato (HH:MM:SS.mmm)

## Decisões Técnicas

- **Sem Realtime** — usa polling a cada 3-5 segundos. Muito mais estável, sem bugs de desconexão ao trocar de aba.
- **Marcação manual** — participante precisa clicar nos números. Só marca números já sorteados.
- **BINGO por cartela cheia** — botão só habilita com todos 24 números marcados.
- **Timestamp com milissegundos** — desempate justo nos 5 primeiros colocados.
