import * as maplibregl from 'maplibre-gl'
import type { Feature, FeatureCollection } from 'geojson'
import { useEffect, useRef, useState } from 'react'
import type { Point } from '../../types'

const QUITO_CENTER: Point = [-78.492, -0.181]

const mapStyle: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'quito-base': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#0b1625' },
    },
    {
      id: 'quito-base',
      type: 'raster',
      source: 'quito-base',
      paint: {
        'raster-opacity': 0.85,
        'raster-saturation': -0.8,
        'raster-contrast': 0.35,
        'raster-brightness-min': 0.08,
        'raster-brightness-max': 0.48,
      },
    },
  ],
}

function emptyFeatures(): FeatureCollection {
  return { type: 'FeatureCollection', features: [] }
}

function sketchFeatures(points: Point[]): FeatureCollection {
  if (!points.length) return emptyFeatures()
  const markers: Feature[] = points.map(([lng, lat], index) => ({
    type: 'Feature',
    properties: { index },
    geometry: { type: 'Point', coordinates: [lng, lat] },
  }))

  if (points.length < 3) {
    return {
      type: 'FeatureCollection',
      features: [
        ...markers,
        {
          type: 'Feature',
          properties: {},
          geometry: { type: 'LineString', coordinates: points },
        },
      ],
    }
  }

  return {
    type: 'FeatureCollection',
    features: [
      ...markers,
      {
        type: 'Feature',
        properties: {},
        geometry: { type: 'Polygon', coordinates: [[...points, points[0]]] },
      },
    ],
  }
}

export function MapWorkspace({
  zones,
  draftPoints,
  onPoint,
  readOnly = false,
}: {
  zones: FeatureCollection
  draftPoints: Point[]
  onPoint: (point: Point) => void
  readOnly?: boolean
}) {
  const node = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const onPointRef = useRef(onPoint)
  const [loaded, setLoaded] = useState(false)
  const [canvas, setCanvas] = useState({ width: 0, height: 0 })
  const [projectedPoints, setProjectedPoints] = useState<Array<{ x: number; y: number }>>([])

  useEffect(() => {
    onPointRef.current = onPoint
  }, [onPoint])

  useEffect(() => {
    if (!node.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: node.current,
      style: mapStyle,
      center: QUITO_CENTER,
      zoom: 12.2,
      attributionControl: false,
    })

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')

    map.on('load', () => {
      // Capa de zonas existentes
      map.addSource('territory-zones', { type: 'geojson', data: emptyFeatures() })
      map.addLayer({
        id: 'territory-zone-fill',
        type: 'fill',
        source: 'territory-zones',
        paint: {
          'fill-color': ['match', ['get', 'status'], 'published', '#b7ff3c', 'draft', '#60a5fa', '#fbbf24'],
          'fill-opacity': 0.35,
        },
      })
      map.addLayer({
        id: 'territory-zone-outline',
        type: 'line',
        source: 'territory-zones',
        paint: {
          'line-color': ['match', ['get', 'status'], 'published', '#b7ff3c', 'draft', '#60a5fa', '#fbbf24'],
          'line-width': 3,
        },
      })

      // Capa del borrador actual
      map.addSource('territory-draft', { type: 'geojson', data: emptyFeatures() })
      map.addLayer({
        id: 'territory-draft-fill',
        type: 'fill',
        source: 'territory-draft',
        paint: { 'fill-color': '#b7ff3c', 'fill-opacity': 0.34 },
      })
      map.addLayer({
        id: 'territory-draft-glow',
        type: 'line',
        source: 'territory-draft',
        paint: { 'line-color': '#1d4ed8', 'line-width': 10, 'line-opacity': 0.5, 'line-blur': 2 },
      })
      map.addLayer({
        id: 'territory-draft-line',
        type: 'line',
        source: 'territory-draft',
        paint: { 'line-color': '#b7ff3c', 'line-width': 4, 'line-opacity': 1 },
      })
      map.addLayer({
        id: 'territory-draft-points',
        type: 'circle',
        source: 'territory-draft',
        filter: ['==', '$type', 'Point'],
        paint: {
          'circle-radius': 8,
          'circle-color': '#b7ff3c',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#06101b',
        },
      })

      if (!readOnly) {
        map.on('click', (event: maplibregl.MapMouseEvent) => {
          onPointRef.current([event.lngLat.lng, event.lngLat.lat])
        })
      }

      setLoaded(true)
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [readOnly])

  useEffect(() => {
    if (loaded && mapRef.current) {
      const source = mapRef.current.getSource('territory-zones') as maplibregl.GeoJSONSource | undefined
      source?.setData(zones)
    }
  }, [loaded, zones])

  useEffect(() => {
    if (loaded && mapRef.current) {
      const source = mapRef.current.getSource('territory-draft') as maplibregl.GeoJSONSource | undefined
      source?.setData(sketchFeatures(draftPoints))
    }
  }, [draftPoints, loaded])

  useEffect(() => {
    const map = mapRef.current
    if (!loaded || !map) return

    const updateOverlay = () => {
      const container = map.getContainer()
      setCanvas({ width: container.clientWidth, height: container.clientHeight })
      setProjectedPoints(draftPoints.map(([longitude, latitude]) => map.project([longitude, latitude])))
    }

    updateOverlay()
    map.on('move', updateOverlay)
    map.on('resize', updateOverlay)

    return () => {
      map.off('move', updateOverlay)
      map.off('resize', updateOverlay)
    }
  }, [draftPoints, loaded])

  const path = projectedPoints.map((point) => `${point.x},${point.y}`).join(' ')
  const polygon = projectedPoints.length >= 3 ? path : ''

  return (
    <div className="relative h-full min-h-[480px] w-full" aria-label="Mapa de administración de territorios">
      <div ref={node} className="h-full min-h-[480px] w-full" />
      {canvas.width > 0 && (
        <svg
          className="pointer-events-none absolute inset-0 z-10 h-full w-full"
          viewBox={`0 0 ${canvas.width} ${canvas.height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {polygon && (
            <polygon
              points={polygon}
              fill="#b7ff3c"
              fillOpacity="0.32"
              stroke="#b7ff3c"
              strokeWidth="4"
              strokeLinejoin="round"
            />
          )}
          {projectedPoints.length > 1 && (
            <polyline
              points={path}
              fill="none"
              stroke="#2563eb"
              strokeWidth="10"
              strokeOpacity="0.42"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {projectedPoints.length > 1 && (
            <polyline
              points={path}
              fill="none"
              stroke="#b7ff3c"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {projectedPoints.map((point, index) => (
            <g key={`${point.x}-${point.y}-${index}`}>
              <circle cx={point.x} cy={point.y} r="10" fill="#06101b" opacity="0.85" />
              <circle cx={point.x} cy={point.y} r="6" fill="#b7ff3c" />
              <text
                x={point.x}
                y={point.y + 4}
                textAnchor="middle"
                fontSize="9"
                fontWeight="700"
                fill="#06101b"
              >
                {index + 1}
              </text>
            </g>
          ))}
        </svg>
      )}
    </div>
  )
}
