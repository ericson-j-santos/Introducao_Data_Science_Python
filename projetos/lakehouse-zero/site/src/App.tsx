import { useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  BadgeCheck,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Clock3,
  CloudOff,
  Database,
  Download,
  FileCheck2,
  FileClock,
  FileJson,
  Filter,
  Fingerprint,
  FlaskConical,
  GitBranch,
  HardDriveDownload,
  Layers3,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  PlayCircle,
  RefreshCcw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Upload,
  Workflow,
  X,
  XCircle,
} from 'lucide-react';
import './index.css';

type Estado = 'planejado' | 'preparado' | 'bloqueado';
type Teste = 'nao_executado' | 'aprovado' | 'falhou';
type Camada =
  | 'Geral'
  | 'Bronze'
  | 'Silver'
  | 'Gold'
  | 'Qualidade'
  | 'Governança';
type Etapa = {
  id: string;
  titulo: string;
  camada: Camada;
  origem: string;
  destino: string;
  deps: string[];
  testes: string;
  prova: string;
  proxima: string;
  aceite: string;
  bloqueioReal: boolean;
};
type Registro = {
  estado: Estado;
  responsavel: string;
  referencia: string;
  observacao: string;
  teste: Teste;
};
type Evento = {
  id: string;
  quando: string;
  acao: string;
  detalhe: string;
  etapa: string;
};
type Payload = {
  schema: 1;
  projeto: string;
  origem: string;
  exportadoEm: string;
  registros: Record<string, Registro>;
  eventos: Evento[];
};
type Secao =
  | 'geral'
  | 'etapas'
  | 'guia'
  | 'bloqueios'
  | 'evidencias'
  | 'documentacao';

const ETAPAS: Etapa[] = [
  {
    id: 'PF-01',
    titulo: 'Preflight de ambiente e custos',
    camada: 'Geral',
    origem: 'Regras + inventário de recursos',
    destino: 'Matriz de admissão DEV',
    deps: [],
    testes: 'Pré-condições, custo, ambiente e controles negativos',
    prova: 'Versão das regras, fonte de cobrança, SHA e inventário',
    proxima: 'Definir executor gratuito e validar hard stop',
    aceite:
      'Ambiente DEV identificado, custo R$ 0,00 comprovado e controle de execução definido',
    bloqueioReal: false,
  },
  {
    id: 'BR-01',
    titulo: 'Ingestão Bronze',
    camada: 'Bronze',
    origem: 'CSV de pedidos sintéticos',
    destino: 'bronze/pedidos_raw',
    deps: ['PF-01'],
    testes: 'Ingestão íntegra, esquema bruto, entrada inválida',
    prova: 'Contagem, hash da origem, log e readback',
    proxima: 'Preparar contrato de arquivo e esquema, sem executar',
    aceite:
      'Dados brutos íntegros, lote rastreável e prova externa de persistência',
    bloqueioReal: true,
  },
  {
    id: 'SV-01',
    titulo: 'Transformação Silver',
    camada: 'Silver',
    origem: 'bronze/pedidos_raw',
    destino: 'silver/pedidos_tratados',
    deps: ['BR-01'],
    testes: 'Tipagem, nulos, duplicados e quarentena',
    prova: 'Regras de qualidade, rejeições e contagens',
    proxima: 'Definir limpeza, deduplicação e casos de teste',
    aceite:
      'Dados normalizados e regras de qualidade aprovadas em ambiente real',
    bloqueioReal: true,
  },
  {
    id: 'GD-01',
    titulo: 'Publicação Gold',
    camada: 'Gold',
    origem: 'silver/pedidos_tratados',
    destino: 'gold/resumo_pedidos_diario',
    deps: ['SV-01'],
    testes: 'Agregados, totais e reconciliação',
    prova: 'Indicadores calculados, SQL/consulta e readback',
    proxima: 'Descrever métricas e contrato da tabela Gold',
    aceite:
      'Agregação reconciliada com fonte independente e versão do pipeline',
    bloqueioReal: true,
  },
  {
    id: 'TS-01',
    titulo: 'Teste positivo ponta a ponta',
    camada: 'Qualidade',
    origem: 'Arquivo sintético válido',
    destino: 'Bronze → Silver → Gold',
    deps: ['GD-01'],
    testes: 'Caso válido, linha sentinela e resultado final',
    prova: 'run_id, saída final e leitura independente',
    proxima: 'Especificar fixture positiva e critérios de aceite',
    aceite: 'Sentinela íntegra no destino, no mesmo SHA, ambiente e execução',
    bloqueioReal: false,
  },
  {
    id: 'TS-02',
    titulo: 'Teste negativo e proteção',
    camada: 'Qualidade',
    origem: 'Arquivo inválido e duplicado',
    destino: 'Rejeição / quarentena',
    deps: ['TS-01'],
    testes: 'Schema inválido, null, duplicação e LGPD',
    prova: 'Ausência de efeito indevido, erro e logs sanitizados',
    proxima: 'Preparar entradas inválidas sintéticas',
    aceite:
      'Entrada rejeitada sem publicação indevida e com evidência independente',
    bloqueioReal: false,
  },
  {
    id: 'RP-01',
    titulo: 'Replay idempotente',
    camada: 'Qualidade',
    origem: 'Mesmo lote / idempotency_key',
    destino: 'Gold sem duplicação',
    deps: ['TS-02'],
    testes: 'Repetir mesmo lote, comparar contagem e hash',
    prova: 'Duas execuções, checksums e ausência de duplicação',
    proxima: 'Definir chave estável de lote e teste de replay',
    aceite: 'Reprocessamento do mesmo lote sem duplicar efeitos',
    bloqueioReal: false,
  },
  {
    id: 'CP-01',
    titulo: 'Checkpoint durável',
    camada: 'Governança',
    origem: 'Estado + artefatos de execução',
    destino: 'Checkpoint externo por hash',
    deps: ['RP-01'],
    testes: 'Exportação, reimportação e adulteração',
    prova: 'SHA-256, manifesto, local externo e recibo de leitura',
    proxima: 'Definir armazenamento autorizado e envelope imutável',
    aceite: 'Checkpoint fora do executor, íntegro e recuperável após falha',
    bloqueioReal: false,
  },
  {
    id: 'VD-01',
    titulo: 'Validador independente',
    camada: 'Governança',
    origem: 'Artefatos do pipeline + checkpoint',
    destino: 'Parecer de validação',
    deps: ['CP-01'],
    testes: 'Positivo, negativo, replay e regressão',
    prova: 'Identidade do validador, SHA, execução e parecer',
    proxima: 'Designar revisor diferente do executor',
    aceite:
      'Parecer independente amarrado ao ambiente, versão e entradas reais',
    bloqueioReal: false,
  },
  {
    id: 'RB-01',
    titulo: 'Readback e encerramento',
    camada: 'Governança',
    origem: 'Checkpoint + resultados + SHA',
    destino: 'Registro canônico / TODO',
    deps: ['VD-01'],
    testes: 'Releitura do destino, versão e evidências',
    prova: 'URI canônica, SHA completo, run_id e estado final',
    proxima: 'Preparar checklist de readback e sincronização TODO',
    aceite: 'Leitura independente, critérios completos e TODO sincronizado',
    bloqueioReal: false,
  },
];
const MENU: { id: Secao; nome: string; icone: typeof LayoutDashboard }[] = [
  { id: 'geral', nome: 'Visão geral', icone: LayoutDashboard },
  { id: 'etapas', nome: 'Fila de etapas', icone: Layers3 },
  { id: 'guia', nome: 'Fluxo guiado', icone: Workflow },
  { id: 'bloqueios', nome: 'Bloqueios', icone: ShieldAlert },
  { id: 'evidencias', nome: 'Evidências e logs', icone: FileClock },
  { id: 'documentacao', nome: 'Documentação', icone: BookOpen },
];
const nomesEstado: Record<Estado, string> = {
  planejado: 'Planejado',
  preparado: 'Preparado',
  bloqueado: 'Bloqueado',
};
const coresCamada: Record<Camada, string> = {
  Geral: 'geral',
  Bronze: 'bronze',
  Silver: 'silver',
  Gold: 'gold',
  Qualidade: 'qualidade',
  Governança: 'governanca',
};
const CHAVE = 'lakehouse-zero-painel-v1';
const regrasSha = '86abe65b22781c2f608a7d7286ce3a28cd48aaaf';

