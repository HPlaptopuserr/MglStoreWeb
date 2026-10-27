import { notFound } from 'next/navigation';
import { getWebsiteProject } from '@/features/building/server/building-website';
import { WebsiteProjectView } from '@/features/building/website/WebsiteProjectView';
export default async function PreviewPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{block?:string;floor?:string;region?:string;view?:string}>}){const project=await getWebsiteProject((await params).id,true);if(!project)notFound();return <WebsiteProjectView project={project} query={await searchParams} preview/>;}
