'use client';
import {useRef,useState} from 'react';

export default function Account(){
  const input=useRef<HTMLInputElement>(null);
  const [photos,setPhotos]=useState<string[]>([]);
  const addPhotos=(files:FileList|null)=>{
    if(!files)return;
    Array.from(files).forEach(file=>{
      const reader=new FileReader();
      reader.onload=()=>setPhotos(p=>[...p,reader.result as string]);
      reader.readAsDataURL(file);
    });
  };
  return <main className="account"><header className="apphead"><span>⌂</span><b>Soul Lifting<br/>Therapies</b><span>♧</span></header><section className="account-hero"><p>Welcome back</p><h1>Emma</h1><p className="subtle">Your personal wellbeing space</p></section><section className="feeling"><h2>How are you feeling today?</h2><div className="feeling-grid"><button>☾<span>Tired</span></button><button>☼<span>Stressed</span></button><button>⌁<span>Tight<br/>muscles</span></button><button>✦<span>Dull skin</span></button></div></section><section className="account-grid"><article className="appointment"><p className="label">UPCOMING APPOINTMENT</p><b>Next treatment</b><h3>No appointment booked</h3><p>When you book, your appointment will appear here.</p><a href="/book">Book a treatment →</a></article><article className="score"><p className="label">WELLBEING SCORE</p><strong>—</strong><span>Your private check-in</span></article></section><section className="points"><div><p className="label">SOUL POINTS</p><strong>0 <small>points</small></strong><p>Rewards will be added once the programme is live.</p></div><span>✦</span></section><section className="journey"><h2>Your treatment journey</h2><p>Keep private before-and-after photos and notes you choose to save, so you can look back at your progress.</p>
    {photos.length>0&&<div className="journey-photos">{photos.map((src,i)=><div key={i} className="journey-photo"><img src={src} alt={`Progress photo ${i+1}`}/><button aria-label="Remove photo" onClick={()=>setPhotos(p=>p.filter((_,j)=>j!==i))}>×</button></div>)}</div>}
    <input ref={input} type="file" accept="image/*" multiple hidden onChange={e=>{addPhotos(e.target.files);e.target.value=''}}/>
    <button className="photo-add" onClick={()=>input.current?.click()}>＋ Add a private progress photo</button>
    {photos.length>0&&<p className="journey-note">These photos stay on this device only. Saving them to your account will be available once customer accounts go live.</p>}
  </section><nav className="bottomnav"><a href="/account">⌂<span>Home</span></a><a href="/services">♧<span>Treatments</span></a><a href="/account">✦<span>Rewards</span></a><a href="/book">▣<span>Bookings</span></a><a href="/login">♙<span>Profile</span></a></nav></main>;
}