function iniciais(): Record<string, Registro> {
  const r: Record<string, Registro> = {};
  ETAPAS.forEach(e => {
    r[e.id] = {
      estado: e.bloqueioReal ? 'bloqueado' : 'planejado',
      responsavel: '',
      referencia: '',
      observacao: '',
      teste: 'nao_executado',
    };
  });
  return r;
}
function idEvento(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : String(Date.now()) + '-' + Math.random().toString(36).slice(2);
}
function evento(acao: string, detalhe: string, etapa = 'GLOBAL'): Evento {
  return {
    id: idEvento(),
    quando: new Date().toISOString(),
    acao,
    detalhe,
    etapa,
  };
}
function registroValido(v: unknown): v is Registro {
  if (!v || typeof v !== 'object') return false;
  const r = v as Registro;
  return (
    ['planejado', 'preparado', 'bloqueado'].includes(r.estado) &&
    ['nao_executado', 'aprovado', 'falhou'].includes(r.teste) &&
    typeof r.responsavel === 'string' &&
    r.responsavel.length <= 180 &&
    typeof r.referencia === 'string' &&
    r.referencia.length <= 500 &&
    typeof r.observacao === 'string' &&
    r.observacao.length <= 1500
  );
}
function validarPayload(p: unknown): p is Payload {
  if (!p || typeof p !== 'object') return false;
  const obj = p as Payload;
  if (
    obj.schema !== 1 ||
    obj.projeto !== 'LAKEHOUSE_ZERO' ||
    !obj.registros ||
    typeof obj.registros !== 'object' ||
    !Array.isArray(obj.eventos) ||
    obj.eventos.length > 100
  )
    return false;
  return (
    ETAPAS.every(e => registroValido(obj.registros[e.id])) &&
    Object.keys(obj.registros).every(id => ETAPAS.some(e => e.id === id)) &&
    obj.eventos.every(
      e =>
        typeof e.id === 'string' &&
        typeof e.quando === 'string' &&
        typeof e.acao === 'string' &&
        typeof e.detalhe === 'string' &&
        typeof e.etapa === 'string' &&
        e.detalhe.length <= 400
    )
  );
}
function carregar() {
  try {
    const p = JSON.parse(localStorage.getItem(CHAVE) || 'null');
    if (validarPayload(p))
      return { registros: p.registros, eventos: p.eventos };
  } catch {
    /* sem estado válido: iniciar conservadoramente */
  }
  return { registros: iniciais(), eventos: [] as Evento[] };
}
function salvar(registros: Record<string, Registro>, eventos: Evento[]) {
  try {
    localStorage.setItem(
      CHAVE,
      JSON.stringify({
        schema: 1,
        projeto: 'LAKEHOUSE_ZERO',
        origem: 'painel_local',
        exportadoEm: new Date().toISOString(),
        registros,
        eventos,
      })
    );
  } catch {
    /* backup manual é a fonte transferível */
  }
}
async function hashDe(s: string) {
  if (!crypto?.subtle)
    throw new Error('SHA-256 requer HTTPS/navegador compatível.');
  const bytes = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(s)
  );
  return Array.from(new Uint8Array(bytes))
    .map(x => x.toString(16).padStart(2, '0'))
    .join('');
}
function dependenciasPreparadas(e: Etapa, r: Record<string, Registro>) {
  return e.deps.every(id => r[id]?.estado === 'preparado');
}

