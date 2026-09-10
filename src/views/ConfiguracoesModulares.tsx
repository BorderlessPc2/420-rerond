import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Brain, Building2, FileText, Layers3, ListChecks, Scale } from 'lucide-react'
import type { TipoAnalise, TipoAnaliseCategoria } from '../models/TipoAnalise'
import type { Organizacao } from '../models/Organizacao'
import { ORGANIZACAO_CATEGORIA_OPTIONS } from '../models/Organizacao'
import type { RequisitoChecklist } from '../models/ConcessionariaPerfil'
import {
  isTiposAnaliseMockMode,
  listTiposAnalise,
  saveTipoAnalise,
  updateTipoAnalise,
} from '../services/tipoAnalise/tipoAnaliseService'
import {
  listOrganizacoes,
  updateOrganizacaoMeta,
  updateOrganizacaoModeloRelatorio,
} from '../services/organizacao/organizacaoService'
import { FONTES_NORMATIVAS } from '../config/normasCatalogo'
import './ConfiguracoesModulares.css'

const CATEGORIA_OPTIONS: Array<{ value: TipoAnaliseCategoria; label: string }> = [
  { value: 'ocupacao_faixa', label: 'Ocupação em faixa' },
  { value: 'poc', label: 'POC' },
  { value: 'acesso', label: 'Acesso' },
  { value: 'pac', label: 'PAC' },
  { value: 'ppu', label: 'PPU / Publicidade' },
  { value: 'rede_eletrica', label: 'Rede elétrica' },
  { value: 'esgoto', label: 'Esgoto / saneamento' },
  { value: 'publicidade', label: 'Publicidade' },
  { value: 'sinalizacao', label: 'Sinalização' },
  { value: 'outro', label: 'Outro' },
]

type TabId = 'tipos' | 'checklist' | 'relatorio' | 'normas' | 'organizacoes'

