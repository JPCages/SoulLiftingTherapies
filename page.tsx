import {requireChatGPTUser} from '@/app/chatgpt-auth';
import ContentEditor from './content-editor';
export default async function Portal(){const user=await requireChatGPTUser('/portal');if(user.email.toLowerCase()!=='emmacerklewicz@yahoo.co.uk')return <main className="login"><section><h1>Admin access only.</h1><p>This dashboard is available only to Emma.</p><a className="primary" href="/">Return home</a></section></main>;return <ContentEditor/>}
