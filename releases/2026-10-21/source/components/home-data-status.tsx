import {DataLoadingStatus} from '@/components/data-loading-status';

export function HomeDataStatus({loading}:{loading:boolean}) {
 return loading?<DataLoadingStatus name="Home data status" detail="Loading source summaries. Previous figures are not current; your drafts and saved goals are kept."/>:null;
}
