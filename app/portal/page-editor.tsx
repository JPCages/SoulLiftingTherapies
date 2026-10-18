'use client';
import {Puck} from '@puckeditor/core';
import '@puckeditor/core/puck.css';
import type {SiteContent} from '@/lib/site-content';
import {type SiteMeta} from '@/lib/puck/config';
import {editorConfig} from '@/lib/puck/editor-config';
import {homepageData} from '@/lib/puck/migrate';
import type {SitePuckData} from '@/lib/puck/config';

// The homepage, edited on the page itself. Business details and the treatment
// catalogue are not block props — they come in as metadata, so they stay
// editable in one place and show live on the canvas here.
export default function PageEditor({content,onPublish,saving}:{content:SiteContent;onPublish:(d:SitePuckData)=>void;saving:boolean}){
  const meta:SiteMeta={content};
  return <div className="puck-wrap">
    <Puck
      config={editorConfig}
      data={homepageData(content)}
      metadata={meta as unknown as Record<string,unknown>}
      iframe={{syncHostStyles:true}}
      onPublish={onPublish}
      overrides={{
        headerActions:({children})=><>
          <span className="puck-saving">{saving?'Saving…':''}</span>
          {children}
        </>,
      }}
    />
  </div>;
}
