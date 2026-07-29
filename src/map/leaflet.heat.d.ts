import 'leaflet'

declare module 'leaflet.heat' {
  import 'leaflet'
}

declare module 'leaflet' {
  function heatLayer(
    latlngs: Array<[number, number, number]>,
    options?: {
      radius?: number
      blur?: number
      minOpacity?: number
      gradient?: Record<number, string>
    },
  ): Layer
}
