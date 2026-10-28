import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Ponto, Protocolo } from '../../services/gestaoContratos'
import { getMapBounds, getMapPoints, getPontoColor } from './mapaUtils'
import './MapaLeaflet.css'

export type MapaLeafletProps = {
  pontos: Ponto[]
  protocolos: Protocolo[]
  selectedPointId?: string
  onSelectPoint: (ponto: Ponto) => void
  height?: number
  fitBoundsOnChange?: boolean
}

export default function MapaLeaflet({ pontos, protocolos, selectedPointId, onSelectPoint, height = 460, fitBoundsOnChange = true }: MapaLeafletProps) {
  const [mapError, setMapError] = useState(false)
  const elementRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layersRef = useRef<L.LayerGroup | null>(null)
  const selectedPointIdRef = useRef(selectedPointId)
  selectedPointIdRef.current = selectedPointId

  useEffect(() => {
    if (!elementRef.current || mapRef.current || mapError) return
    try {
      const map = L.map(elementRef.current, { zoomControl: true, scrollWheelZoom: true })
      const tiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 })
      tiles.on('tileerror', () => setMapError(true))
      tiles.addTo(map)
      map.setView([-14.2, -51.9], 4)
      mapRef.current = map
      layersRef.current = L.layerGroup().addTo(map)
      return () => { map.remove(); mapRef.current = null; layersRef.current = null }
    } catch { setMapError(true) }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const layers = layersRef.current
    if (!map || !layers) return
    layers.clearLayers()
    const located = getMapPoints(pontos)
    located.forEach((ponto) => {
      const protocolo = protocolos.find((item) => item.id === ponto.protocoloId)
      const marker = L.circleMarker([ponto.latitude as number, ponto.longitude as number], {
        radius: ponto.id === selectedPointId ? 11 : 8,
        color: '#fff',
        weight: ponto.id === selectedPointId ? 4 : 2,
        fillColor: getPontoColor(ponto, protocolo),
        fillOpacity: 0.95,
      })
      const label = `${ponto.codigo}, ${ponto.rodovia} km ${ponto.km}`
      marker.bindTooltip(label)
      marker.on('click', () => onSelectPoint(ponto))
      marker.on('add', () => {
        const element = marker.getElement()
        if (!(element instanceof HTMLElement)) return
        element.tabIndex = 0
        element.setAttribute('role', 'button')
        element.setAttribute('aria-label', label)
        element.addEventListener('keydown', (event: KeyboardEvent) => {
          if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelectPoint(ponto) }
        })
      })
      marker.addTo(layers)
    })
    const bounds = getMapBounds(located)
    if (bounds && fitBoundsOnChange && !selectedPointIdRef.current) map.fitBounds(bounds, { padding: [32, 32], maxZoom: 14 })
    const selected = located.find((ponto) => ponto.id === selectedPointId)
    if (selected) map.setView([selected.latitude as number, selected.longitude as number], Math.max(map.getZoom(), 14))
  }, [pontos, protocolos, selectedPointId, onSelectPoint, fitBoundsOnChange])

  if (mapError) return <div className="gestao-map-fallback" style={{ minHeight: height }} role="status"><strong>Mapa temporariamente indisponível.</strong><span>Os dados e pontos continuam disponíveis nas listas. Abra a aba de pontos para registrar ou revisar coordenadas.</span></div>
  return <div ref={elementRef} className="gestao-leaflet-map" style={{ height }} aria-label="Mapa dos pontos do contrato" />
}
