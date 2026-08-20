import {requireAdmin} from '@/lib/auth';
import ContentEditor from './content-editor';
export default async function Portal(){await requireAdmin();return <ContentEditor/>}
