import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { atualizarContrato, criarContrato, excluirContrato, listContratos, type Contrato, type ContratoInput } from '../services/gestaoContratos'
import ModalGestao from '../components/gestao/ModalGestao'
import GestaoLoadingSkeleton from '../components/gestao/GestaoLoadingSkeleton'
import { ContratoFormFields } from './gestaoContratoForm'
import { contratoFromModel, contratoVazio, resumoContratoGestao, tituloContratoGestao } from './gestaoContratoHelpers'
import { nomeGestao } from './gestaoUi'
import './GestaoContratos.css'

export default function GestaoContratos() {
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [draft, setDraft] = useState<ContratoInput>(contratoVazio())
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Contrato | null>(null)
  const [deleting, setDeleting] = useState<Contrato | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const load = async () => { try { setContratos(await listContratos()); setError('') } catch (err) { setError(err instanceof Error ? err.message : 'Erro ao carregar contratos.') } finally { setLoading(false) } }
  useEffect(() => { void load() }, [])
  useEffect(() => {
    if (!menuOpen) return
    const close = () => setMenuOpen(null)
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
    document.addEventListener('pointerdown', close)
    window.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('pointerdown', close); window.removeEventListener('keydown', onKeyDown) }
  }, [menuOpen])
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true)
    try { await criarContrato(draft); setDraft(contratoVazio()); setCreating(false); await load() } catch (err) { setError(err instanceof Error ? err.message : 'Erro ao criar contrato.') } finally { setSaving(false) }
  }
  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault(); if (!editing) return; setSaving(true)
    try { await atualizarContrato(editing.id, contratoFromModel(editing)); setEditing(null); await load() } catch (err) { setError(err instanceof Error ? err.message : 'Erro ao editar contrato.') } finally { setSaving(false) }
  }
  const remove = async () => {
    if (!deleting) return
    setSaving(true)
    try { await excluirContrato(deleting.id); setDeleting(null); setMenuOpen(null); await load() } catch (err) { setError(err instanceof Error ? err.message : 'Erro ao excluir contrato.') } finally { setSaving(false) }
  }
  return <div className="gestao-page">
    <header className="gestao-header"><div><span className="gestao-eyebrow">Operação por contrato</span><h1>Gestão de Contratos</h1><p>Selecione um contrato para acompanhar aprovações, pontos e entregas.</p></div><button type="button" onClick={() => { setDraft(contratoVazio()); setCreating(true) }} aria-haspopup="dialog">Novo contrato</button></header>
    {error && <p className="gestao-error" role="alert">{error}</p>}
    <ModalGestao open={creating} title="Novo contrato" description="Cadastre identificação e vigência do contrato operacional." labelledBy="gestao-criar-contrato-title" onClose={() => setCreating(false)}><form onSubmit={(event) => void save(event)} className="gestao-form gestao-form-grid"><ContratoFormFields idPrefix="gestao-criar" value={draft} onChange={setDraft} /><div className="gestao-form-footer"><button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Criar contrato'}</button></div></form></ModalGestao>
    <ModalGestao open={Boolean(editing)} title="Editar contrato" description="Atualize dados cadastrais usados na operação." labelledBy="gestao-editar-contrato-title" onClose={() => setEditing(null)}>{editing && <form onSubmit={(event) => void saveEdit(event)} className="gestao-form gestao-contract-edit-form gestao-form-grid"><ContratoFormFields idPrefix="gestao-editar" value={contratoFromModel(editing)} onChange={(next) => setEditing({ ...editing, ...next })} /><div className="gestao-form-footer"><button type="button" className="gestao-button-secondary" onClick={() => setEditing(null)}>Cancelar</button><button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar alterações'}</button></div></form>}</ModalGestao>
    <section><div className="gestao-section-head"><div><h2>Contratos</h2><p>{contratos.length} {contratos.length === 1 ? 'contrato disponível' : 'contratos disponíveis'}</p></div></div>
      {loading ? <GestaoLoadingSkeleton variant="contratos" label="Carregando contratos" /> : contratos.length ? <ul className="gestao-grid">{contratos.map((contrato) => <li className="gestao-contract-item" key={contrato.id}><Link className="gestao-card gestao-contract-card" to={`/gestao-contratos/${contrato.id}`}><span className="gestao-eyebrow">{contrato.numero?.trim() ? `Contrato ${contrato.numero}` : 'Contrato'}</span><strong>{contrato.nome}</strong><span>{resumoContratoGestao(contrato) || 'Abrir visão geral'} <span aria-hidden="true">↗</span></span>{contrato.situacao && contrato.situacao !== 'ativo' && <small className="gestao-status">{nomeGestao(contrato.situacao)}</small>}</Link><div className="gestao-contract-menu"><button type="button" className="gestao-menu-trigger" aria-label={`Ações de ${contrato.nome}`} aria-expanded={menuOpen === contrato.id} aria-controls={`gestao-menu-${contrato.id}`} onPointerDown={(event) => event.stopPropagation()} onClick={() => setMenuOpen(menuOpen === contrato.id ? null : contrato.id)}><span /><span /><span /></button>{menuOpen === contrato.id && <div id={`gestao-menu-${contrato.id}`} className="gestao-menu-panel" onPointerDown={(event) => event.stopPropagation()}><button type="button" onClick={() => { setEditing(contrato); setMenuOpen(null) }}>Editar contrato</button><button type="button" className="gestao-menu-danger" onClick={() => { setDeleting(contrato); setMenuOpen(null) }}>Excluir contrato</button></div>}</div></li>)}</ul> : <div className="gestao-empty"><h3>Nenhum contrato cadastrado</h3><p>Crie o primeiro contrato para organizar protocolos e pontos sem misturar operações.</p><button type="button" onClick={() => setCreating(true)} aria-haspopup="dialog">Criar contrato</button></div>}
    <ModalGestao open={Boolean(deleting)} title="Excluir contrato?" description="Esta ação remove o contrato e todos os protocolos, pontos e movimentações vinculados." labelledBy="gestao-excluir-contrato-title" onClose={() => setDeleting(null)}>{deleting && <div className="gestao-delete-confirm"><strong>{tituloContratoGestao(deleting.nome, deleting.numero)}</strong><p>Não será possível recuperar esses dados depois da exclusão.</p><div className="gestao-form-footer"><button type="button" className="gestao-button-secondary" onClick={() => setDeleting(null)}>Cancelar</button><button type="button" className="gestao-danger-button" onClick={() => void remove()} disabled={saving}>{saving ? 'Excluindo…' : 'Excluir contrato'}</button></div></div>}</ModalGestao>
    </section>
  </div>
}
