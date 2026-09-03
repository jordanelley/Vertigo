import { Fragment } from 'react'
import { Polyline } from 'react-leaflet'
import type { LatLng } from '../trails'
import { LIFTS } from '../lifts'
import { AnimatedGondolaCabins } from './AnimatedGondolaCabins'

export function LiftOverlays({ liftPaths }: { liftPaths: Record<string, LatLng[]> }) {
  return (
    <>
      {LIFTS.map((lift) => {
        const points = liftPaths[lift.name]
        if (!points) return null
        return (
          <Fragment key={lift.name}>
            <Polyline
              positions={points}
              pathOptions={{ color: '#9ca3af', weight: 1.5, dashArray: '2 10', opacity: 0.8 }}
            />
            <AnimatedGondolaCabins points={points} />
          </Fragment>
        )
      })}
    </>
  )
}
