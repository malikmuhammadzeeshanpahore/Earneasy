import React from 'react'

export default function Progress({value=0}){
  return (
    <div className="progress" title={`${value}%`}>
      <i style={{width: `${Math.max(0, Math.min(100, value))}%`}}></i>
    </div>
  )
}
