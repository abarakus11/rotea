export type Perfil = "Administrador" | "Supervisor" | "Atendente";
export type Setor = "Comercial" | "Tecnologia/Suporte" | "Atendimento" | "Jurídico";
export type StatusChat = "bot" | "fila" | "andamento" | "encerrado" | "abandonado";

export interface Usuario {
  id: string; nome: string; perfil: Perfil; setor: Setor | null;
  online: boolean; atendimentosHoje: number; tmaMin: number; nota: number;
}
export interface Msg {
  id: string; de: "cliente" | "bot" | "atendente" | "sistema";
  texto: string; hora: string;
}
export interface Chat {
  id: string; cliente: string; telefone: string; origem: string;
  empresa?: string;
  aoVivo?: boolean;
  setor: Setor | null; atendente: string | null; status: StatusChat;
  etiquetas: string[]; notas: string[]; msgs: Msg[];
  inicio: string; espera: number; naoLidas: number;
}
export interface NoFluxo {
  id: string; tipo: "pergunta" | "regra";
  titulo: string; conteudo: string; destino?: Setor;
  palavrasChave?: string[];
}

export const SETORES: Setor[] = ["Comercial", "Tecnologia/Suporte", "Atendimento", "Jurídico"];

export const EMPRESAS = ["RWB", "LIV ECO HABITATS", "IPROTECTOR", "LEGALCERT", "SINATRA", "ANIMA", "SCAN ATIVOS"] as const;
export type Empresa = (typeof EMPRESAS)[number];

export const CORES_SETOR: Record<Setor, string> = {
  "Comercial": "#1FA860",
  "Tecnologia/Suporte": "#2E7CD6",
  "Atendimento": "#E19A2E",
  "Jurídico": "#8A5CC8",
};

export const CORES_EMPRESA: Record<Empresa, string> = {
  "RWB": "#0B6E4F",
  "LIV ECO HABITATS": "#5B8C2A",
  "IPROTECTOR": "#1F6FEB",
  "LEGALCERT": "#C45C26",
  "SINATRA": "#7A3E9D",
  "ANIMA": "#C6284A",
  "SCAN ATIVOS": "#0F4C81",
};

export const ETIQUETAS_DISPONIVEIS = [
  "Lead quente", "Orçamento", "2ª via boleto", "Bug crítico", "Contrato",
  "Reclamação", "Upgrade", "Cancelamento", "Dúvida geral", "VIP",
  ...EMPRESAS,
];

export const USUARIOS: Usuario[] = [
  { id: "u1", nome: "Carlos Eber", perfil: "Administrador", setor: null, online: true, atendimentosHoje: 8, tmaMin: 9, nota: 4.8 },
  { id: "u2", nome: "Emilly Dantas", perfil: "Administrador", setor: null, online: true, atendimentosHoje: 11, tmaMin: 7, nota: 4.9 },
  { id: "u3", nome: "Geovane Oliveira", perfil: "Administrador", setor: null, online: true, atendimentosHoje: 6, tmaMin: 10, nota: 4.7 },
];

