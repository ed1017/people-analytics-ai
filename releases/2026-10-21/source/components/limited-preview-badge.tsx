export function LimitedPreviewBadge({id,className=''}:{id?:string;className?:string}){
 return <span id={id} data-limited-preview className={`inline-block w-fit shrink-0 rounded border border-amber-700/40 bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium leading-4 text-amber-950 dark:border-amber-300/40 dark:bg-amber-950 dark:text-amber-100 ${className}`}>Limited preview</span>;
}