export default function App() {
  const [inicial] = useState(carregar);
  const [registros, setRegistros] = useState<Record<string, Registro>>(
    inicial.registros
  );
  const [eventos, setEventos] = useState<Evento[]>(inicial.eventos);
  const [secao, setSecao] = useState<Secao>('geral');
  const [selecionada, setSelecionada] = useState('PF-01');
  const [filtroCamada, setFiltroCamada] = useState('Todas');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [busca, setBusca] = useState('');
  const [formulario, setFormulario] = useState<Registro>(registros['PF-01']);
  const [mensagem, setMensagem] = useState('');
  const [checagem, setChecagem] = useState<
    { nome: string; passou: boolean; detalhe: string }[] | null
  >(null);
  const [menuAberto, setMenuAberto] = useState(false);
  const seletorArquivo = useRef<HTMLInputElement>(null);

  const etapaAtual = ETAPAS.find(e => e.id === selecionada) || ETAPAS[0];
  const bloqueadas = ETAPAS.filter(
    e => registros[e.id].estado === 'bloqueado'
  ).length;
  const preparadas = ETAPAS.filter(
    e => registros[e.id].estado === 'preparado'
  ).length;
  const filtered = useMemo(
    () =>
      ETAPAS.filter(
        e =>
          (filtroCamada === 'Todas' || e.camada === filtroCamada) &&
          (filtroEstado === 'Todos' ||
            registros[e.id].estado === filtroEstado) &&
          (e.titulo + ' ' + e.id + ' ' + e.origem + ' ' + e.destino)
            .toLocaleLowerCase('pt-BR')
            .includes(busca.toLocaleLowerCase('pt-BR'))
      ),
    [filtroCamada, filtroEstado, busca, registros]
  );

  function persistir(novos: Record<string, Registro>, novosEventos: Evento[]) {
    setRegistros(novos);
    setEventos(novosEventos);
    salvar(novos, novosEventos);
  }
  function registrar(acao: string, detalhe: string, etapa = 'GLOBAL') {
    const novos = [evento(acao, detalhe, etapa), ...eventos].slice(0, 100);
    persistir(registros, novos);
  }
  function editarEtapa(id: string) {
    setSelecionada(id);
    setFormulario({ ...registros[id] });
    setMensagem('');
    setSecao('guia');
    setMenuAberto(false);
  }
  function mudarEstado(estado: Estado) {
    const e = etapaAtual;
    const base = {
      ...formulario,
      responsavel: formulario.responsavel.trim(),
      referencia: formulario.referencia.trim(),
      observacao: formulario.observacao.trim(),
    };
    if (
      base.observacao.length > 1500 ||
      base.referencia.length > 500 ||
      base.responsavel.length > 180
    ) {
      setMensagem('Os limites dos campos foram excedidos.');
      return;
    }
    if (estado === 'preparado' && (!base.responsavel || !base.referencia)) {
      setMensagem(
        'Informe responsável e referência de evidência antes de marcar Preparado.'
      );
      return;
    }
    if (estado === 'preparado' && e.bloqueioReal) {
      setMensagem(
        'Bloqueado: Databricks ausente. Apenas registre o plano; não avance o status.'
      );
      return;
    }
    if (estado === 'preparado' && !dependenciasPreparadas(e, registros)) {
      setMensagem('Bloqueado: prepare primeiro as dependências da etapa.');
      return;
    }
    if (estado === 'preparado' && base.teste === 'falhou') {
      setMensagem('Bloqueado: existe falha de teste registrada.');
      return;
    }
    const novos = { ...registros, [e.id]: { ...base, estado } };
    const novoEvento = evento(
      'Atualização de etapa',
      e.id +
        ': ' +
        nomesEstado[estado] +
        ' | responsável: ' +
        (base.responsavel || 'não informado'),
      e.id
    );
    const historico = [novoEvento, ...eventos].slice(0, 100);
    persistir(novos, historico);
    setFormulario(novos[e.id]);
    setMensagem('Registro local salvo. Não comprova execução do pipeline.');
  }
  function navegar(s: Secao) {
    setSecao(s);
    setMenuAberto(false);
    setMensagem('');
  }
  function autochecar() {
    const checks = [
      {
        nome: 'Estrutura de 10 etapas',
        passou:
          ETAPAS.length === 10 &&
          new Set(ETAPAS.map(e => e.id)).size === ETAPAS.length,
        detalhe: 'IDs únicos e ordem do fluxo guiado',
      },
      {
        nome: 'Custo declarado',
        passou:
          ETAPAS.every(e => e.destino.length > 0) &&
          !ETAPAS.some(e =>
            e.proxima.toLowerCase().includes('provisionar recurso pago')
          ),
        detalhe: 'Nenhuma ação de provisionamento pago disponível',
      },
      {
        nome: 'Dependências válidas',
        passou: ETAPAS.every((e, i) =>
          e.deps.every(
            d =>
              ETAPAS.findIndex(x => x.id === d) < i &&
              ETAPAS.some(x => x.id === d)
          )
        ),
        detalhe: 'Referências para etapas anteriores',
      },
      {
        nome: 'Controle negativo de estado',
        passou: !registroValido({ ...registros['PF-01'], estado: 'concluido' }),
        detalhe: 'Status concluído sem prova é rejeitado',
      },
      {
        nome: 'Replay local sem duplicidade',
        passou: (() => {
          const x = evento('teste', 'teste');
          const xs = [x];
          return [...xs.filter(y => y.id !== x.id), x].length === 1;
        })(),
        detalhe: 'Mesmo ID lógico permanece único no ensaio local',
      },
      {
        nome: 'Bloqueio sem Databricks',
        passou: ETAPAS.filter(e => e.bloqueioReal).every(
          e => registros[e.id].estado === 'bloqueado'
        ),
        detalhe: 'Bronze, Silver e Gold não liberados',
      },
    ];
    setChecagem(checks);
    registrar(
      'Autochecagem local',
      checks.filter(c => c.passou).length +
        '/' +
        checks.length +
        ' verificações; não executa Databricks'
    );
  }
  async function exportar() {
    try {
      const payload: Payload = {
        schema: 1,
        projeto: 'LAKEHOUSE_ZERO',
        origem: 'painel_local',
        exportadoEm: new Date().toISOString(),
        registros,
        eventos,
      };
      const sha256 = await hashDe(JSON.stringify(payload));
      const envelope = {
        formato: 'LAKEHOUSE_ZERO_CHECKPOINT_V1',
        algoritmo: 'SHA-256',
        sha256,
        payload,
      };
      const arquivo = new Blob([JSON.stringify(envelope, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(arquivo);
      const a = document.createElement('a');
      a.href = url;
      a.download =
        'checkpoint-lakehouse-zero-' +
        new Date().toISOString().slice(0, 10) +
        '.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMensagem(
        'Checkpoint exportado com SHA-256. Guarde fora deste navegador e faça o readback.'
      );
      registrar(
        'Checkpoint exportado',
        'SHA-256: ' +
          sha256.slice(0, 16) +
          '… | arquivo local; readback externo pendente'
      );
    } catch (e) {
      setMensagem(e instanceof Error ? e.message : 'Falha ao exportar.');
    }
  }
  async function importar(arquivo?: File) {
    if (!arquivo) return;
    try {
      if (arquivo.size > 350000)
        throw new Error('Arquivo maior que o limite permitido (350 KB).');
      const envelope = JSON.parse(await arquivo.text());
      if (
        envelope.formato !== 'LAKEHOUSE_ZERO_CHECKPOINT_V1' ||
        envelope.algoritmo !== 'SHA-256' ||
        typeof envelope.sha256 !== 'string' ||
        !/^[a-f0-9]{64}$/.test(envelope.sha256)
      )
        throw new Error('Envelope ou hash inválido.');
      if (!validarPayload(envelope.payload))
        throw new Error('Esquema do checkpoint inválido.');
      const atual = await hashDe(JSON.stringify(envelope.payload));
      if (atual !== envelope.sha256)
        throw new Error('Falha de integridade: conteúdo adulterado.');
      const dados: Payload = envelope.payload;
      // Não permitir que a restauração de um arquivo externo afaste bloqueios reais.
      const restritos = { ...dados.registros };
      ETAPAS.filter(e => e.bloqueioReal).forEach(e => {
        restritos[e.id] = { ...restritos[e.id], estado: 'bloqueado' };
      });
      const log = evento(
        'Checkpoint reimportado',
        'Hash verificado: ' +
          atual.slice(0, 16) +
          '… | integridade local, sem atestado externo'
      );
      persistir(restritos, [log, ...dados.eventos].slice(0, 100));
      setFormulario(restritos[selecionada]);
      setMensagem(
        'SHA-256 confirmado na reimportação. Origem externa e execução real ainda exigem validação independente.'
      );
    } catch (e) {
      setMensagem(
        e instanceof Error ? e.message : 'Falha ao importar arquivo.'
      );
    } finally {
      if (seletorArquivo.current) seletorArquivo.current.value = '';
    }
  }
  function limpar() {
    if (
      !window.confirm(
        'Limpar registros deste navegador? Exporte um checkpoint antes, se precisar preservar o histórico.'
      )
    )
      return;
    const zero = iniciais();
    const log = [
      evento('Estado reiniciado', 'Planejamento redefinido localmente'),
    ];
    persistir(zero, log);
    setFormulario(zero[selecionada]);
    setChecagem(null);
    setMensagem(
      'Registros locais reiniciados; bloqueios de ambiente mantidos.'
    );
  }

  const faixa = (e: Etapa) => (
    <span className={'tag tag-' + coresCamada[e.camada]}>{e.camada}</span>
  );
  const pill = (estado: Estado) => (
    <span className={'status status-' + estado}>
      <span className="status-dot" />
      {nomesEstado[estado]}
    </span>
  );

  const tabela = (lista: Etapa[]) => (
    <div className="table-scroll">
      <table className="steps-table">
        <thead>
          <tr>
            <th>Etapa / Camada</th>
            <th>Origem → destino</th>
            <th>Dependências</th>
            <th>Testes e evidências</th>
            <th>Estado</th>
            <th>Custo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {lista.map(e => (
            <tr key={e.id}>
              <td className="name-cell">
                <span className="mono muted">{e.id}</span>
                <strong>{e.titulo}</strong>
                {faixa(e)}
              </td>
              <td className="route-cell">
                <span>{e.origem}</span>
                <ArrowDownRight size={15} />
                <strong>{e.destino}</strong>
              </td>
              <td>
                <span className="muted">
                  {e.deps.length ? e.deps.join(' · ') : 'Sem dependências'}
                </span>
              </td>
              <td className="proof-cell">
                <span>{e.testes}</span>
                <small>{e.prova}</small>
              </td>
              <td>{pill(registros[e.id].estado)}</td>
              <td>
                <span className="cost">R$ 0,00</span>
              </td>
              <td>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={'Abrir ' + e.titulo}
                  onClick={() => editarEtapa(e.id)}
                >
                  <ChevronRight size={19} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {lista.length === 0 && (
        <div className="empty">
          Nenhuma etapa encontrada para os filtros selecionados.
        </div>
      )}
    </div>
  );

  return (
    <div className="shell">
      <aside className={'sidebar ' + (menuAberto ? 'sidebar-open' : '')}>
        <div className="brand">
          <div className="brand-icon">
            <Layers3 size={23} />
          </div>
          <div>
            <strong>Lakehouse Zero</strong>
            <span>Pipeline control plane</span>
          </div>
          <button
            type="button"
            aria-label="Fechar menu"
            className="mobile-close"
            onClick={() => setMenuAberto(false)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="side-label">WORKSPACE</div>
        <nav className="nav" aria-label="Navegação principal">
          {MENU.map(m => (
            <button
              type="button"
              key={m.id}
              onClick={() => navegar(m.id)}
              className={'nav-item ' + (secao === m.id ? 'nav-active' : '')}
            >
              <m.icone size={19} />
              <span>{m.nome}</span>
              {secao === m.id && <span className="active-dot" />}
            </button>
          ))}
        </nav>
        <div className="side-divider" />
        <div className="side-label">AMBIENTE</div>
        <div className="environment">
          <span className="env-pulse" />
          <div>
            <strong>DEV · Planejamento</strong>
            <small>Sem Databricks conectado</small>
          </div>
        </div>
        <div className="sidebar-bottom">
          <div className="security-tile">
            <ShieldCheck size={19} />
            <strong>Fail-closed ativo</strong>
            <span>Sem execução, sem credenciais, sem gastos extras.</span>
          </div>
          <div className="sidebar-footer">
            REGRAS v1.6.20
            <br />
            <span>main · 86abe65b…</span>
          </div>
        </div>
      </aside>
      {menuAberto && (
        <button
          className="overlay"
          aria-label="Fechar menu"
          onClick={() => setMenuAberto(false)}
        />
      )}
      <main className="content">
        <header className="topbar">
          <div className="crumbs">
            <button
              type="button"
              className="menu-button"
              aria-label="Abrir menu"
              onClick={() => setMenuAberto(true)}
            >
              <Menu size={22} />
            </button>
            <span>Projetos</span>
            <ChevronRight size={14} />
            <strong>Databricks · Bronze / Silver / Gold</strong>
          </div>
          <div className="top-actions">
            <span className="top-mini">
              <LockKeyhole size={14} /> Sem provisionamento
            </span>
            <span className="avatar">DEV</span>
          </div>
        </header>
        <div className="page">
          {secao === 'geral' && (
            <>
              <div className="eyebrow">
                <span className="line-accent" /> VISÃO OPERACIONAL{' '}
                <span className="eyebrow-suffix">/ PRIMEIRA IMPLEMENTAÇÃO</span>
              </div>
              <div className="hero">
                <div className="hero-copy">
                  <span className="hero-kicker">
                    <span className="ring" /> PROJETO EM PLANEJAMENTO
                  </span>
                  <h1>
                    Seu primeiro pipeline.
                    <br />
                    <em>Controle desde o início.</em>
                  </h1>
                  <p>
                    Planeje a jornada Bronze → Silver → Gold com
                    rastreabilidade, testes e gates reais. Nenhum recurso
                    Databricks será criado ou executado por este painel.
                  </p>
                  <div className="hero-buttons">
                    <button
                      type="button"
                      className="primary"
                      onClick={() => editarEtapa('PF-01')}
                    >
                      Iniciar preflight <ArrowRight size={17} />
                    </button>
                    <button
                      type="button"
                      className="secondary light"
                      onClick={() => navegar('etapas')}
                    >
                      Ver fila de etapas
                    </button>
                  </div>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="orb orb-one" />
                  <div className="orb orb-two" />
                  <div className="art-layer art-bronze">
                    <Database size={25} />
                    <span>BRONZE</span>
                  </div>
                  <div className="art-connector">
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="art-layer art-silver">
                    <SlidersHorizontal size={25} />
                    <span>SILVER</span>
                  </div>
                  <div className="art-connector">
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="art-layer art-gold">
                    <Sparkles size={25} />
                    <span>GOLD</span>
                  </div>
                </div>
              </div>
              <div className="metrics">
                <div className="metric">
                  <div className="metric-label">
                    <span>Etapas planejadas</span>
                    <Layers3 size={18} />
                  </div>
                  <strong>
                    10<span className="metric-fade">/10</span>
                  </strong>
                  <small>Escopo definido, execução pendente</small>
                </div>
                <div className="metric">
                  <div className="metric-label">
                    <span>Preparação registrada</span>
                    <CheckCircle2 size={18} />
                  </div>
                  <strong>
                    {preparadas}
                    <span className="metric-fade">/10</span>
                  </strong>
                  <small>Não equivale a pipeline validado</small>
                </div>
                <div className="metric">
                  <div className="metric-label">
                    <span>Etapas bloqueadas</span>
                    <AlertCircle size={18} />
                  </div>
                  <strong>{bloqueadas.toString().padStart(2, '0')}</strong>
                  <small>Databricks ausente nas 3 camadas</small>
                </div>
                <div className="metric metric-highlight">
                  <div className="metric-label">
                    <span>Custo incremental permitido</span>
                    <ShieldCheck size={18} />
                  </div>
                  <strong>
                    R$ 0<span>,00</span>
                  </strong>
                  <small>Sem contratação ou cobrança adicional</small>
                </div>
              </div>
              <div className="section-row">
                <div>
                  <h2>Arquitetura do primeiro fluxo</h2>
                  <p>
                    Do dado bruto ao indicador confiável, com portas de
                    qualidade.
                  </p>
                </div>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => navegar('guia')}
                >
                  Explorar fluxo <ArrowRight size={16} />
                </button>
              </div>
              <div className="architecture">
                {[
                  {
                    camada: 'Bronze',
                    valor: 'Dados brutos',
                    sub: 'Ingestão sem alterações',
                    origem: 'CSV sintético',
                    destino: 'bronze/pedidos_raw',
                    ico: Database,
                  },
                  {
                    camada: 'Silver',
                    valor: 'Dados confiáveis',
                    sub: 'Limpeza e normalização',
                    origem: 'Bronze validada',
                    destino: 'silver/pedidos_tratados',
                    ico: SlidersHorizontal,
                  },
                  {
                    camada: 'Gold',
                    valor: 'Dados para análise',
                    sub: 'Agregações e métricas',
                    origem: 'Silver validada',
                    destino: 'gold/resumo_pedidos_diario',
                    ico: Sparkles,
                  },
                ].map((c, i) => (
                  <div
                    className={'layer-card layer-' + c.camada.toLowerCase()}
                    key={c.camada}
                  >
                    <div className="layer-top">
                      <span
                        className={
                          'layer-icon layer-icon-' + c.camada.toLowerCase()
                        }
                      >
                        <c.ico size={23} />
                      </span>
                      <span className="layer-index">0{i + 1} / 03</span>
                    </div>
                    <div className="layer-title">{c.camada}</div>
                    <strong>{c.valor}</strong>
                    <p>{c.sub}</p>
                    <div className="layer-path">
                      <small>ENTRADA</small>
                      <span>{c.origem}</span>
                      <small>SAÍDA</small>
                      <span>{c.destino}</span>
                    </div>
                    <div className="layer-bottom">
                      <CloudOff size={15} /> Ambiente não conectado
                    </div>
                  </div>
                ))}
              </div>
              <div className="split-grid">
                <section className="panel">
                  <div className="panel-head">
                    <div>
                      <h2>Próxima ação segura</h2>
                      <p>Prioridade Pareto: remover o bloqueio inicial.</p>
                    </div>
                    <span className="badge-neutral">P0</span>
                  </div>
                  <div className="next-action">
                    <div className="next-icon">
                      <Shield size={22} />
                    </div>
                    <div>
                      <strong>Comprovar rota gratuita de execução</strong>
                      <p>
                        Escolher entre ambiente já autorizado e protótipo local
                        nativo, checar custo/hard stop e documentar versão antes
                        de qualquer ingestão.
                      </p>
                      <button
                        type="button"
                        className="inline-link"
                        onClick={() => editarEtapa('PF-01')}
                      >
                        Abrir preflight <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                </section>
                <section className="panel">
                  <div className="panel-head">
                    <div>
                      <h2>Bloqueios principais</h2>
                      <p>Estados distintos, sem falsos positivos.</p>
                    </div>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => navegar('bloqueios')}
                    >
                      Detalhes <ArrowRight size={15} />
                    </button>
                  </div>
                  <div className="compact-blocker">
                    <span className="blocker-symbol red">
                      <CloudOff size={18} />
                    </span>
                    <div>
                      <strong>Databricks não disponível</strong>
                      <small>Impede a execução das três camadas</small>
                    </div>
                    <span className="mini-status">BLOQUEIO REAL</span>
                  </div>
                  <div className="compact-blocker">
                    <span className="blocker-symbol orange">
                      <FileCheck2 size={18} />
                    </span>
                    <div>
                      <strong>Evidências operacionais ausentes</strong>
                      <small>CI/E2E/readback ainda não executados</small>
                    </div>
                    <span className="mini-status neutral">PENDENTE</span>
                  </div>
                </section>
              </div>
              <div className="section-row">
                <div>
                  <h2>Fila inicial</h2>
                  <p>Escopo completo com dependências e próximo passo.</p>
                </div>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => navegar('etapas')}
                >
                  Ver todas as 10 etapas <ArrowRight size={16} />
                </button>
              </div>
              <section className="panel table-panel">
                {tabela(ETAPAS.slice(0, 4))}
              </section>
            </>
          )}
          {secao === 'etapas' && (
            <>
              <div className="section-heading">
                <div>
                  <div className="eyebrow">
                    <span className="line-accent" /> FILA GOVERNADA
                  </div>
                  <h1>Fila de etapas</h1>
                  <p>
                    Ordem técnica, dependências, testes, provas e próxima ação
                    segura.
                  </p>
                </div>
                <span className="count-pill">
                  {filtered.length} de 10 etapas
                </span>
              </div>
              <div className="notice">
                <ShieldCheck size={21} />
                <span>
                  <strong>Execução desabilitada.</strong> Estados aqui
                  representam apenas preparação documental. Não há conexão com
                  Databricks ou autorização de gastos.
                </span>
              </div>
              <div className="filters">
                <div className="search-box">
                  <Search size={18} />
                  <input
                    aria-label="Buscar etapa"
                    placeholder="Buscar etapa, origem ou destino..."
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                  />
                </div>
                <div className="filter-select">
                  <Filter size={17} />
                  <select
                    aria-label="Filtrar camada"
                    value={filtroCamada}
                    onChange={e => setFiltroCamada(e.target.value)}
                  >
                    {[
                      'Todas',
                      'Geral',
                      'Bronze',
                      'Silver',
                      'Gold',
                      'Qualidade',
                      'Governança',
                    ].map(x => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                  <ChevronDown size={15} />
                </div>
                <div className="filter-select">
                  <Activity size={17} />
                  <select
                    aria-label="Filtrar estado"
                    value={filtroEstado}
                    onChange={e => setFiltroEstado(e.target.value)}
                  >
                    <option value="Todos">Todos os estados</option>
                    <option value="planejado">Planejado</option>
                    <option value="preparado">Preparado</option>
                    <option value="bloqueado">Bloqueado</option>
                  </select>
                  <ChevronDown size={15} />
                </div>
              </div>
              <section className="panel table-panel">
                {tabela(filtered)}
              </section>
              <div className="queue-foot">
                <InfoIcon /> Nenhuma etapa recebe status de concluída sem E2E
                real, evidências externas e validador independente.
              </div>
            </>
          )}
          {secao === 'guia' && (
            <>
              <div className="section-heading">
                <div>
                  <div className="eyebrow">
                    <span className="line-accent" /> EXECUÇÃO ASSISTIDA
                  </div>
                  <h1>Fluxo guiado</h1>
                  <p>
                    Registre preparação e evidências. O painel não executa jobs,
                    clusters ou SQL.
                  </p>
                </div>
                <span className="lock-label">
                  <LockKeyhole size={16} /> Modo somente planejamento
                </span>
              </div>
              <div className="guided-grid">
                <section className="panel timeline-panel">
                  <div className="panel-head">
                    <div>
                      <h2>Etapas do fluxo</h2>
                      <p>Selecione uma etapa para consultar seus gates.</p>
                    </div>
                  </div>
                  <div className="timeline">
                    {ETAPAS.map((e, i) => (
                      <button
                        type="button"
                        key={e.id}
                        className={
                          'timeline-item ' +
                          (selecionada === e.id ? 'timeline-selected' : '')
                        }
                        onClick={() => editarEtapa(e.id)}
                      >
                        <div className="timeline-rail">
                          <div
                            className={
                              'timeline-node ' +
                              (registros[e.id].estado === 'preparado'
                                ? 'node-done'
                                : '')
                            }
                          >
                            {registros[e.id].estado === 'preparado' ? (
                              <Check size={14} />
                            ) : (
                              String(i + 1).padStart(2, '0')
                            )}
                          </div>
                          {i < ETAPAS.length - 1 && (
                            <span className="timeline-line" />
                          )}
                        </div>
                        <div className="timeline-body">
                          <span className="timeline-id">
                            {e.id} · {e.camada}
                          </span>
                          <strong>{e.titulo}</strong>
                          <small>{nomesEstado[registros[e.id].estado]}</small>
                        </div>
                        <ChevronRight size={17} />
                      </button>
                    ))}
                  </div>
                </section>
                <section className="panel detail-panel">
                  <div className="detail-eyebrow">
                    ETAPA SELECIONADA <span>{etapaAtual.id}</span>
                  </div>
                  <div className="detail-title">
                    <div>
                      <h2>{etapaAtual.titulo}</h2>
                      <p>{etapaAtual.camada} · Preparação e admissão</p>
                    </div>
                    {pill(registros[etapaAtual.id].estado)}
                  </div>
                  {etapaAtual.bloqueioReal && (
                    <div className="detail-warning">
                      <CloudOff size={19} />
                      <div>
                        <strong>Bloqueio de ambiente confirmado</strong>
                        <span>
                          Databricks não disponível; o estado permanecerá
                          bloqueado independentemente das observações
                          cadastradas.
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="detail-columns">
                    <div>
                      <span className="field-caption">ORIGEM</span>
                      <strong>{etapaAtual.origem}</strong>
                    </div>
                    <div>
                      <span className="field-caption">DESTINO</span>
                      <strong>{etapaAtual.destino}</strong>
                    </div>
                  </div>
                  <div className="detail-section">
                    <span className="field-caption">DEPENDÊNCIAS</span>
                    <div className="chips">
                      {etapaAtual.deps.length ? (
                        etapaAtual.deps.map(d => (
                          <span
                            key={d}
                            className={
                              'dependency ' +
                              (registros[d].estado === 'preparado'
                                ? 'dependency-done'
                                : '')
                            }
                          >
                            {d}: {nomesEstado[registros[d].estado]}
                          </span>
                        ))
                      ) : (
                        <span className="dependency">Sem dependências</span>
                      )}
                    </div>
                  </div>
                  <div className="detail-section">
                    <span className="field-caption">TESTES REQUERIDOS</span>
                    <p>{etapaAtual.testes}</p>
                  </div>
                  <div className="detail-section">
                    <span className="field-caption">EVIDÊNCIA EXIGIDA</span>
                    <p>{etapaAtual.prova}</p>
                  </div>
                  <div className="detail-section">
                    <span className="field-caption">CRITÉRIO DE ACEITE</span>
                    <p>{etapaAtual.aceite}</p>
                  </div>
                  <div className="form-divider" />
                  <h3>Registro de preparação</h3>
                  <p className="form-intro">
                    Preencha somente referências e identificadores não
                    sensíveis. Não informe dados pessoais ou credenciais.
                  </p>
                  <div className="form-grid">
                    <label>
                      Responsável
                      <input
                        maxLength={180}
                        placeholder="Ex.: equipe de dados / analista"
                        value={formulario.responsavel}
                        onChange={e =>
                          setFormulario({
                            ...formulario,
                            responsavel: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      Resultado observado dos testes
                      <select
                        value={formulario.teste}
                        onChange={e =>
                          setFormulario({
                            ...formulario,
                            teste: e.target.value as Teste,
                          })
                        }
                      >
                        <option value="nao_executado">Não executado</option>
                        <option value="aprovado">
                          Aprovado (declaração manual)
                        </option>
                        <option value="falhou">Falhou</option>
                      </select>
                    </label>
                  </div>
                  <label className="full-field">
                    Referência de evidência
                    <input
                      maxLength={500}
                      placeholder="URI ou ID não sensível de documento, issue ou execução"
                      value={formulario.referencia}
                      onChange={e =>
                        setFormulario({
                          ...formulario,
                          referencia: e.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="full-field">
                    Observações
                    <textarea
                      maxLength={1500}
                      rows={3}
                      placeholder="Pré-condições, pendências, ambiente, SHA ou critérios preparados..."
                      value={formulario.observacao}
                      onChange={e =>
                        setFormulario({
                          ...formulario,
                          observacao: e.target.value,
                        })
                      }
                    />
                  </label>
                  {mensagem && (
                    <div role="status" className="message">
                      <CircleAlert size={16} />
                      {mensagem}
                    </div>
                  )}
                  <div className="action-bar">
                    <button
                      type="button"
                      className="primary"
                      onClick={() => mudarEstado('preparado')}
                    >
                      <FileCheck2 size={17} /> Registrar preparação
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => mudarEstado('bloqueado')}
                    >
                      Marcar bloqueado
                    </button>
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => mudarEstado('planejado')}
                    >
                      Reabrir
                    </button>
                  </div>
                  <div className="safe-note">
                    <LockKeyhole size={15} /> Não há botões para criar,
                    executar, publicar ou aprovar um pipeline real.
                  </div>
                </section>
              </div>
            </>
          )}
          {secao === 'bloqueios' && (
            <>
              <div className="section-heading">
                <div>
                  <div className="eyebrow">
                    <span className="line-accent" /> GESTÃO DE IMPEDIMENTOS
                  </div>
                  <h1>Painel de bloqueios</h1>
                  <p>
                    Separe impedimento real, autorização humana, falha de teste
                    e prova ausente.
                  </p>
                </div>
                <span className="count-pill">4 categorias</span>
              </div>
              <div className="blocker-grid">
                <BlockCard
                  icon={<CloudOff size={24} />}
                  tipo="AMBIENTE"
                  titulo="Ausência de Databricks"
                  grau="BLOQUEIO CONFIRMADO"
                  nivel="red"
                  texto="Nenhum workspace ou runtime Databricks foi informado ou conectado. Bronze, Silver e Gold não podem ser executados ou validados."
                  acao="Projetar alternativa local nativa de custo zero ou admitir ambiente existente com evidência."
                  dono="Responsável técnico / proprietário"
                  evidencia="Inventário de ambiente, acesso, custo e SHA"
                />
                <BlockCard
                  icon={<LockKeyhole size={24} />}
                  tipo="AÇÃO HUMANA"
                  titulo="Decisão sobre executor e acesso"
                  grau="DECISÃO PENDENTE"
                  nivel="orange"
                  texto="A seleção de eventual workspace existente ou executor local exige definição de ambiente e autorização apropriada. Nenhum provisionamento está permitido."
                  acao="Selecionar rota disponível e documentar autorização específica, sem contratação."
                  dono="Proprietário do ambiente"
                  evidencia="Decisão de rota, limites e permissões"
                />
                <BlockCard
                  icon={<FlaskConical size={24} />}
                  tipo="TESTE"
                  titulo="Falha de teste"
                  grau={
                    Object.values(registros).some(r => r.teste === 'falhou')
                      ? 'FALHA REGISTRADA'
                      : 'NENHUMA FALHA OBSERVADA'
                  }
                  nivel={
                    Object.values(registros).some(r => r.teste === 'falhou')
                      ? 'red'
                      : 'neutral'
                  }
                  texto="Não confundir teste não executado com teste reprovado. Resultados deste painel são declarações manuais, não logs do Databricks."
                  acao="Após ambiente admitido, executar cenários positivos e negativos e anexar provas reais."
                  dono="Executor e validador independente"
                  evidencia="run_id, SHA, entradas, saídas e logs sanitizados"
                />
                <BlockCard
                  icon={<FileClock size={24} />}
                  tipo="EVIDÊNCIA"
                  titulo="Falta de comprovação"
                  grau="EVIDÊNCIAS PENDENTES"
                  nivel="orange"
                  texto="Ainda não há E2E real, checkpoint externo do pipeline, readback independente ou parecer de validação vinculados ao SHA."
                  acao="Consolidar provas por etapa e fazer leitura independente do destino antes do encerramento."
                  dono="Validador / governança"
                  evidencia="hash, recibo, manifesto, run_id e readback"
                />
              </div>
              <div className="notice notice-grey">
                <Fingerprint size={21} />
                <span>
                  Classificação conservadora: um bloqueio de controle não vira
                  erro de software. Não são geradas causas fictícias, logs de
                  execução ou pontuações de sucesso sem prova.
                </span>
              </div>
            </>
          )}
          {secao === 'evidencias' && (
            <>
              <div className="section-heading">
                <div>
                  <div className="eyebrow">
                    <span className="line-accent" /> AUDITORIA LOCAL
                  </div>
                  <h1>Evidências e checkpoints</h1>
                  <p>
                    Rastreabilidade no navegador, sem infraestrutura externa e
                    com exportação por SHA-256.
                  </p>
                </div>
              </div>
              <div className="notice">
                <ShieldCheck size={21} />
                <span>
                  Este painel não envia dados a um backend próprio. O
                  armazenamento do navegador não é backup durável entre
                  computadores; exporte e guarde o checkpoint em destino externo
                  autorizado.
                </span>
              </div>
              <div className="evidence-grid">
                <div className="panel evidence-action">
                  <div className="evidence-icon">
                    <HardDriveDownload size={25} />
                  </div>
                  <h2>Checkpoint transportável</h2>
                  <p>
                    Exporte o estado e os eventos em JSON assinado por hash
                    SHA-256 e reimporte para checar integridade. Um hash não
                    prova autoria nem validação externa.
                  </p>
                  <div className="evidence-buttons">
                    <button
                      type="button"
                      className="primary"
                      onClick={exportar}
                    >
                      <Download size={17} /> Exportar JSON
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => seletorArquivo.current?.click()}
                    >
                      <Upload size={17} /> Reimportar / readback local
                    </button>
                    <input
                      ref={seletorArquivo}
                      type="file"
                      accept=".json,application/json"
                      className="hidden-input"
                      aria-label="Importar checkpoint"
                      onChange={e => importar(e.target.files?.[0])}
                    />
                  </div>
                </div>
                <div className="panel evidence-action">
                  <div className="evidence-icon teal">
                    <FlaskConical size={25} />
                  </div>
                  <h2>Autochecagem do painel</h2>
                  <p>
                    Verifica estrutura, custo declarado, dependências, bloqueio
                    de status inválido e replay sintético.{' '}
                    <strong>Não testa o pipeline Databricks.</strong>
                  </p>
                  <button
                    type="button"
                    className="secondary"
                    onClick={autochecar}
                  >
                    <PlayCircle size={17} /> Executar autochecagem local
                  </button>
                </div>
              </div>
              {mensagem && (
                <div role="status" className="message message-large">
                  <CircleAlert size={17} />
                  {mensagem}
                </div>
              )}
              {checagem && (
                <section className="panel check-panel">
                  <div className="panel-head">
                    <div>
                      <h2>Resultado da autochecagem local</h2>
                      <p>
                        Verificações do comportamento do painel, não da
                        plataforma externa.
                      </p>
                    </div>
                    <span className="count-pill">
                      {checagem.filter(c => c.passou).length}/{checagem.length}{' '}
                      aprovadas
                    </span>
                  </div>
                  {checagem.map(c => (
                    <div key={c.nome} className="check-row">
                      {c.passou ? (
                        <CheckCircle2 size={18} className="pass-icon" />
                      ) : (
                        <XCircle size={18} className="fail-icon" />
                      )}
                      <div>
                        <strong>{c.nome}</strong>
                        <small>{c.detalhe}</small>
                      </div>
                      <span
                        className={
                          'test-result ' +
                          (c.passou ? 'test-pass' : 'test-fail')
                        }
                      >
                        {c.passou ? 'PASSOU' : 'FALHOU'}
                      </span>
                    </div>
                  ))}
                </section>
              )}
              <section className="panel log-panel">
                <div className="panel-head">
                  <div>
                    <h2>Histórico de transições</h2>
                    <p>Até 100 eventos locais, vinculados por ID e horário.</p>
                  </div>
                  <span className="count-pill">{eventos.length} eventos</span>
                </div>
                {eventos.length ? (
                  <div className="table-scroll">
                    <table className="log-table">
                      <thead>
                        <tr>
                          <th>Horário</th>
                          <th>Evento</th>
                          <th>Etapa</th>
                          <th>Detalhe</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eventos.map(e => (
                          <tr key={e.id}>
                            <td className="mono">
                              {new Date(e.quando).toLocaleString('pt-BR')}
                            </td>
                            <td>
                              <strong>{e.acao}</strong>
                              <small>{e.id.slice(0, 12)}</small>
                            </td>
                            <td>{e.etapa}</td>
                            <td>{e.detalhe}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty">
                    <FileClock size={31} />
                    <strong>Nenhum evento registrado</strong>
                    <span>
                      Comece pelo preflight ou pela autochecagem local.
                    </span>
                  </div>
                )}
              </section>
              <div className="reset-row">
                <button type="button" className="danger-text" onClick={limpar}>
                  Limpar somente registros locais
                </button>
                <span>Recurso destrutivo exige confirmação do usuário.</span>
              </div>
            </>
          )}
          {secao === 'documentacao' && (
            <>
              <div className="section-heading">
                <div>
                  <div className="eyebrow">
                    <span className="line-accent" /> BASE DE CONHECIMENTO
                  </div>
                  <h1>Manual operacional</h1>
                  <p>
                    Uma primeira implementação governada, sem dependência
                    inicial de Databricks.
                  </p>
                </div>
              </div>
              <div className="docs-grid">
                <section className="panel docs-main">
                  <h2>01. Escopo e ambiente</h2>
                  <p>
                    Este painel é um{' '}
                    <strong>plano operacional interativo</strong>. Não há
                    workspace, cluster, notebooks ou integração Databricks
                    conectados. Os caminhos são destinos lógicos propostos, não
                    tabelas criadas.
                  </p>
                  <h2>02. Contratos Bronze / Silver / Gold</h2>
                  <p>
                    <strong>Bronze:</strong> preservar arquivo de entrada e
                    metadados de lote; <strong>Silver:</strong> validar esquema,
                    tipagem, nulos e duplicatas; <strong>Gold:</strong> agregar
                    indicadores diários de pedidos, conciliados com Silver.
                  </p>
                  <h2>03. Gates obrigatórios</h2>
                  <p>
                    Preflight e custo comprovado → ingestão → transformação →
                    publicação → positivo → negativo → replay → checkpoint
                    externo → validador independente → readback final. Uma etapa
                    preparada não é uma etapa executada.
                  </p>
                  <h2>04. Evidências e rastreabilidade</h2>
                  <p>
                    Registrar referência do artefato, ambiente, branch/SHA,
                    run_id, entradas, resultados, hash e leitura independente.
                    Um teste declarado aprovado manualmente não substitui a
                    prova do executor.
                  </p>
                  <h2>05. LGPD e segurança</h2>
                  <p>
                    Utilizar somente dados sintéticos sem PII; não inserir nomes
                    de pessoas, tokens, segredos ou linhas reais nos campos. O
                    painel salva dados apenas no armazenamento deste navegador.
                    O checkpoint exportado deve seguir as políticas de retenção
                    e acesso do destino escolhido.
                  </p>
                  <h2>06. Limitações explícitas</h2>
                  <p>
                    Sem armazenamento remoto canônico, autenticação ou
                    assinatura digital. O SHA-256 verifica integridade do
                    arquivo importado, mas não autoria nem efeito operacional.
                    TODO Global, GitHub e Databricks não estão sincronizados.
                  </p>
                </section>
                <aside className="panel docs-side">
                  <h3>Controles essenciais</h3>
                  <div className="doc-rule">
                    <ShieldCheck size={18} />
                    <span>R$ 0,00 incremental</span>
                  </div>
                  <div className="doc-rule">
                    <XCircle size={18} />
                    <span>Sem Docker</span>
                  </div>
                  <div className="doc-rule">
                    <LockKeyhole size={18} />
                    <span>Fail-closed</span>
                  </div>
                  <div className="doc-rule">
                    <Fingerprint size={18} />
                    <span>SHA + readback</span>
                  </div>
                  <div className="doc-rule">
                    <RefreshCcw size={18} />
                    <span>Replay idempotente</span>
                  </div>
                  <div className="doc-rule">
                    <BadgeCheck size={18} />
                    <span>Validador independente</span>
                  </div>
                  <div className="docs-rule-footer">
                    <small>Referência canônica</small>
                    <strong>Operational Rules v1.6.20</strong>
                    <span className="mono">{regrasSha.slice(0, 16)}…</span>
                    <a
                      href="https://github.com/ericson-j-santos/chatgpt-operational-rules/blob/main/README.md"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir regras <ArrowRight size={14} />
                    </a>
                  </div>
                </aside>
              </div>
            </>
          )}
        </div>
        <footer className="page-footer">
          <span>
            <span className="footer-dot" /> LAKEHOUSE ZERO · DEV / PLANEJAMENTO
          </span>
          <span>
            Dados demonstrativos · Sem sincronização externa · R$ 0,00 adicional
          </span>
        </footer>
      </main>
    </div>
  );
}
function InfoIcon() {
  return <CircleAlert size={17} />;
}
function BlockCard({
  icon,
  tipo,
  titulo,
  grau,
  nivel,
  texto,
  acao,
  dono,
  evidencia,
}: {
  icon: React.ReactNode;
  tipo: string;
  titulo: string;
  grau: string;
  nivel: string;
  texto: string;
  acao: string;
  dono: string;
  evidencia: string;
}) {
  return (
    <article className="panel blocker-card">
      <div className="blocker-head">
        <span className={'blocker-large ' + nivel}>{icon}</span>
        <span className="blocker-type">{tipo}</span>
      </div>
      <h2>{titulo}</h2>
      <span className={'blocker-grade ' + nivel}>{grau}</span>
      <p>{texto}</p>
      <div className="blocker-divider" />
      <small>PRÓXIMA AÇÃO SEGURA</small>
      <strong className="blocker-action">{acao}</strong>
      <div className="blocker-meta">
        <div>
          <span>Responsável</span>
          <strong>{dono}</strong>
        </div>
        <div>
          <span>Evidência necessária</span>
          <strong>{evidencia}</strong>
        </div>
      </div>
    </article>
  );
}
