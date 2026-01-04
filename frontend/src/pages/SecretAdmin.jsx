import React, { useEffect } from 'react'
import { useParams, Navigate } from 'react-router-dom'
import api from '../services/api'
import Admin from './Admin'

export default function SecretAdmin(){
  const { code } = useParams()

  useEffect(()=>{
    if(code) api.setAdminSecret(code)
  },[code])

  // render admin UI; access will depend on backend checking x-admin-secret header
  if(!code) return <Navigate to="/" />
  return <Admin />
}
