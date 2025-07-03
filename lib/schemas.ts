import { z } from "zod";
import { Timestamp } from "firebase/firestore";

// Helper para pré-processar datas, aceitando Date ou Timestamp do Firebase
const dateSchema = z.preprocess((arg) => {
  if (arg instanceof Date) return arg;
  if (arg instanceof Timestamp) return arg.toDate();
  return arg; // Deixa o Zod lidar com outros tipos inválidos
}, z.date({ required_error: "A data é obrigatória." }));

// =================================================================
// Schemas de Autenticação e Permissões
// =================================================================

export const loginSchema = z.object({
  email: z.string().trim().email("Por favor, insira um e-mail válido."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});

const acoesPermissaoSchema = z.object({
  ler: z.boolean().default(false),
  criar: z.boolean().default(false),
  editar: z.boolean().default(false),
  inativar: z.boolean().default(false),
});

export const modulosDePermissao = {
    dashboard: "Dashboard",
    clientes: "Clientes",
    fornecedores: "Fornecedores",
    produtos: "Produtos",
    funcionarios: "Funcionários",
    cargos: "Cargos",
    categorias: "Categorias",
    unidades: "Unidades de Medida",
    usuarios: "Usuários do Sistema",
    permissoes: "Funções e Permissões",
    compras: "Compras",
    abates: "Abates",
    producao: "Produção",
    vendas: "Vendas",
    estoque: "Ajuste de Estoque",
    financeiro: "Financeiro (Geral)",
    relatorios: "Relatórios",
    metas: "Metas",
    settings: "Configurações da Empresa"
};

const permissoesSchema = z.object(
  Object.keys(modulosDePermissao).reduce((acc, key) => {
    acc[key] = acoesPermissaoSchema.optional();
    return acc;
  }, {} as Record<string, z.ZodOptional<typeof acoesPermissaoSchema>>)
);

export const roleSchema = z.object({
  id: z.string().optional(),
  nome: z.string().trim().min(3, "O nome da função é obrigatório."),
  descricao: z.string().trim().optional(),
  permissoes: permissoesSchema.default({}),
  status: z.enum(['ativo', 'inativo']).default('ativo').optional(),
});

export const userSchema = z.object({
  uid: z.string(),
  displayName: z.string().trim().min(1, "O nome de exibição é obrigatório."),
  email: z.string().trim().email(),
  roleId: z.string().optional(),
  isSuperAdmin: z.boolean().default(false).optional(),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres.").optional().or(z.literal('')),
  status: z.enum(['ativo', 'inativo']).default('ativo').optional(),
});

// =================================================================
// Schemas de Cadastros Base
// =================================================================

export const enderecoSchema = z.object({
  logradouro: z.string().trim().min(1, "O logradouro é obrigatório."),
  numero: z.string().trim().min(1, "O número é obrigatório."),
  bairro: z.string().trim().min(1, "O bairro é obrigatório."),
  cidade: z.string().trim().min(1, "A cidade é obrigatória."),
  uf: z.string().trim().length(2, "UF deve ter 2 caracteres."),
  cep: z.string().trim().min(8, "O CEP é obrigatório."),
  complemento: z.string().trim().optional(),
  pais: z.string().default("Brasil"),
  codigoPais: z.string().default("1058"),
});

const dadosBancariosSchema = z.object({
  banco: z.string().trim().min(1, "O nome do banco é obrigatório."),
  agencia: z.string().trim().min(1, "A agência é obrigatória."),
  conta: z.string().trim().min(1, "A conta é obrigatória."),
  pix: z.string().trim().optional().or(z.literal("")),
});

const baseSchema = z.object({
    id: z.string().optional(),
    createdAt: z.any().optional(), // Mantido como 'any' para flexibilidade com serverTimestamp
    status: z.enum(['ativo', 'inativo']).default('ativo').optional(),
});

export const cargoSchema = baseSchema.extend({
  nome: z.string().trim().min(3, "O nome do cargo é obrigatório."),
});

export const unidadeSchema = baseSchema.extend({
  nome: z.string().trim().min(1, 'O nome da unidade é obrigatório.'),
  sigla: z.string().trim().min(1, 'A sigla é obrigatória.').max(10),
});

export const categoriaSchema = baseSchema.extend({
  nome: z.string().trim().min(1, 'O nome da categoria é obrigatório.'),
});

// =================================================================
// Schemas de Entidades (Clientes, Fornecedores, etc.)
// =================================================================

export const IndicadorIEDestinatario = z.enum(["1", "2", "9"]);

export const clienteSchema = baseSchema.extend({
  nome: z.string().trim().min(3, "O nome deve ter pelo menos 3 caracteres."),
  tipoPessoa: z.enum(["fisica", "juridica"], { required_error: "Selecione o tipo de pessoa." }),
  documento: z.string().trim().min(11, "O CPF/CNPJ é obrigatório."),
  inscricaoEstadual: z.string().trim().optional().or(z.literal("")),
  indicadorInscricaoEstadual: IndicadorIEDestinatario.default("9"),
  telefone: z.string().trim().min(10, "O telefone é obrigatório."),
  email: z.string().trim().email("O e-mail é obrigatório e deve ser válido."),
  endereco: enderecoSchema,
});

export const fornecedorSchema = baseSchema.extend({
  razaoSocial: z.string().trim().min(3, "A Razão Social é obrigatória."),
  cnpj: z.string().trim().length(18, "O CNPJ deve ter 14 dígitos."),
  contato: z.string().trim().min(10, "O telefone de contato é obrigatório."),
  endereco: enderecoSchema,
  dadosBancarios: dadosBancariosSchema,
});

export const funcionarioSchema = baseSchema.extend({
  razaoSocial: z.string().trim().min(3, "A Razão Social é obrigatória."),
  cnpj: z.string().trim().length(18, "O CNPJ deve ter 14 dígitos."),
  nomeCompleto: z.string().trim().min(3, "O nome completo é obrigatório."),
  cpf: z.string().trim().length(14, "O CPF deve ter 11 dígitos."),
  contato: z.string().trim().min(10, "O telefone de contato é obrigatório."),
  cargoId: z.string({ required_error: "O cargo é obrigatório." }).min(1, "O cargo é obrigatório."),
  banco: z.string().trim().min(1, "O banco é obrigatório."),
  agencia: z.string().trim().min(1, "A agência é obrigatória."),
  conta: z.string().trim().min(1, "A conta é obrigatória."),
});

// =================================================================
// Schemas de Produtos e Metas
// =================================================================

const baseProdutoSchema = baseSchema.extend({
  quantidade: z.coerce.number().default(0),
  custoUnitario: z.coerce.number().min(0, "O custo não pode ser negativo.").default(0),
});

export const produtoVendaSchema = baseProdutoSchema.extend({
  tipoProduto: z.literal("VENDA"),
  nome: z.string().trim().min(3, "A descrição do produto é obrigatória."),
  unidadeId: z.string({ required_error: "Selecione uma unidade." }).min(1, "Selecione uma unidade."),
  precoVenda: z.coerce.number().positive("O preço de venda deve ser positivo."),
  sku: z.string().trim().optional().or(z.literal("")),
  ncm: z.string().trim().min(8, "NCM é obrigatório e deve ter 8 dígitos.").max(8),
  cfop: z.string().trim().min(4, "CFOP é obrigatório e deve ter 4 dígitos.").max(4),
  cest: z.string().trim().optional().or(z.literal("")),
});

export const produtoUsoInternoSchema = baseProdutoSchema.extend({
  tipoProduto: z.literal("USO_INTERNO"),
  nome: z.string().trim().min(3, "A descrição do item é obrigatória."),
  categoriaId: z.string({ required_error: "Selecione uma categoria." }).min(1, "Selecione uma categoria."),
});

export const produtoMateriaPrimaSchema = baseProdutoSchema.extend({
  tipoProduto: z.literal("MATERIA_PRIMA"),
  nome: z.string().trim().min(3, "O nome da matéria-prima é obrigatório."),
  unidadeId: z.string({ required_error: "Selecione uma unidade." }),
});

export const produtoSchema = z.discriminatedUnion("tipoProduto", [
  produtoVendaSchema,
  produtoUsoInternoSchema,
  produtoMateriaPrimaSchema,
]);

export const metaSchema = baseSchema.extend({
  produtoId: z.string({ required_error: "Selecione um produto." }).min(1, "Selecione um produto."),
  metaPorAnimal: z.coerce.number().positive("A meta deve ser um número positivo."),
});


// =================================================================
// Schemas de Transações e Operações
// =================================================================

const itemCompradoSchema = z.object({
  produtoId: z.string().min(1, "Selecione um produto."),
  produtoNome: z.string(),
  quantidade: z.coerce.number().positive("A quantidade deve ser positiva."),
  custoUnitario: z.coerce.number().min(0, "O custo não pode ser negativo."),
});

export const compraSchema = baseSchema.extend({
  fornecedorId: z.string().min(1, "Selecione um fornecedor."),
  notaFiscal: z.string().trim().min(1, "O número da nota fiscal é obrigatório."),
  data: dateSchema,
  itens: z.array(itemCompradoSchema).min(1, "Adicione pelo menos um item."),
  valorTotal: z.coerce.number(),
  contaBancariaId: z.string().min(1, "A conta de origem é obrigatória."),
  condicaoPagamento: z.enum(["A_VISTA", "A_PRAZO"]),
  numeroParcelas: z.coerce.number().min(1).optional(),
  dataPrimeiroVencimento: dateSchema.optional(),
}).refine(data => data.condicaoPagamento === 'A_VISTA' || (!!data.numeroParcelas && !!data.dataPrimeiroVencimento), {
    message: "Para pagamentos a prazo, o número de parcelas e a data do primeiro vencimento são obrigatórios.",
    path: ["numeroParcelas"],
});

export const abateSchema = baseSchema.extend({
  data: dateSchema,
  total: z.coerce.number().positive("O total de animais deve ser maior que zero."),
  condenado: z.coerce.number().min(0, "A quantidade de condenados não pode ser negativa."),
  responsavelId: z.string().min(1, "O responsável pelo abate é obrigatório."),
  compraId: z.string().min(1, "É obrigatório vincular o abate a uma compra."),
  registradoPor: z.object({
      uid: z.string(),
      nome: z.string().nullable(),
      role: z.string().optional()
  }),
});

export const itemProduzidoSchema = z.object({
  produtoId: z.string().min(1, "Selecione um produto."),
  produtoNome: z.string(),
  quantidade: z.coerce.number().positive("A quantidade produzida deve ser positiva."),
  perda: z.coerce.number().min(0, "A perda não pode ser negativa.").default(0),
});

export const producaoSchema = baseSchema.extend({
  data: dateSchema,
  responsavelId: z.string().min(1, "Selecione um responsável."),
  abateId: z.string().min(1, "Selecione um abate para vincular."),
  lote: z.string().trim().optional(),
  descricao: z.string().trim().optional(),
  produtos: z.array(itemProduzidoSchema).min(1, "Adicione pelo menos um produto."),
  registradoPor: z.object({ uid: z.string(), nome: z.string().nullable(), role: z.string().optional() }),
});

export const producaoFormSchema = producaoSchema.pick({ data: true, responsavelId: true, abateId: true, lote: true, descricao: true, produtos: true });

export const itemVendidoSchema = z.object({
  produtoId: z.string(),
  produtoNome: z.string(),
  quantidade: z.coerce.number().positive(),
  precoUnitario: z.coerce.number().positive(),
  custoUnitario: z.coerce.number().min(0),
});

export const vendaSchema = baseSchema.extend({
  clienteId: z.string().min(1, "Selecione um cliente."),
  data: dateSchema,
  produtos: z.array(itemVendidoSchema).min(1, "Adicione pelo menos um produto."),
  valorTotal: z.coerce.number().positive(),
  condicaoPagamento: z.enum(["A_VISTA", "A_PRAZO"]),
  metodoPagamento: z.string().min(1, "O método de pagamento é obrigatório."),
  contaBancariaId: z.string().optional(),
  numeroParcelas: z.coerce.number().optional(),
  taxaCartao: z.coerce.number().optional(),
  valorFinal: z.number().optional(),
  dataVencimento: dateSchema.optional(),
  registradoPor: z.object({ uid: z.string(), nome: z.string() }),
  nfe: z.object({
    id: z.string().optional(),
    status: z.string().optional(),
    url: z.string().optional(),
  }).nullable().optional(),
});

// =================================================================
// Schemas Financeiros e de Configuração
// =================================================================

export const movimentacaoSchema = baseSchema.extend({
  produtoId: z.string().min(1, "Selecione um produto."),
  produtoNome: z.string(),
  quantidade: z.number().positive("A quantidade deve ser maior que zero."),
  tipo: z.enum(["entrada", "saida"]),
  motivo: z.string().trim().optional(),
  data: z.any().optional(),
  registradoPor: z.object({
      uid: z.string(),
      nome: z.string().nullable()
  }).optional(),
});

export const contaBancariaSchema = baseSchema.extend({
  nomeConta: z.string().trim().min(3, "O nome da conta é obrigatório."),
  banco: z.string().trim().min(2, "O nome do banco é obrigatório."),
  agencia: z.string().trim().optional(),
  conta: z.string().trim().optional(),
  tipo: z.enum(["Conta Corrente", "Conta Poupança", "Caixa"]),
  saldoInicial: z.coerce.number().default(0),
  saldoAtual: z.coerce.number().default(0),
  registradoPor: z.object({ uid: z.string(), nome: z.string() }).optional(),
}).omit({ status: true }).extend({
    status: z.enum(['ativa', 'inativa']).default('ativa').optional(),
});

export const contaAReceberSchema = baseSchema.extend({
  vendaId: z.string(),
  clienteId: z.string(),
  clienteNome: z.string(),
  valor: z.number().positive(),
  dataEmissao: dateSchema,
  dataVencimento: dateSchema,
}).omit({ status: true }).extend({
    status: z.enum(['Pendente', 'Recebida']),
});


export const despesaOperacionalSchema = baseSchema.extend({
  descricao: z.string().trim().min(3, "A descrição é obrigatória."),
  valor: z.coerce.number().positive("O valor deve ser positivo."),
  dataVencimento: dateSchema,
  categoria: z.string().trim().min(3, "A categoria é obrigatória."),
  contaBancariaId: z.string().min(1, "Selecione a conta para débito."),
}).omit({ status: true }).extend({
    status: z.enum(['Pendente', 'Paga']),
});

export const companyInfoSchema = z.object({
  razaoSocial: z.string().trim().min(3, "A Razão Social é obrigatória."),
  nomeFantasia: z.string().trim().min(3, "O nome fantasia é obrigatório."),
  cnpj: z.string().trim().length(18, "O CNPJ deve ter 14 dígitos."),
  inscricaoEstadual: z.string().trim().min(1, "A Inscrição Estadual é obrigatória."),
  endereco: enderecoSchema,
  telefone: z.string().trim().min(10, "O telefone é obrigatório."),
  email: z.string().trim().email("Insira um e-mail válido."),
  regimeTributario: z.enum(["1", "3"], { required_error: "Selecione o regime." }).default("3"),
  configuracaoFiscal: z.object({
    cfop_padrao: z.string().length(4).default("5101"),
    cst_padrao: z.string().min(2).default("40"),
    aliquota_icms_padrao: z.coerce.number().min(0).default(0),
    reducao_bc_padrao: z.coerce.number().min(0).default(0),
    informacoes_complementares: z.string().trim().optional().default(""),
  }).default({}),
});

// =================================================================
// Exportação de Tipos
// =================================================================

export type LoginValues = z.infer<typeof loginSchema>;
export type SystemUser = z.infer<typeof userSchema> & { role?: Role };
export type Role = z.infer<typeof roleSchema>;
export type Cliente = z.infer<typeof clienteSchema>;
export type Fornecedor = z.infer<typeof fornecedorSchema>;
export type Cargo = z.infer<typeof cargoSchema>;
export type Funcionario = z.infer<typeof funcionarioSchema> & { cargoNome?: string };
export type Unidade = z.infer<typeof unidadeSchema>;
export type Categoria = z.infer<typeof categoriaSchema>;
export type Produto = z.infer<typeof produtoSchema> & { unidadeNome?: string; categoriaNome?: string };
export type ProdutoVenda = z.infer<typeof produtoVendaSchema>;
export type ProdutoUsoInterno = z.infer<typeof produtoUsoInternoSchema>;
export type ProdutoMateriaPrima = z.infer<typeof produtoMateriaPrimaSchema>;
export type Meta = z.infer<typeof metaSchema> & { produtoNome?: string, unidade?: string };
export type Compra = z.infer<typeof compraSchema>;
export type Abate = z.infer<typeof abateSchema>;
export type Producao = z.infer<typeof producaoSchema>;
export type ProducaoFormValues = z.infer<typeof producaoFormSchema>;
export type ItemVendido = z.infer<typeof itemVendidoSchema>;
export type Venda = z.infer<typeof vendaSchema>;
export type Movimentacao = z.infer<typeof movimentacaoSchema>;
export type ContaBancaria = z.infer<typeof contaBancariaSchema>;
export type ContaAReceber = z.infer<typeof contaAReceberSchema>;
export type DespesaOperacional = z.infer<typeof despesaOperacionalSchema>;
export type CompanyInfo = z.infer<typeof companyInfoSchema>;
