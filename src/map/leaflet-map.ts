import 'leaflet/dist/leaflet.css'
import * as L from 'leaflet'
import 'leaflet.heat'
import './map.css'
import type { HeatPoint } from '../analytics/recommendations'
import type { BinCandidate, ExistingBin, WasteReport } from '../domain/models'
import { toBinMarkers, toCandidateMarkers, toReportMarkers, type MapMarker } from './map-data'
import type { Coordinates, MapAdapter } from './map-types'

const TILE_URL =
  'https://mt.google.com/vt/lyrs=m&hl=ko_KR&scale=2&x={x}&y={y}&z={z}'

const TILE_ERROR_MESSAGE =
  '지도를 불러오지 못했습니다. 데이터 레이어는 계속 사용할 수 있습니다.'

function createTileLayer(onError: (message: string) => void, onReady: () => void) {
  let reportedError = false
  const layer = L.tileLayer(TILE_URL, {
    maxZoom: 20,
    attribution: '&copy; Google',
  })

  layer.on('tileerror', () => {
    if (reportedError) return
    reportedError = true
    onError(TILE_ERROR_MESSAGE)
  })
  layer.on('load', onReady)

  return layer
}

function popupContent(label: string): HTMLElement {
  const content = document.createElement('span')
  content.textContent = label
  return content
}

function markerStyle(marker: MapMarker): L.CircleMarkerOptions {
  if (marker.kind === 'bin') {
    return {
      className: 'map-marker map-marker--bin',
      color: '#315d7a',
      fillColor: '#7ec8f5',
      fillOpacity: 0.9,
      radius: 7,
      weight: 2,
    }
  }

  if (marker.kind === 'candidate') {
    return {
      className: 'map-marker map-marker--candidate',
      color: '#7a4800',
      fillColor: '#f5aa28',
      fillOpacity: 0.95,
      radius: 10,
      weight: 3,
    }
  }

  return {
    className: 'map-marker map-marker--report',
    color: marker.emphasized ? '#a81f19' : '#8a4141',
    fillColor: marker.emphasized ? '#ee5b4c' : '#cc8a84',
    fillOpacity: 0.95,
    radius: marker.emphasized ? 10 : 7,
    weight: marker.emphasized ? 3 : 2,
  }
}

function addMarkers(group: L.LayerGroup, markers: MapMarker[]): void {
  group.clearLayers()

  for (const marker of markers) {
    L.circleMarker([marker.latitude, marker.longitude], markerStyle(marker))
      .bindPopup(popupContent(marker.label))
      .addTo(group)
  }
}

function toLatLngs(points: HeatPoint[]): Array<[number, number, number]> {
  return points.map((point) => [point.latitude, point.longitude, point.weight])
}

export function createLeafletMap(
  container: HTMLElement,
  options: {
    center: Coordinates
    zoom: number
    onTileError(message: string): void
    onTileReady(): void
  },
): MapAdapter {
  container.classList.add('ssudam-map')

  const map = L.map(container).setView(
    [options.center.latitude, options.center.longitude],
    options.zoom,
  )
  const reportsLayer = L.layerGroup().addTo(map)
  const binsLayer = L.layerGroup().addTo(map)
  const candidatesLayer = L.layerGroup().addTo(map)
  let tileLayer = createTileLayer(options.onTileError, options.onTileReady).addTo(map)
  let heatLayer: L.Layer | undefined
  let selectedLocationLayer: L.CircleMarker | undefined
  let visibility = { reports: true, heat: true, bins: true, candidates: true }
  let destroyed = false

  const setLayerVisible = (layer: L.Layer, visible: boolean) => {
    if (visible && !map.hasLayer(layer)) {
      layer.addTo(map)
    }
    if (!visible && map.hasLayer(layer)) {
      map.removeLayer(layer)
    }
  }

  return {
    setView(center, zoom) {
      if (!destroyed) map.setView([center.latitude, center.longitude], zoom)
    },

    setSelectedLocation(location) {
      if (destroyed) return

      selectedLocationLayer?.remove()
      selectedLocationLayer = location
        ? L.circleMarker([location.latitude, location.longitude], {
            className: 'map-marker map-marker--selected',
            color: '#087c35',
            fill: false,
            opacity: 1,
            radius: 14,
            weight: 4,
          }).addTo(map)
        : undefined
    },

    onMapClick(listener) {
      const handler = (event: L.LeafletMouseEvent) => {
        listener({ latitude: event.latlng.lat, longitude: event.latlng.lng })
      }
      map.on('click', handler)

      return () => {
        map.off('click', handler)
      }
    },

    renderReports(reports: WasteReport[]) {
      if (!destroyed) addMarkers(reportsLayer, toReportMarkers(reports))
    },

    renderHeat(points: HeatPoint[]) {
      if (destroyed) return

      heatLayer?.remove()
      heatLayer = L.heatLayer(toLatLngs(points), {
        blur: 22,
        minOpacity: 0.3,
        radius: 30,
        gradient: { 0.2: '#f6e85a', 0.55: '#f09a2d', 1: '#d84335' },
      })
      if (visibility.heat) heatLayer.addTo(map)
    },

    renderBins(bins: ExistingBin[]) {
      if (!destroyed) addMarkers(binsLayer, toBinMarkers(bins))
    },

    renderCandidates(candidates: BinCandidate[]) {
      if (!destroyed) addMarkers(candidatesLayer, toCandidateMarkers(candidates))
    },

    setLayerVisibility(nextVisibility) {
      if (destroyed) return

      visibility = { ...nextVisibility }
      setLayerVisible(reportsLayer, visibility.reports)
      setLayerVisible(binsLayer, visibility.bins)
      setLayerVisible(candidatesLayer, visibility.candidates)
      if (heatLayer) setLayerVisible(heatLayer, visibility.heat)
    },

    retryTiles() {
      if (destroyed) return

      tileLayer.off()
      map.removeLayer(tileLayer)
      tileLayer = createTileLayer(options.onTileError, options.onTileReady).addTo(map)
    },

    destroy() {
      if (destroyed) return
      destroyed = true

      tileLayer.off()
      map.off('click')
      reportsLayer.clearLayers()
      binsLayer.clearLayers()
      candidatesLayer.clearLayers()
      heatLayer?.remove()
      selectedLocationLayer?.remove()
      map.remove()
      container.classList.remove('ssudam-map')
    },
  }
}
