"use client";
import {useWorkspacePalette,type WorkspacePalette} from '@/components/use-workspace-palette';
export function WorkspacePaletteControl(){
 const [palette,setPalette]=useWorkspacePalette();
 return <label className="flex min-w-0 items-center gap-1.5"><span className="hidden text-xs text-muted-foreground lg:inline">Colors</span><select aria-label="Color palette" title="Color palette" value={palette} onChange={event=>setPalette(event.target.value as WorkspacePalette)} className="h-9 min-w-0 w-24 rounded-md border border-input bg-card px-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring"><option value="slate-blue">Blue</option><option value="original-navy-teal">Original</option><option value="light">Light</option></select></label>;
}
