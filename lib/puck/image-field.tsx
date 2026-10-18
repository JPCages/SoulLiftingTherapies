'use client';
import {useState} from 'react';
import {ImageControl,uploadImage} from '@/app/portal/image-control';

// Puck custom-field renderer: the same upload control Emma uses elsewhere in the
// portal, so there is one way to put a picture on the site.
export function PuckImageField({value,onChange,label}:{value?:string;onChange:(v:string)=>void;label?:string}){
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  return <div>
    <ImageControl wide image={value||undefined} label={label||'image'} busy={busy}
      onFile={async f=>{
        if(!f)return;
        setBusy(true);setError('');
        try{onChange(await uploadImage(f))}
        catch(e){setError(e instanceof Error?e.message:'Image upload failed')}
        finally{setBusy(false)}
      }}
      onClear={()=>onChange('')}/>
    {error&&<p className="puck-field-error">{error}</p>}
  </div>;
}
