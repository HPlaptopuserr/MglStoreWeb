import { notFound } from 'next/navigation';
import { getWebsiteProject } from '@/lib/server/building-website';
import { WebsiteProjectView } from '@/components/building/content/WebsiteProjectView';
export default async function PreviewPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{block?:string;floor?:string;region?:string;view?:string}>}){const project=await getWebsiteProject((await params).id,true);if(!project)notFound();return <WebsiteProjectView project={project} query={await searchParams} preview/>;}
