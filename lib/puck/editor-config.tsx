'use client';
import type {Config} from '@puckeditor/core';
import {config,type Blocks} from './config';
import {PuckImageField} from './image-field';

// The editing-only view of the config. The blocks and their markup are shared
// with the published page; the only difference is the picture control, which
// needs the browser and so cannot live in the server-rendered config.
export const editorConfig:Config<Blocks>={
  ...config,
  components:{
    ...config.components,
    Hero:{
      ...config.components.Hero,
      fields:{
        ...config.components.Hero.fields!,
        image:{type:'custom',label:'Photo',render:({value,onChange})=>
          <PuckImageField value={value as string} onChange={onChange} label="photo"/>},
      },
    },
  },
};
