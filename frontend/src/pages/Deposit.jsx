import React, {useState, useEffect} from 'react'
import api from '../services/api'

export default function Deposit(){
  const [accountHolder,setAccountHolder] = useState('')
  const [transactionId,setTransactionId] = useState('')
  const [amount,setAmount] = useState('')
  const [method,setMethod] = useState('Bank Transfer')
  const [selectedPackage, setSelectedPackage] = useState('')
  const [file,setFile] = useState(null)
  const [deposits,setDeposits] = useState([])
  const [packages,setPackages]=useState([])

  useEffect(()=>{ async function l(){ api.setToken(localStorage.getItem('de_token')); const r=await api.getMyDeposits(); if(r.deposits) setDeposits(r.deposits) } l() },[])

  useEffect(()=>{
    async function loadPkgs(){
      const r = await api.getPackages()
      if(r.packages) setPackages(r.packages)
      // preselect from query param
      const params = new URLSearchParams(window.location.search)
      const pkg = params.get('package')
      if(pkg) setSelectedPackage(pkg)
    }
    loadPkgs()
  },[])

  async function submit(e){
    e.preventDefault()
  const r = await api.submitDeposit({ accountHolder, transactionId, amount, method, screenshotFile: file })
    if(r.error) return alert(r.error)
    alert('Deposit submitted — pending admin approval')
    const r2 = await api.getMyDeposits(); if(r2.deposits) setDeposits(r2.deposits)
  }

  return (
    <div>
      <h2>Submit Deposit</h2>
      <form className="card" onSubmit={submit} style={{maxWidth:700}}>
        <label className="small muted">Account holder name</label>
        <input value={accountHolder} onChange={e=>setAccountHolder(e.target.value)} style={{width:'100%',padding:8,margin:'8px 0'}} />

        <label className="small muted">Transaction ID</label>
        <input value={transactionId} onChange={e=>setTransactionId(e.target.value)} style={{width:'100%',padding:8,margin:'8px 0'}} />

        <label className="small muted">Amount</label>
        <input value={amount} onChange={e=>setAmount(e.target.value)} style={{width:'100%',padding:8,margin:'8px 0'}} />

        <label className="small muted">Select package (optional)</label>
        <select value={selectedPackage} onChange={e=>setSelectedPackage(e.target.value)} style={{width:'100%',padding:8,margin:'8px 0'}}>
          <option value="">None</option>
          {packages.map(p=> (
            <option key={p.id} value={p.id}>{p.name} — ${p.price}</option>
          ))}
        </select>

        <label className="small muted">Method</label>
        <select value={method} onChange={e=>setMethod(e.target.value)} style={{width:'100%',padding:8,margin:'8px 0'}}>
          <option>Bank Transfer</option>
          <option>JazzCash</option>
          <option>EasyPaisa</option>
          <option>PayPal</option>
        </select>

        <label className="small muted">Screenshot (proof)</label>
        <input type="file" onChange={e=>setFile(e.target.files[0])} style={{display:'block',margin:'8px 0'}} />

        <div style={{marginTop:12}}>
          <button className="btn">Submit deposit</button>
        </div>
      </form>

      <div style={{marginTop:16}}>
        <h3>Your deposits</h3>
        {deposits.length===0 ? <div className="card small muted">No deposits yet</div> : (
          <div className="grid">
            {deposits.map(d=> (
              <div key={d.id} className="card">
                <div><strong>${d.amount}</strong> — {d.method}</div>
                <div className="small muted">Status: {d.status}</div>
                {d.screenshot && <div style={{marginTop:8}}><img src={(import.meta.env.VITE_API_URL||'http://localhost:4000') + d.screenshot} alt="s" style={{maxWidth:200}}/></div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
