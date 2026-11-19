import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Ponto, Protocolo } from '../../services/gestaoContratos'
import { getMapBounds, getPontoColor, getPontoMapLabel, getPontoMapMeta, marcadoresDeProtocolo, separarPontosSobrepostos } from './mapaUtils'
import { nomeGestao } from '../../views/gestaoUi'
import './MapaLeaflet.css'

export type MapaLeafletProps = {
  pontos: Ponto[]
  protocolos: Protocolo[]
  selectedPointId?: string
  onSelectPoint: (ponto: Ponto) => void
  onSelectProtocolo?: (protocolo: Protocolo) => void
  /** `pontos` desenha cada localização. `protocolos` desenha um marcador por protocolo. */
  camada?: 'pontos' | 'protocolos'
  height?: number
  fitBoundsOnChange?: boolean
  /** `all` enquadra o recorte. `selected` aproxima o ponto sem cobri-lo com a ficha. */
  viewMode?: 'selected' | 'all'
}

const textoMapa = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char)

export default function MapaLeaflet({ pontos, protocolos, selectedPointId, onSelectPoint, onSelectProtocolo, camada = 'pontos', height = 460, fitBoundsOnChange = true, viewMode }: MapaLeafletProps) {
  const [mapError, setMapError] = useState(false)
  const [mapReady, setMapReady] = useState(false)
  const elementRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layersRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    if (mapRef.current) { setMapReady(true); return }
    if (!elementRef.current || mapError) return
    try {
      const map = L.map(elementRef.current, { zoomControl: true, scrollWheelZoom: false })
      const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 })
      tiles.on('tileerror', () => setMapError(true))
      tiles.addTo(map)
      map.setView([-14.2, -51.9], 4)
      const container = map.getContainer()
      container.addEventListener('pointerdown', () => map.scrollWheelZoom.enable())
      container.addEventListener('mouseleave', () => map.scrollWheelZoom.disable())
      map.whenReady(() => setMapReady(true))
      mapRef.current = map
      layersRef.current = L.layerGroup().addTo(map)
      return () => { map.remove(); mapRef.current = null; layersRef.current = null }
    } catch {
      window.setTimeout(() => setMapError(true), 0)
    }
  }, [mapError])

  useEffect(() => {
    const map = mapRef.current
    const layers = layersRef.current
    if (!map || !layers) return
    layers.clearLayers()
    if (camada === 'protocolos') {
      const marcadores = marcadoresDeProtocolo(protocolos, pontos)
      marcadores.forEach((marcador) => {
        const { protocolo, latitude, longitude, total } = marcador
        const color = getPontoColor({ id: '', contratoId: protocolo.contratoId, protocoloId: protocolo.id, codigo: '', estado: '', concessionaria: protocolo.concessionaria, rodovia: protocolo.rodovia, km: '', tipo: 'nova_implantacao' }, protocolo)
        const titulo = protocolo.titulo
        const resumo = `${total} ${total === 1 ? 'ponto' : 'pontos'}`
        const marker = L.marker([latitude, longitude], {
          icon: L.divIcon({
            className: 'gestao-pin-icon',
            html: `<span class="gestao-pin gestao-pin-protocolo"><i style="--pin:${color};background:${color}"></i><b>${textoMapa(titulo)}</b><small>${resumo}</small></span>`,
            iconSize: [240, 44],
            iconAnchor: [22, 22],
          }),
          keyboard: true,
          title: `${titulo} · ${resumo}`,
        })
        const popup = document.createElement('div')
        const code = document.createElement('strong')
        code.textContent = titulo
        const location = document.createElement('span')
        location.textContent = `${protocolo.concessionaria} · ${protocolo.rodovia}`
        const status = document.createElement('small')
        status.textContent = `${resumo} · ${nomeGestao(protocolo.status)}`
        popup.append(code, location, status)
        marker.bindPopup(popup, { closeButton: false, offset: [40, -4], className: 'gestao-map-popup', autoPan: true })
        const abrir = () => { marker.openPopup(); onSelectProtocolo?.(protocolo) }
        marker.on('click', abrir)
        marker.on('add', () => {
          const element = marker.getElement()
          if (!(element instanceof HTMLElement)) return
          element.tabIndex = 0
          element.setAttribute('role', 'button')
          element.setAttribute('aria-label', `Protocolo ${titulo}, ${resumo}`)
          element.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); abrir() }
          })
        })
        marker.addTo(layers)
      })
      const bounds = getMapBounds(marcadores.map((item) => ({ id: item.protocolo.id, contratoId: item.protocolo.contratoId, protocoloId: item.protocolo.id, codigo: item.protocolo.titulo, estado: '', concessionaria: item.protocolo.concessionaria, rodovia: item.protocolo.rodovia, km: '', tipo: 'nova_implantacao' as const, latitude: item.latitude, longitude: item.longitude })))
      if (bounds && fitBoundsOnChange) map.fitBounds(bounds, { padding: [48, 48], maxZoom: 12 })
      return
    }
    const located = separarPontosSobrepostos(pontos)
    located.forEach(({ ponto, latitude, longitude }) => {
      const protocolo = protocolos.find((item) => item.id === ponto.protocoloId)
      const selected = ponto.id === selectedPointId
      const color = getPontoColor(ponto, protocolo)
      const label = getPontoMapLabel(ponto)
      const meta = getPontoMapMeta(ponto, protocolo)
      const marker = L.marker([latitude, longitude], {
        icon: L.divIcon({
          className: 'gestao-pin-icon',
          html: `<span class="gestao-pin${selected ? ' is-selected' : ''}${ponto.precisao === 'aproximada' ? ' is-approx' : ''}"><i style="--pin:${color};background:${color}"></i><b>${textoMapa(ponto.codigo)}</b></span>`,
          iconSize: [156, 44],
          iconAnchor: [22, 22],
        }),
        keyboard: true,
        title: label,
        zIndexOffset: selected ? 800 : 0,
      })
      const popup = document.createElement('div')
      const code = document.createElement('strong')
      code.textContent = ponto.codigo
      const location = document.createElement('span')
      location.textContent = meta.location
      const status = document.createElement('small')
      status.textContent = `${nomeGestao(meta.status)}${ponto.precisao === 'aproximada' ? ' · coordenada aproximada' : ''}`
      popup.append(code, location, status)
      marker.bindPopup(popup, { closeButton: false, offset: [40, -4], className: 'gestao-map-popup', autoPan: true })
      marker.on('click', () => { marker.openPopup(); onSelectPoint(ponto) })
      marker.on('add', () => {
        const element = marker.getElement()
        if (!(element instanceof HTMLElement)) return
        element.tabIndex = 0
        element.setAttribute('role', 'button')
        element.setAttribute('aria-label', label)
        element.addEventListener('keydown', (event: KeyboardEvent) => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); marker.openPopup(); onSelectPoint(ponto) }
        })
        if (selected && viewMode === 'selected') marker.openPopup()
      })
      marker.addTo(layers)
    })
    const bounds = getMapBounds(located.map(({ ponto, latitude, longitude }) => ({ ...ponto, latitude, longitude })))
    const selected = located.find((item) => item.ponto.id === selectedPointId)
    if (viewMode === 'selected' && selected) {
      map.fitBounds([[selected.latitude, selected.longitude], [selected.latitude, selected.longitude]], { paddingTopLeft: [48, 72], paddingBottomRight: [380, 48], maxZoom: 16, animate: true })
    } else if (viewMode === 'all' && bounds) {
      map.fitBounds(bounds, { padding: [56, 56], maxZoom: 15, animate: true })
    } else if (bounds && fitBoundsOnChange && !selectedPointId) {
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 })
    } else if (selected) {
      map.setView([selected.latitude, selected.longitude], Math.max(map.getZoom(), 14), { animate: true })
    }
  }, [pontos, protocolos, selectedPointId, onSelectPoint, onSelectProtocolo, camada, fitBoundsOnChange, viewMode])

  if (mapError) return <div className="gestao-map-fallback" style={{ minHeight: height }} role="status"><strong>Mapa temporariamente indisponível.</strong><span>Os dados e pontos continuam disponíveis nas listas. Abra a aba de pontos para registrar ou revisar coordenadas.</span></div>
  return <div className="gestao-map-frame" style={{ height }}>
    <div ref={elementRef} className="gestao-leaflet-map" style={{ height }} role="application" aria-label={camada === 'protocolos' ? 'Mapa dos protocolos do contrato' : 'Mapa interativo dos pontos do contrato'} />
    <div className={`gestao-map-skeleton${mapReady ? ' is-done' : ''}`} aria-hidden={mapReady} role={mapReady ? undefined : 'status'}>
      {!mapReady && <span className="gestao-sr">Carregando mapa</span>}
      <i /><i /><i />
    </div>
  </div>
}
