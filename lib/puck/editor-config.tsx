'use client';
import type {Config, Field} from '@puckeditor/core';
import {config,IMAGE_FIELDS,type Blocks} from './config';
import {PuckImageField} from './image-field';

// The editing-only view of the config. The blocks and their markup are shared
// with the published page; the only difference is the picture controls, which
// need the browser and so cannot live in the server-rendered config.
const imageField=(label?:string):Field=>({type:'custom',label,render:({value,onChange})=>
  <PuckImageField value={value as string} onChange={onChange} label="photo"/>});

const components={} as Config<Blocks>['components'];
for(const [name,comp] of Object.entries(config.components) as [keyof Blocks,Config<Blocks>['components'][keyof Blocks]][]){
  const fields={...(comp.fields??{})} as Record<string,Field>;
  for(const key of IMAGE_FIELDS){
    if(fields[key])fields[key]=imageField(fields[key].label);
  }
  (components as Record<string,unknown>)[name]={...comp,fields};
}

export const editorConfig:Config<Blocks>={...config,components};
