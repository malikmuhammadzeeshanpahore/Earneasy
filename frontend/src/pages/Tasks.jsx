import React, {useEffect, useState} from 'react'
import api from '../services/api'

const SAMPLE_TASKS = [
  {id:'t1', title:'Watch a video ad', reward:0.2, type:'video'},
  {id:'t2', title:'Complete short survey', reward:0.5, type:'survey'},
  {id:'t3', title:'Take a quiz', reward:0.3, type:'quiz'},
]

export default function Tasks(){
  const [user,setUser]=useState(null)
  const [tasks,setTasks]=useState(SAMPLE_TASKS)

  useEffect(()=>{
    async function load(){
      const token = localStorage.getItem('de_token')
      if(token){ api.setToken(token); const meRes = await api.me(); if(meRes.user) setUser(meRes.user) }
      const tRes = await api.getTasks()
      if(tRes.tasks) setTasks(tRes.tasks)
    }
    load()
  },[])
  async function doTask(task){
    if(!user) return alert('Please sign in')
    try{
      api.setToken(localStorage.getItem('de_token'))
      const r = await api.completeTask(task.id)
      if(r.error) return alert(r.error)
      alert(`Task completed — +$${task.reward}`)
      const me = await api.me()
      if(me.user) { localStorage.setItem('de_user', JSON.stringify(me.user)); setUser(me.user) }
    }catch(e){alert('Server error')}
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