export const FLUXO_INICIAL: NoFluxo[] = [
  { id: "n1", tipo: "pergunta", titulo: "Boas-vindas", conteudo: "Olá! 👋 Bem-vindo(a). Sou o assistente virtual. Para começar, qual o seu nome?" },
  { id: "n2", tipo: "pergunta", titulo: "Empresa de interesse", conteudo: "Sobre qual empresa você gostaria de falar?\n\n• RWB\n• LIV ECO HABITATS\n• IPROTECTOR\n• LEGALCERT\n• SINATRA\n• ANIMA\n• SCAN ATIVOS" },
  { id: "n3", tipo: "pergunta", titulo: "Identificação do assunto", conteudo: "Certo, {nome}! Em poucas palavras, como podemos ajudar você hoje?" },
  { id: "n4", tipo: "pergunta", titulo: "Qualificação", conteudo: "Entendi. Você já é cliente ou este é o seu primeiro contato conosco?" },
  { id: "r1", tipo: "regra", titulo: "Rota Comercial", conteudo: "Intenção de compra, orçamento ou proposta", destino: "Comercial", palavrasChave: ["comprar", "preço", "orçamento", "plano", "proposta", "contratar"] },
  { id: "r2", tipo: "regra", titulo: "Rota Suporte", conteudo: "Problemas técnicos, erros e instabilidade", destino: "Tecnologia/Suporte", palavrasChave: ["erro", "bug", "não funciona", "travando", "senha", "acesso"] },
  { id: "r3", tipo: "regra", titulo: "Rota Jurídico", conteudo: "Contratos, cláusulas e questões legais", destino: "Jurídico", palavrasChave: ["contrato", "cláusula", "processo", "rescisão", "jurídico"] },
  { id: "r4", tipo: "regra", titulo: "Rota padrão", conteudo: "Demais assuntos e dúvidas gerais", destino: "Atendimento", palavrasChave: ["*"] },
];

