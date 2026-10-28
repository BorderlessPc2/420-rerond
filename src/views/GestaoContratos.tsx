import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { atualizarContrato, criarContrato, listContratos, type Contrato } from '../services/gestaoContratos'
import './GestaoContratos.css'

export default function GestaoContratos() {
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [nome, setNome] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Contrato | null>(null)
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
  return <div className="gestao-page">
    <header className="gestao-header"><div><span className="gestao-eyebrow">Operação por contrato</span><h1>Gestão de Contratos</h1><p>Selecione um contrato para acompanhar aprovações, pontos e entregas.</p></div><button type="button" onClick={() => setCreating(!creating)} aria-expanded={creating} aria-controls="gestao-criar-contrato">{creating ? 'Fechar cadastro' : 'Novo contrato'}</button></header>
    {error && <p className="gestao-error" role="alert">{error}</p>}
    {creating && <section id="gestao-criar-contrato" className="gestao-panel"><h2>Novo contrato</h2><form onSubmit={(event) => void save(event)} className="gestao-form"><label htmlFor="gestao-nome">Nome do contrato</label><input id="gestao-nome" name="nome" value={nome} onChange={(event) => setNome(event.target.value)} required /><button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Criar contrato'}</button></form></section>}
    <section><div className="gestao-section-head"><div><h2>Contratos</h2><p>{contratos.length} {contratos.length === 1 ? 'contrato disponível' : 'contratos disponíveis'}</p></div></div>
      {editing && <section className="gestao-panel"><h2>Editar contrato</h2><form onSubmit={(event) => void saveEdit(event)} className="gestao-form"><label htmlFor="gestao-editar-nome">Nome do contrato</label><input id="gestao-editar-nome" value={editing.nome} onChange={(event) => setEditing({ ...editing, nome: event.target.value })} required /><div className="gestao-actions"><button type="submit" disabled={saving}>{saving ? 'Salvando…' : 'Salvar alterações'}</button><button type="button" className="gestao-button-secondary" onClick={() => setEditing(null)}>Cancelar</button></div></form></section>}
      {loading ? <p>Carregando contratos…</p> : contratos.length ? <ul className="gestao-grid">{contratos.map((contrato) => <li key={contrato.id}><div className="gestao-card gestao-contract-card"><Link to={`/gestao-contratos/${contrato.id}`}><span className="gestao-eyebrow">Contrato</span><strong>{contrato.nome}</strong><span>Abrir visão do contrato <span aria-hidden="true">↗</span></span></Link><button type="button" className="gestao-button-secondary" onClick={() => setEditing(contrato)}>Editar contrato</button></div></li>)}</ul> : <div className="gestao-empty"><h3>Nenhum contrato cadastrado</h3><p>Crie o primeiro contrato para organizar protocolos e pontos sem misturar operações.</p><button type="button" onClick={() => setCreating(true)}>Criar contrato</button></div>}
    </section>
  </div>
}
