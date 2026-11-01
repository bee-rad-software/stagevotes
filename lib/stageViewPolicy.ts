import type {StageDisplayView} from './stageDisplayControl';
/** Manual views and placement guides take precedence over the seasonal rotation. */
export function allowsPartyRotation(view:StageDisplayView,hasCurrentSinger:boolean,guides:boolean):boolean {
 if(guides)return false;
 return view==='break'||(view==='lyrics'&&!hasCurrentSinger);
}
