// Core domain types for the Business OS global state object.

export type Maquininha = {
  debito: number;
  credito1: number;
  credito2: number;
  credito3: number;
  credito4: number;
  credito5: number;
  credito6: number;
  credito7: number;
  credito8: number;
  credito9: number;
  credito10: number;
  credito11: number;
  credito12: number;
};

export type Cfg = {
  empresa: string;
  sub: string;
  cnpj: string;
  tel: string;
  cidade: string;
  metaMensal: number;
  metaSemanal: number;
  metaAnual: number;
  impostoMEI: number;
  impostoNF: number;
  deslBase: number;
  deslKmExtra: number;
  urgencial: number;
  maquininha: Maquininha;
};

export type Service = {
  id: string;
  nome: string;
  cat: string;
  tipo: string; // Técnico / Instalação / Consultoria / Preventiva
  minVal: number;
  medVal: number;
  maxVal: number;
  material: number;
  mdo: number;
  tempo: string;
  dific: string; // Fácil / Médio / Difícil / Especialista
  margem: number;
};

export type Orcamento = {
  id: string;
  cliente: string;
  tel: string;
  end: string;
  tipo: string;
  data: string;
  valor: number;
  status: string; // Aguardando / Aprovado / Recusado / Faturado
  lucro: number;
  tempo: string;
  itens: { nome: string; qtd: number; valor: number }[];
  obs: string;
};

export type ClienteHistorico = { data: string; texto: string };
export type Cliente = {
  id: string;
  nome: string;
  tel: string;
  end: string;
  email: string;
  tipo: string; // VIP / Recorrente / Novo / Inadimplente
  origem: string;
  servicos: string;
  gasto: number;
  nps: number; // 1-5
  depoimento: string;
  followupData: string;
  followupStatus: string; // Pendente / Concluído / Atrasado
  equipamentos: string[];
  contratos: string[];
  historico: ClienteHistorico[];
  obs: string;
};

export type Lead = {
  id: string;
  nome: string;
  tel: string;
  interesse: string;
  origem: string;
  status: string; // Primeiro contato / Negociando / Proposta enviada / Fechado Ganho / Fechado Perdido
  valorEst: number;
  obs: string;
  data: string;
};

export type OsHistorico = { data: string; texto: string };

export type OsMensagem = {
  id: string;
  autor: "cliente" | "tecnico" | "sistema";
  nome: string;
  texto: string;
  data: string; // ISO string with time
  lida: boolean;
};

export type OrdemServico = {
  id: string;
  numero: string;
  cliente: string;
  tel: string;
  emailCliente: string;
  endereco: string;
  equipamento: string;
  marca: string;
  modelo: string;
  tipo: string;
  prioridade: string; // Normal / Alta / Urgente
  problema: string;
  diagnostico: string;
  solucao: string;
  pecas: string;
  status: string;
  valor: number;
  data: string;
  prazo: string;
  obs: string;
  origem: string; // interno / cliente
  criadaEm: string;
  fotos: string[];
  historico: OsHistorico[];
  // Portal do cliente
  tokenAcesso?: string; // token público para acompanhar OS
  notifyWhatsApp?: boolean;
  notifyEmail?: boolean;
  mensagens?: OsMensagem[];
  // Garantia vinculada
  garantiaDias?: number;
  garantiaInicio?: string;
};

export type Garantia = {
  id: string;
  cliente: string;
  servico: string;
  dataServico: string;
  diasGarantia: number;
  obs: string;
};

export type Estoque = {
  id: string;
  nome: string;
  cat: string;
  qtd: number;
  qtdMin: number;
  unidade: string;
  custo: number;
  local: string;
  fornecedor: string;
  obs: string;
};

export type MovEstoque = {
  data: string;
  item: string;
  tipo: string; // Entrada / Saída
  qtd: number;
  unidade: string;
  obs: string;
};

export type Agenda = {
  id: string;
  dia: string; // YYYY-MM-DD
  titulo: string;
  hora: string;
  status: string; // Confirmado / Aguardando
  tipo: string; // Serviço / Instalação / Orçamento / Comercial / Pessoal
  obs: string;
};

export type Gasto = { id: string; desc: string; valor: number; data: string; cat: string };
export type RecExtra = { id: string; desc: string; valor: number; data: string; cat: string };

export type CheckItem = { id: string; texto: string; ok: boolean };
export type Nota = {
  id: string;
  titulo: string;
  texto: string;
  cor: string;
  fixada: boolean;
  data: string;
  checklist: CheckItem[];
};

export type State = {
  cfg: Cfg;
  categorias: string[];
  services: Service[];
  orc: Orcamento[];
  clientes: Cliente[];
  leads: Lead[];
  os: OrdemServico[];
  garantias: Garantia[];
  estoque: Estoque[];
  movEstoque: MovEstoque[];
  agenda: Agenda[];
  gastos: Gasto[];
  recExtras: RecExtra[];
  notas: Nota[];

  nextOrc: number;
  nextOS: number;
  nextCli: number;
  nextAg: number;
  nextLead: number;
  nextGar: number;
  nextNota: number;
  nextRecExtra: number;
  nextGasto: number;
  nextEst: number;

  // UI state (not persisted server-side)
  page: string;
  crmTab: string;
  estTab: string;
  finTab: string;
  osTab: string;
  srvQ: string;
  srvCat: string;
  orcQ: string;
  cliQ: string;
  estQ: string;
  leadQ: string;
  osQ: string;
  calcItems: { id: string; serviceId: string; qtd: number }[];
  calcMode: string; // min / med / max
  calcDesc: number;
  calcUrg: number;
  calcDesl: number;
  calcCom: number;
};

// OS status flow
export const OS_STATUSES = [
  "Aberta",
  "Diagnóstico",
  "Em Execução",
  "Aguardando Peça",
  "Concluída",
  "Entregue",
  "Cancelada",
];

export const OS_STATUS_FLOW: Record<string, string> = {
  Aberta: "Diagnóstico",
  Diagnóstico: "Em Execução",
  "Em Execução": "Concluída",
  "Aguardando Peça": "Em Execução",
  Concluída: "Entregue",
  Entregue: "Entregue",
  Cancelada: "Cancelada",
};