const h = (s: string) => s;
export const CHATS_INICIAIS: Chat[] = [
  {
    id: "c1", cliente: "Marcos Vieira", telefone: "+55 11 98877-1020", origem: "Meta Ads — Campanha PRO", empresa: "LEGALCERT",
    setor: "Comercial", atendente: "Emilly Dantas", status: "andamento",
    etiquetas: ["Lead quente", "Orçamento", "LEGALCERT"], notas: ["Pediu proposta para 3 unidades. Decisor direto."],
    inicio: h("09:42"), espera: 2, naoLidas: 1,
    msgs: [
      { id: "m1", de: "bot", texto: "Olá! 👋 Bem-vindo(a). Sou o assistente virtual. Para começar, qual o seu nome?", hora: "09:42" },
      { id: "m2", de: "cliente", texto: "Marcos Vieira", hora: "09:42" },
      { id: "m3", de: "bot", texto: "Sobre qual empresa você gostaria de falar?\n\n• RWB\n• LIV ECO HABITATS\n• IPROTECTOR\n• LEGALCERT\n• SINATRA\n• ANIMA", hora: "09:42" },
      { id: "m4", de: "cliente", texto: "LegalCert", hora: "09:43" },
      { id: "m5", de: "bot", texto: "Certo, Marcos! Em poucas palavras, como podemos ajudar você hoje?", hora: "09:43" },
      { id: "m6", de: "cliente", texto: "Quero um orçamento do plano empresarial", hora: "09:43" },
      { id: "m7", de: "sistema", texto: "Regra \"Rota Comercial\" aplicada · encaminhado para fila Comercial", hora: "09:43" },
      { id: "m8", de: "sistema", texto: "Emilly Dantas assumiu o atendimento", hora: "09:45" },
      { id: "m9", de: "atendente", texto: "Olá, Marcos! Aqui é a Emilly, do Comercial. Vou montar seu orçamento agora. Quantas unidades você precisa?", hora: "09:45" },
      { id: "m10", de: "cliente", texto: "Três unidades. Consegue enviar ainda hoje?", hora: "09:47" },
    ],
  },
  {
    id: "c2", cliente: "Renata Souza", telefone: "+55 21 97711-3355", origem: "Meta Ads — Remarketing", empresa: "IPROTECTOR",
    setor: "Tecnologia/Suporte", atendente: "Carlos Eber", status: "andamento",
    etiquetas: ["Bug crítico", "IPROTECTOR"], notas: [],
    inicio: h("10:05"), espera: 4, naoLidas: 0,
    msgs: [
      { id: "m1", de: "bot", texto: "Olá! 👋 Bem-vindo(a). Sou o assistente virtual. Para começar, qual o seu nome?", hora: "10:05" },
      { id: "m2", de: "cliente", texto: "Renata", hora: "10:05" },
      { id: "m3", de: "bot", texto: "Sobre qual empresa você gostaria de falar?\n\n• RWB\n• LIV ECO HABITATS\n• IPROTECTOR\n• LEGALCERT\n• SINATRA\n• ANIMA", hora: "10:05" },
      { id: "m4", de: "cliente", texto: "IProtector", hora: "10:06" },
      { id: "m5", de: "bot", texto: "Certo, Renata! Em poucas palavras, como podemos ajudar você hoje?", hora: "10:06" },
      { id: "m6", de: "cliente", texto: "O sistema está travando quando gero relatório", hora: "10:06" },
      { id: "m7", de: "sistema", texto: "Regra \"Rota Suporte\" aplicada · encaminhado para fila Tecnologia/Suporte", hora: "10:06" },
      { id: "m8", de: "sistema", texto: "Carlos Eber assumiu o atendimento", hora: "10:09" },
      { id: "m9", de: "atendente", texto: "Oi, Renata! Sinto muito pelo transtorno. Pode me dizer qual relatório e o horário aproximado do erro?", hora: "10:09" },
    ],
  },
  {
    id: "c3", cliente: "Grupo Almeida Ltda", telefone: "+55 31 99640-8874", origem: "Site institucional", empresa: "RWB",
    setor: "Jurídico", atendente: null, status: "fila",
    etiquetas: ["Contrato", "RWB"], notas: [],
    inicio: h("10:31"), espera: 9, naoLidas: 3,
    msgs: [
      { id: "m1", de: "bot", texto: "Olá! 👋 Bem-vindo(a). Sou o assistente virtual. Para começar, qual o seu nome?", hora: "10:31" },
      { id: "m2", de: "cliente", texto: "Departamento de compras — Grupo Almeida", hora: "10:31" },
      { id: "m3", de: "bot", texto: "Sobre qual empresa você gostaria de falar?\n\n• RWB\n• LIV ECO HABITATS\n• IPROTECTOR\n• LEGALCERT\n• SINATRA\n• ANIMA", hora: "10:31" },
      { id: "m4", de: "cliente", texto: "RWB", hora: "10:32" },
      { id: "m5", de: "bot", texto: "Certo! Em poucas palavras, como podemos ajudar você hoje?", hora: "10:32" },
      { id: "m6", de: "cliente", texto: "Precisamos revisar a cláusula de rescisão do contrato", hora: "10:32" },
      { id: "m7", de: "sistema", texto: "Regra \"Rota Jurídico\" aplicada · aguardando atendente na fila Jurídico", hora: "10:32" },
    ],
  },
  {
    id: "c4", cliente: "Tiago Prado", telefone: "+55 11 96122-0047", origem: "Meta Ads — Campanha PRO", empresa: "ANIMA",
    setor: "Atendimento", atendente: "Geovane Oliveira", status: "encerrado",
    etiquetas: ["2ª via boleto", "ANIMA"], notas: ["Resolvido em primeira interação."],
    inicio: h("08:57"), espera: 1, naoLidas: 0,
    msgs: [
      { id: "m1", de: "bot", texto: "Olá! 👋 Bem-vindo(a). Como podemos ajudar?", hora: "08:57" },
      { id: "m2", de: "cliente", texto: "Preciso da segunda via do boleto da ANIMA", hora: "08:58" },
      { id: "m3", de: "sistema", texto: "Rota padrão aplicada · fila Atendimento", hora: "08:58" },
      { id: "m4", de: "atendente", texto: "Bom dia, Tiago! Segue a 2ª via em PDF. Vencimento atualizado para 12/08. 📎 boleto_ago.pdf", hora: "09:01" },
      { id: "m5", de: "cliente", texto: "Perfeito, obrigado!", hora: "09:02" },
      { id: "m6", de: "sistema", texto: "Atendimento encerrado por Geovane Oliveira · TMA 05:12", hora: "09:03" },
    ],
  },
  {
    id: "c5", cliente: "Luciana Braga", telefone: "+55 41 98800-1123", origem: "Meta Ads — Remarketing",
    setor: "Comercial", atendente: null, status: "abandonado",
    etiquetas: [], notas: [],
    inicio: h("07:44"), espera: 32, naoLidas: 0,
    msgs: [
      { id: "m1", de: "bot", texto: "Olá! 👋 Bem-vindo(a). Sou o assistente virtual. Para começar, qual o seu nome?", hora: "07:44" },
      { id: "m2", de: "cliente", texto: "Luciana", hora: "07:45" },
      { id: "m3", de: "bot", texto: "Sobre qual empresa você gostaria de falar?\n\n• RWB\n• LIV ECO HABITATS\n• IPROTECTOR\n• LEGALCERT\n• SINATRA\n• ANIMA", hora: "07:45" },
      { id: "m4", de: "sistema", texto: "Cliente inativo por 30 min · atendimento marcado como abandonado", hora: "08:15" },
    ],
  },
];

