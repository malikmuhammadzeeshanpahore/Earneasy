import React, {useState, useEffect} from 'react'
import api from '../services/api'
import copyToClipboard from '../utils/clipboard'

export default function Deposit(){
  const [accountHolder,setAccountHolder] = useState('')
  const [transactionId,setTransactionId] = useState('')
  const [amount,setAmount] = useState('')
  const [method,setMethod] = useState('JazzCash')
  const [selectedPackage, setSelectedPackage] = useState('')
  const [file,setFile] = useState(null)
  const [deposits,setDeposits] = useState([])
  const [packages,setPackages]=useState([])

  useEffect(()=>{
    async function l(){
      try{
        api.setToken(localStorage.getItem('de_token'))
        const r=await api.getMyDeposits(); if(r.deposits) setDeposits(r.deposits)
      }catch(e){ console.error('Failed to load deposits', e) }
    }
    l()
  },[])

  useEffect(()=>{
    async function loadPkgs(){
      try{
        const r = await api.getPackages()
        if(r.packages) setPackages(r.packages)
        // preselect from query param
        const params = new URLSearchParams(window.location.search)
        const pkg = params.get('package')
        if(pkg) setSelectedPackage(pkg)
      }catch(e){ console.error('Failed to load packages for deposit', e) }
    }
    loadPkgs()
  },[])

  async function submit(e){
    e.preventDefault()
    try{
      // Client-side validation: minimum top-up amount Rs700
      if(!amount || Number(amount) < 700) return alert('Minimum top-up amount is Rs700')
      const r = await api.submitDeposit({ accountHolder, transactionId, amount, method, packageId: selectedPackage, screenshotFile: file })
      if(r.error) return alert(r.error)
      alert('Deposit submitted — pending admin approval')
      const r2 = await api.getMyDeposits(); if(r2.deposits) setDeposits(r2.deposits)
    }catch(e){ console.error('Submit deposit failed', e); alert('Server error') }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand mb-3">JazzCash</h1>
      <h2>Submit Deposit</h2>
      <div className="card" style={{maxWidth:700, marginBottom:12}}>
        <h4 className="font-semibold">Top-up Instructions:</h4>
        <ol className="small muted" style={{marginTop:8}}>
          <li>Top-up service is available 24/7.</li>
          <li>Minimum top-up amount is Rs700.</li>
          <li>Arrival time: Please upload your payment receipt immediately after payment. Funds will usually arrive within 5-30 minutes. If you have not received your funds within this time, please contact online customer service for assistance.</li>
          <li>Do not save expired mobile phone numbers. If your top-up has expired, please place a new order.</li>
          <li>Do not top up through channels outside the platform to avoid financial losses.</li>
        </ol>
      </div>
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

        {/* Deposits are currently accepted via JazzCash only */}
        <label className="small muted">Method</label>
        <div className="card" style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px'}}>
          <div>
            <div className="font-semibold">JazzCash</div>
            <div className="text-sm text-muted">Send payment to this JazzCash number</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div className="text-lg font-bold">03344379353</div>
            <button type="button" className="btn ghost" onClick={async ()=>{ try{ await copyToClipboard('03344379353'); alert('Number copied') }catch(e){ console.error('Copy failed', e); alert('Could not copy number') } }} style={{marginTop:8}}>Copy</button>
          </div>
        </div>

        <label className="small muted">Screenshot (proof)</label>
        <input type="file" onChange={e=>setFile(e.target.files[0])} style={{display:'block',margin:'8px 0'}} />

        <div style={{marginTop:12}}>
          <button className="btn">Submit deposit</button>
        </div>
      </form>

      <div className="card mt-4">
        <h4 className="font-semibold">Support & Channel</h4>
        <p className="text-sm text-slate-600">Join our WhatsApp channel for announcements:</p>
        <a href="https://whatsapp.com/channel/0029VbCMWJc6BIEZ4v0Sp82r" target="_blank" rel="noreferrer" className="text-brand mt-2 inline-block">Open WhatsApp Channel</a>
        <p className="text-sm text-slate-600 mt-3">Customer service (WhatsApp):</p>
        <a href="https://wa.me/+923344379353" target="_blank" rel="noreferrer" className="small">+92 334 4379353</a>
      </div>
      

      <div style={{marginTop:16}}>
        <h3>Your deposits</h3>
        {deposits.length===0 ? <div className="card small muted">No deposits yet</div> : (
          <div className="grid">
            {deposits.map(d=> (
              <div key={d.id} className="card">
                <div><strong>${d.amount}</strong> — {d.method}</div>
                <div className="small muted">Status: {d.status}</div>
                {d.screenshot && <div style={{marginTop:8}}><img src={api.assetUrl(d.screenshot)} alt="s" style={{maxWidth:200}}/></div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
