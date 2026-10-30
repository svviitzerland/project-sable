import type { Metadata } from 'next';
import { Workspace } from '@/components/workspace';
export const metadata: Metadata = { title: 'Workspace · Jude', description: 'An evidence-grounded workspace for examining courtroom testimony.' };
export default function WorkspacePage() { return <Workspace />; }
