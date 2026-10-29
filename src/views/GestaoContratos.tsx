import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { atualizarContrato, criarContrato, excluirContrato, listContratos, type Contrato } from '../services/gestaoContratos'
import ModalGestao from '../components/gestao/ModalGestao'
import './GestaoContratos.css'

export default function GestaoContratos() {
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [nome, setNome] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Contrato | null>(null)
  const [deleting, setDeleting] = useState<Contrato | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const load = async () => { try { setContratos(await listContratos()); setError('') } catch (err) { setError(err instanceof Error ? err.message : 'Erro ao carregar contratos.') } finally { setLoading(false) } }
  useEffect(() => { void load() }, [])
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true)
    try { await criarContrato(nome); setNome(''); setCreating(false); await load() } catch (err) { setError(err instanceof Error ? err.message : 'Erro ao criar contrato.') } finally { setSaving(false) }
  }
  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault(); if (!editing) return; setSaving(true)
    try { await atualizarContrato(editing.id, { nome: editing.nome, clienteId: editing.clienteId }); setEditing(null); await load() } catch (err) { setError(err instanceof Error ? err.message : 'Erro ao editar contrato.') } finally { setSaving(false) }
  }
  const remove = async () => {
    if (!deleting) return
    setSaving(true)
    try { await excluirContrato(deleting.id); setDeleting(null); setMenuOpen(null); await load() } catch (err) { setError(err instanceof Error ? err.message : 'Erro ao excluir contrato.') } finally { setSaving(false) }
  }
  return <div className="gestao-page">
    <header className="gestao-header"><div><span className="gestao-eyebrow">Operação por contrato</span><h1>Gestão de Contratos</h1><p>Selecione um contrato para acompanhar aprovações, pontos e entregas.</p></div><button type="button" onClick={() => setCreating(true)} aria-haspopup="dialog">Novo contrato</button></header>
    {error && <p className="gestao-error" role="alert">{error}</p>}
    <ModalGestao open={creating} title="Novo contrato" description="Crie um contexto separado para acompanhar protocolos e pontos." labelledBy="gestao-criar-contrato-title" onClose={() => setCreating(false)}><form onSubmit={(event) => void save(event)} className="gestao-form"><label htmlFor="gestao-nome">Nome do contrato</label><input id="gestao-nome" name="nome" value={nome} onChange={(event) => setNome(event.target.value)} required /><button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Criar contrato'}</button></form></ModalGestao>
    <ModalGestao open={Boolean(editing)} title="Editar contrato" description="Atualize o nome usado na operação." labelledBy="gestao-editar-contrato-title" onClose={() => setEditing(null)}>{editing && <form onSubmit={(event) => void saveEdit(event)} className="gestao-form gestao-contract-edit-form"><div className="gestao-contract-edit-field"><label htmlFor="gestao-editar-nome">Nome do contrato</label><span>Este nome aparece no painel e nos fluxos vinculados.</span><input id="gestao-editar-nome" value={editing.nome} onChange={(event) => setEditing({ ...editing, nome: event.target.value })} required /></div><div className="gestao-form-footer"><button type="button" className="gestao-button-secondary" onClick={() => setEditing(null)}>Cancelar</button><button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar alterações'}</button></div></form>}</ModalGestao>
    <section><div className="gestao-section-head"><div><h2>Contratos</h2><p>{contratos.length} {contratos.length === 1 ? 'contrato disponível' : 'contratos disponíveis'}</p></div></div>
      {loading ? <p>Carregando contratos…</p> : contratos.length ? <ul className="gestao-grid">{contratos.map((contrato) => <li className="gestao-contract-item" key={contrato.id}><Link className="gestao-card gestao-contract-card" to={`/gestao-contratos/${contrato.id}`}><span className="gestao-eyebrow">Contrato</span><strong>{contrato.nome}</strong><span>Abrir visão geral <span aria-hidden="true">↗</span></span></Link><div className="gestao-contract-menu"><button type="button" className="gestao-menu-trigger" aria-label={`Ações de ${contrato.nome}`} aria-expanded={menuOpen === contrato.id} onClick={() => setMenuOpen(menuOpen === contrato.id ? null : contrato.id)}><span /><span /><span /></button>{menuOpen === contrato.id && <div className="gestao-menu-panel"><button type="button" onClick={() => { setEditing(contrato); setMenuOpen(null) }}>Editar contrato</button><button type="button" className="gestao-menu-danger" onClick={() => { setDeleting(contrato); setMenuOpen(null) }}>Excluir contrato</button></div>}</div></li>)}</ul> : <div className="gestao-empty"><h3>Nenhum contrato cadastrado</h3><p>Crie o primeiro contrato para organizar protocolos e pontos sem misturar operações.</p><button type="button" onClick={() => setCreating(true)} aria-haspopup="dialog">Criar contrato</button></div>}
    <ModalGestao open={Boolean(deleting)} title="Excluir contrato?" description="Esta ação remove o contrato e todos os protocolos, pontos e movimentações vinculados." labelledBy="gestao-excluir-contrato-title" onClose={() => setDeleting(null)}>{deleting && <div className="gestao-delete-confirm"><strong>{deleting.nome}</strong><p>Não será possível recuperar esses dados depois da exclusão.</p><div className="gestao-form-footer"><button type="button" className="gestao-button-secondary" onClick={() => setDeleting(null)}>Cancelar</button><button type="button" className="gestao-danger-button" onClick={() => void remove()} disabled={saving}>{saving ? 'Excluindo…' : 'Excluir contrato'}</button></div></div>}</ModalGestao>
    </section>
  </div>
}
