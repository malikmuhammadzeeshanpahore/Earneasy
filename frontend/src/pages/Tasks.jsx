import React, {useEffect, useState} from 'react'
import api from '../services/api'
import { useToast } from '../components/Toast'

const SAMPLE_TASKS = [
  {id:'t1', title:'Watch a video ad', reward:0.2, type:'video'},
  {id:'t2', title:'Complete short survey', reward:0.5, type:'survey'},
  {id:'t3', title:'Take a quiz', reward:0.3, type:'quiz'},
]

export default function Tasks(){
  const toast = useToast()
  const [user,setUser]=useState(null)
  const [tasks,setTasks]=useState(SAMPLE_TASKS)

  useEffect(()=>{
    async function load(){
      try{
        const token = localStorage.getItem('de_token')
        if(token){ api.setToken(token); const meRes = await api.me(); if(meRes.user) setUser(meRes.user) }
        const tRes = await api.getTasks()
        if(tRes.tasks) setTasks(tRes.tasks)
      }catch(e){
        console.error('Failed to load tasks or user', e)
      }
    }
    load()
  },[])
  async function doTask(task){
    if(!user){ toast.show('Please sign in', 'info'); return }
    try{
      api.setToken(localStorage.getItem('de_token'))
      const r = await api.completeTask(task.id)
      if(r.error){ toast.show(r.error, 'error'); return }
      toast.show(`Task completed — +$${task.reward}`, 'success')
      const me = await api.me()
      if(me.user) { localStorage.setItem('de_user', JSON.stringify(me.user)); setUser(me.user) }
    }catch(e){ toast.show('Server error', 'error') }
  }

  return (
    <div>
      <h2>Daily Tasks</h2>
      <p className="muted small">Tasks below are limited by your package (demo allows all).</p>
      <div className="grid" style={{marginTop:12}}>
        {tasks.map(t=> (
          <div className="card" key={t.id}>
            <div className="spaced">
              <div>
                <strong>{t.title}</strong>
                <p className="muted small">Reward: ${t.reward}</p>
              </div>
              <div>
                <button className="btn" onClick={()=>doTask(t)}>Complete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