export const SERIE_SEMANA = [
  { dia: "Qui 30", leads: 84, convertidos: 31 },
  { dia: "Sex 31", leads: 96, convertidos: 38 },
  { dia: "Sáb 01", leads: 52, convertidos: 17 },
  { dia: "Dom 02", leads: 38, convertidos: 11 },
  { dia: "Seg 03", leads: 112, convertidos: 47 },
  { dia: "Ter 04", leads: 127, convertidos: 54 },
  { dia: "Qua 05", leads: 73, convertidos: 29 },
];

export const HORARIOS_PICO = [
  { h: "08h", v: 22 }, { h: "09h", v: 41 }, { h: "10h", v: 58 }, { h: "11h", v: 49 },
  { h: "12h", v: 27 }, { h: "13h", v: 31 }, { h: "14h", v: 52 }, { h: "15h", v: 61 },
  { h: "16h", v: 44 }, { h: "17h", v: 38 }, { h: "18h", v: 25 }, { h: "19h", v: 12 },
];

export const FUNIL = [
  { etapa: "Leads recebidos", valor: 582 },
  { etapa: "Triados pelo bot", valor: 547 },
  { etapa: "Atendidos por humano", valor: 468 },
  { etapa: "Proposta / resolução", valor: 291 },
  { etapa: "Convertidos", valor: 227 },
];

export const VOLUME_ORIGEM = [
  { origem: "Meta Ads — Campanha PRO", v: 246 },
  { origem: "Meta Ads — Remarketing", v: 171 },
  { origem: "Site institucional", v: 98 },
  { origem: "Indicação / orgânico", v: 67 },
];

export const RANKING_SETOR = [
  { setor: "Atendimento", atendimentos: 203, sla: 97 },
  { setor: "Comercial", atendimentos: 188, sla: 94 },
  { setor: "Tecnologia/Suporte", atendimentos: 121, sla: 89 },
  { setor: "Jurídico", atendimentos: 70, sla: 92 },
];

export const LEADS_SIMULAVEIS = [
  { nome: "Beatriz Camargo", telefone: "+55 11 97455-2201", origem: "Meta Ads — Campanha PRO", empresa: "LEGALCERT", assunto: "Quero contratar o plano anual, qual o preço?", setor: "Comercial" as Setor },
  { nome: "Otávio Ramos", telefone: "+55 19 98122-7743", origem: "Meta Ads — Remarketing", empresa: "IPROTECTOR", assunto: "Está dando erro de acesso na minha conta", setor: "Tecnologia/Suporte" as Setor },
  { nome: "Vanessa Duarte", telefone: "+55 51 99310-5580", origem: "Site institucional", empresa: "RWB", assunto: "Preciso discutir a rescisão do contrato", setor: "Jurídico" as Setor },
  { nome: "Henrique Sales", telefone: "+55 62 98474-9911", origem: "Indicação / orgânico", empresa: "ANIMA", assunto: "Tenho uma dúvida sobre a fatura deste mês", setor: "Atendimento" as Setor },
];

export const agora = () =>
  new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export const uid = () => Math.random().toString(36).slice(2, 9);
