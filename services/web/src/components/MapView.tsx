'use client'

import { useEffect, useRef, useState } from 'react'
import Map, { MapRef, Source, Layer, Marker } from 'react-map-gl'
import { useNodes } from '@/hooks/useNodes'
import { useH3Grid } from '@/hooks/useH3Grid'
import 'mapbox-gl/dist/mapbox-gl.css'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

interface Node {
  id: string
  shortName?: string
  longName?: string
  latitude?: number
  longitude?: number
}

interface H3Grid {
  id: string
  packetCount: number
  nodeCount: number
  boundary: number[][]
}

export function MapView() {
  const mapRef = useRef<MapRef>(null)
  const [viewport, setViewport] = useState({
    longitude: 0,
    latitude: 30,
    zoom: 2,
  })

  const { nodes } = useNodes()
  const { grids } = useH3Grid()

  return (
    <div className="w-full h-full">
      <Map
        ref={mapRef}
        {...viewport}
        onMove={(evt) => setViewport(evt.viewState)}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
        style={{ width: '100%', height: '100%' }}
      >
        {/* H3 Grid Layer */}
        {grids && grids.length > 0 && (
          <Source
            id="h3-grid"
            type="geojson"
            data={{
              type: 'FeatureCollection',
              features: grids.map((grid: H3Grid) => ({
                type: 'Feature',
                geometry: {
                  type: 'Polygon',
                  coordinates: [grid.boundary],
                },
                properties: {
                  packetCount: grid.packetCount,
                  nodeCount: grid.nodeCount,
                },
              })),
            }}
          >
            <Layer
              id="h3-fill"
              type="fill"
              paint={{
                'fill-color': [
                  'interpolate',
                  ['linear'],
                  ['get', 'packetCount'],
                  0, '#67C186',
                  100, '#4A9D6F',
                  500, '#2E7A58',
                  1000, '#1A5840',
                ],
                'fill-opacity': 0.4,
              }}
            />
            <Layer
              id="h3-outline"
              type="line"
              paint={{
                'line-color': '#67C186',
                'line-width': 1,
                'line-opacity': 0.6,
              }}
            />
          </Source>
        )}

        {/* Node Markers */}
        {nodes &&
          nodes
            .filter((node: Node) => node.latitude && node.longitude)
            .map((node: Node) => (
              <Marker
                key={node.id}
                longitude={node.longitude!}
                latitude={node.latitude!}
              >
                <div className="relative group">
                  <div className="w-3 h-3 bg-meshtastic-primary rounded-full border-2 border-white shadow-lg" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap z-10">
                    {node.shortName || node.longName || node.id}
                  </div>
                </div>
              </Marker>
            ))}
      </Map>

      {/* Map Controls */}
      <div className="absolute top-4 left-4 bg-gray-900 rounded-lg p-3 shadow-lg">
        <p className="text-xs text-gray-400">Active Nodes</p>
        <p className="text-2xl font-bold text-meshtastic-primary">
          {nodes?.length || 0}
        </p>
      </div>
    </div>
  )
}