export default function ConfiguracoesModulares() {
  const [tab, setTab] = useState<TabId>('tipos')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [tipos, setTipos] = useState<TipoAnalise[]>([])
  const [organizacoes, setOrganizacoes] = useState<Organizacao[]>([])
  const [tipoNome, setTipoNome] = useState('')
  const [tipoCategoria, setTipoCategoria] = useState<TipoAnaliseCategoria>('outro')
  const [tipoDescricao, setTipoDescricao] = useState('')
  const [tipoPrompt, setTipoPrompt] = useState('')
  const [tipoSelecionadoId, setTipoSelecionadoId] = useState<string>('')
  const [reqId, setReqId] = useState('')
  const [reqDesc, setReqDesc] = useState('')
  const [reqCat, setReqCat] = useState('')
  const [orgSelecionadaId, setOrgSelecionadaId] = useState('')
  const [tituloPadrao, setTituloPadrao] = useState('')
  const [templateMarkdown, setTemplateMarkdown] = useState('')
  const [orgCategoria, setOrgCategoria] = useState<Organizacao['categoria']>('rodovia')
  const [orgArea, setOrgArea] = useState('')

  const tipoSelecionado = useMemo(
    () => tipos.find((t) => t.id === tipoSelecionadoId) ?? null,
    [tipos, tipoSelecionadoId],
  )
  const orgSelecionada = useMemo(
    () => organizacoes.find((o) => o.id === orgSelecionadaId) ?? null,
    [organizacoes, orgSelecionadaId],
  )

  const reload = async () => {
    const [t, orgs] = await Promise.all([listTiposAnalise(), listOrganizacoes().catch(() => [])])
    setTipos(t)
    setOrganizacoes(orgs)
    if (!tipoSelecionadoId && t[0]) setTipoSelecionadoId(t[0].id)
    if (!orgSelecionadaId && orgs[0]) setOrgSelecionadaId(orgs[0].id)
  }

  useEffect(() => {
    void reload().catch((err) =>
      setError(err instanceof Error ? err.message : 'Erro ao carregar configurações.'),
    )
  }, [])

  useEffect(() => {
    if (!orgSelecionada) return
    setTituloPadrao(orgSelecionada.modeloRelatorio?.tituloPadrao || '')
    setTemplateMarkdown(orgSelecionada.modeloRelatorio?.templateMarkdown || '')
    setOrgCategoria(orgSelecionada.categoria || 'rodovia')
    setOrgArea(orgSelecionada.area || '')
  }, [orgSelecionada])

  const flash = (msg: string) => {
    setSuccess(msg)
    setError(null)
  }

  return (
    <div className="config-modular">
      <header className="config-modular-header">
        <h1>
          <Layers3 size={22} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          Configurações modulares
        </h1>
        <p>
          Tipos, checklist, organizações (alias de concessionária), padrões de relatório e normas.
          Ensino da IA: <Link to="/ensinar-ia">Ensinar a IA</Link>. Nova organização:{' '}
          <Link to="/concessionarias/nova">cadastro guiado</Link>.
        </p>
        {isTiposAnaliseMockMode() && (
          <p className="config-modular-mock">
            Modo local ativo (Firestore sem permissão ainda). Os dados ficam no navegador até o
            deploy.
          </p>
        )}
      </header>

      {error && <div className="config-modular-error">{error}</div>}
      {success && <div className="config-modular-success">{success}</div>}

      <nav className="config-modular-tabs" aria-label="Seções">
        {(
          [
            { id: 'tipos', label: 'Tipos', icon: Brain },
            { id: 'checklist', label: 'Checklist', icon: ListChecks },
            { id: 'organizacoes', label: 'Organizações', icon: Building2 },
            { id: 'relatorio', label: 'Relatório', icon: FileText },
            { id: 'normas', label: 'Normas', icon: Scale },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            className={tab === item.id ? 'active' : ''}
            onClick={() => setTab(item.id)}
          >
            <item.icon size={14} />
            {item.label}
          </button>
        ))}
      </nav>

      {tab === 'tipos' && (
        <section className="config-modular-card">
          <h2>
            <Brain size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Cadastrar tipo
          </h2>
          <p className="config-modular-hint">
            Isola checklist/normas por domínio (ocupação ≠ acesso ≠ PAC ≠ POC/PPU).
          </p>
          <div className="config-modular-grid">
            <label>
              Nome *
              <input value={tipoNome} onChange={(e) => setTipoNome(e.target.value)} />
            </label>
            <label>
              Categoria
              <select
                value={tipoCategoria}
                onChange={(e) => setTipoCategoria(e.target.value as TipoAnaliseCategoria)}
              >
                {CATEGORIA_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Descrição *
            <textarea
              value={tipoDescricao}
              onChange={(e) => setTipoDescricao(e.target.value)}
              rows={2}
            />
          </label>
          <label>
            Orientação de prompt (opcional)
            <textarea value={tipoPrompt} onChange={(e) => setTipoPrompt(e.target.value)} rows={2} />
          </label>
          <button
            type="button"
            className="config-modular-btn"
            onClick={() => {
              void (async () => {
                setError(null)
                try {
                  if (!tipoNome.trim() || !tipoDescricao.trim()) {
                    setError('Nome e descrição são obrigatórios.')
                    return
                  }
                  await saveTipoAnalise({
                    nome: tipoNome,
                    slug: '',
                    categoria: tipoCategoria,
                    descricao: tipoDescricao,
                    normasFontes: [],
                    documentosSugeridos: [],
                    requisitos: [],
                    promptOrientacao: tipoPrompt || undefined,
                  })
                  setTipoNome('')
                  setTipoDescricao('')
                  setTipoPrompt('')
                  flash('Tipo de análise salvo.')
                  await reload()
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Erro ao salvar tipo.')
                }
              })()
            }}
          >
            Salvar tipo
          </button>

          <h3 style={{ marginTop: 24 }}>Tipos ativos</h3>
          <ul className="config-modular-list">
            {tipos.map((tipo) => (
              <li key={tipo.id}>
                <button
                  type="button"
                  className="config-modular-linkish"
                  onClick={() => {
                    setTipoSelecionadoId(tipo.id)
                    setTab('checklist')
                  }}
                >
                  <strong>{tipo.nome}</strong>
                </button>
                <span>
                  {tipo.categoria} · {tipo.requisitos?.length ?? 0} itens · {tipo.descricao}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === 'checklist' && (
        <section className="config-modular-card">
          <h2>
            <ListChecks size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Checklist do tipo de análise
          </h2>
          <p className="config-modular-hint">
            Itens salvos aqui entram na próxima análise do tipo (prioridade sobre checklist do
            perfil). Use prefixos OCUP_/ACESSO_/PAC_/POC_/PPU_ conforme o domínio.
          </p>
          <label>
            Tipo
            <select
              value={tipoSelecionadoId}
              onChange={(e) => setTipoSelecionadoId(e.target.value)}
            >
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </label>

          {tipoSelecionado && (
            <>
              <ul className="config-modular-list">
                {(tipoSelecionado.requisitos ?? []).map((req) => (
                  <li key={req.id}>
                    <strong>{req.id}</strong>
                    <span>
                      {req.categoria ? `[${req.categoria}] ` : ''}
                      {req.descricao}
                    </span>
                    <button
                      type="button"
                      className="config-modular-btn-secondary"
                      onClick={() => {
                        void (async () => {
                          try {
                            const next = (tipoSelecionado.requisitos ?? []).filter(
                              (r) => r.id !== req.id,
                            )
                            await updateTipoAnalise(tipoSelecionado.id, { requisitos: next })
                            flash('Item removido.')
                            await reload()
                          } catch (err) {
                            setError(err instanceof Error ? err.message : 'Erro ao remover.')
                          }
                        })()
                      }}
                    >
                      Remover
                    </button>
                  </li>
                ))}
              </ul>

              <div className="config-modular-grid">
                <label>
                  ID do item *
                  <input value={reqId} onChange={(e) => setReqId(e.target.value)} placeholder="POC_01" />
                </label>
                <label>
                  Categoria (opcional)
                  <input value={reqCat} onChange={(e) => setReqCat(e.target.value)} />
                </label>
              </div>
              <label>
                Descrição *
                <textarea value={reqDesc} onChange={(e) => setReqDesc(e.target.value)} rows={2} />
              </label>
              <button
                type="button"
                className="config-modular-btn"
                onClick={() => {
                  void (async () => {
                    try {
                      if (!reqId.trim() || !reqDesc.trim()) {
                        setError('ID e descrição do item são obrigatórios.')
                        return
                      }
                      const item: RequisitoChecklist = {
                        id: reqId.trim(),
                        descricao: reqDesc.trim(),
                        ...(reqCat.trim() ? { categoria: reqCat.trim() } : {}),
                      }
                      const existing = tipoSelecionado.requisitos ?? []
                      if (existing.some((r) => r.id === item.id)) {
                        setError('Já existe um item com este ID neste tipo.')
                        return
                      }
                      await updateTipoAnalise(tipoSelecionado.id, {
                        requisitos: [...existing, item],
                      })
                      setReqId('')
                      setReqDesc('')
                      setReqCat('')
                      flash('Item de checklist adicionado.')
                      await reload()
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Erro ao salvar item.')
                    }
                  })()
                }}
              >
                Adicionar item
              </button>
            </>
          )}
        </section>
      )}

      {tab === 'organizacoes' && (
        <section className="config-modular-card">
          <h2>
            <Building2 size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Organizações
          </h2>
          <p className="config-modular-hint">
            Alias suave sobre concessionárias (mesmo ID). Cadastro completo continua no{' '}
            <Link to="/concessionarias/nova">wizard</Link>. Aqui você ajusta categoria/área.
          </p>
          <ul className="config-modular-list">
            {organizacoes.length === 0 && (
              <li>
                <span>Nenhuma organização carregada. Crie pelo wizard ou verifique o Firestore.</span>
              </li>
            )}
            {organizacoes.map((org) => (
              <li key={org.id}>
                <button
                  type="button"
                  className="config-modular-linkish"
                  onClick={() => setOrgSelecionadaId(org.id)}
                >
                  <strong>{org.nome}</strong>
                </button>
                <span>
                  {org.categoria} · {org.area || '—'} · {org.perfilCompleto ? 'completo' : 'incompleto'}
                </span>
              </li>
            ))}
          </ul>
          {orgSelecionada && (
            <>
              <h3>Editar: {orgSelecionada.nome}</h3>
              <div className="config-modular-grid">
                <label>
                  Categoria
                  <select
                    value={orgCategoria}
                    onChange={(e) =>
                      setOrgCategoria(e.target.value as Organizacao['categoria'])
                    }
                  >
                    {ORGANIZACAO_CATEGORIA_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Área
                  <input value={orgArea} onChange={(e) => setOrgArea(e.target.value)} />
                </label>
              </div>
              <button
                type="button"
                className="config-modular-btn"
                onClick={() => {
                  void (async () => {
                    try {
                      await updateOrganizacaoMeta(orgSelecionada.id, {
                        categoria: orgCategoria,
                        area: orgArea,
                      })
                      flash('Organização atualizada.')
                      await reload()
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Erro ao salvar organização.')
                    }
                  })()
                }}
              >
                Salvar organização
              </button>
            </>
          )}
        </section>
      )}

      {tab === 'relatorio' && (
        <section className="config-modular-card">
          <h2>
            <FileText size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Padrão de relatório
          </h2>
          <p className="config-modular-hint">
            Edita o modelo associado à organização (concessionária) selecionada.
          </p>
          <label>
            Organização
            <select
              value={orgSelecionadaId}
              onChange={(e) => setOrgSelecionadaId(e.target.value)}
            >
              {organizacoes.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            Título padrão
            <input value={tituloPadrao} onChange={(e) => setTituloPadrao(e.target.value)} />
          </label>
          <label>
            Template (Markdown)
            <textarea
              value={templateMarkdown}
              onChange={(e) => setTemplateMarkdown(e.target.value)}
              rows={10}
            />
          </label>
          <button
            type="button"
            className="config-modular-btn"
            disabled={!orgSelecionadaId}
            onClick={() => {
              void (async () => {
                try {
                  await updateOrganizacaoModeloRelatorio(orgSelecionadaId, {
                    tituloPadrao: tituloPadrao.trim() || 'Parecer Técnico',
                    templateMarkdown,
                    descricao: orgSelecionada?.modeloRelatorio?.descricao,
                  })
                  flash('Padrão de relatório salvo.')
                  await reload()
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Erro ao salvar modelo.')
                }
              })()
            }}
          >
            Salvar padrão
          </button>
        </section>
      )}

      {tab === 'normas' && (
        <section className="config-modular-card">
          <h2>
            <Scale size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Normas
          </h2>
          <p className="config-modular-hint">
            Catálogo embutido + normas custom da organização. Para cadastrar PDF/norma nova, use o{' '}
            <Link to="/concessionarias/nova">wizard</Link>.
          </p>
          <label>
            Organização
            <select
              value={orgSelecionadaId}
              onChange={(e) => setOrgSelecionadaId(e.target.value)}
            >
              {organizacoes.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome}
                </option>
              ))}
            </select>
          </label>
          <h3>Catálogo</h3>
          <ul className="config-modular-list">
            {FONTES_NORMATIVAS.slice(0, 40).map((n) => (
              <li key={n.id}>
                <strong>{n.titulo}</strong>
                <span>
                  {n.orgao}
                  {n.ano ? ` · ${n.ano}` : ''} · id: {n.id}
                </span>
              </li>
            ))}
          </ul>
          <h3>Custom da organização</h3>
          <ul className="config-modular-list">
            {(orgSelecionada?.normasCustom ?? []).length === 0 && (
              <li>
                <span>Nenhuma norma custom nesta organização.</span>
              </li>
            )}
            {(orgSelecionada?.normasCustom ?? []).map((n) => (
              <li key={n.id}>
                <strong>{n.titulo}</strong>
                <span>
                  {n.orgao} · {n.origem}
                  {n.arquivoNome ? ` · ${n.arquivoNome}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
