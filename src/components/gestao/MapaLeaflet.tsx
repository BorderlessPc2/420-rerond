import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Ponto, Protocolo } from '../../services/gestaoContratos'
import { getMapBounds, getPontoColor, getPontoMapLabel, getPontoMapMeta, separarPontosSobrepostos } from './mapaUtils'
import { nomeGestao } from '../../views/gestaoUi'
import './MapaLeaflet.css'

export type MapaLeafletProps = {
  pontos: Ponto[]
  protocolos: Protocolo[]
  selectedPointId?: string
  onSelectPoint: (ponto: Ponto) => void
  height?: number
  fitBoundsOnChange?: boolean
  /** `all` enquadra o recorte. `selected` aproxima o ponto sem cobri-lo com a ficha. */
  viewMode?: 'selected' | 'all'
}

export default function MapaLeaflet({ pontos, protocolos, selectedPointId, onSelectPoint, height = 460, fitBoundsOnChange = true, viewMode }: MapaLeafletProps) {
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
          html: `<span class="gestao-pin${selected ? ' is-selected' : ''}${ponto.precisao === 'aproximada' ? ' is-approx' : ''}"><i style="--pin:${color};background:${color}"></i><b>${ponto.codigo.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char)}</b></span>`,
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
      map.fitBounds([[selected.latitude, selected.longitude], [selected.latitude, selected.longitude]], { paddingTopLeft: [48, 72], paddingBottomRight: [320, 48], maxZoom: 16, animate: true })
    } else if (viewMode === 'all' && bounds) {
      map.fitBounds(bounds, { padding: [56, 56], maxZoom: 15, animate: true })
    } else if (bounds && fitBoundsOnChange && !selectedPointId) {
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15 })
    } else if (selected) {
      map.setView([selected.latitude, selected.longitude], Math.max(map.getZoom(), 14), { animate: true })
    }
  }, [pontos, protocolos, selectedPointId, onSelectPoint, fitBoundsOnChange, viewMode])

  if (mapError) return <div className="gestao-map-fallback" style={{ minHeight: height }} role="status"><strong>Mapa temporariamente indisponível.</strong><span>Os dados e pontos continuam disponíveis nas listas. Abra a aba de pontos para registrar ou revisar coordenadas.</span></div>
  return <div className="gestao-map-frame" style={{ height }}>
    <div ref={elementRef} className="gestao-leaflet-map" style={{ height }} role="application" aria-label="Mapa interativo dos pontos do contrato" />
    <div className={`gestao-map-skeleton${mapReady ? ' is-done' : ''}`} aria-hidden={mapReady} role={mapReady ? undefined : 'status'}>
      {!mapReady && <span className="gestao-sr">Carregando mapa</span>}
      <i /><i /><i />
    </div>
  </div>
}
