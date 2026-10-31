export const stageViews=['lyrics','next','welcome','break','announcement'] as const;
export const stageThemes=['classic','halloween','neon','country','holiday'] as const;
export type StageDisplayView=typeof stageViews[number];
export type StageDisplayTheme=typeof stageThemes[number];
export type StageDisplayState={view:StageDisplayView;theme:StageDisplayTheme;partyEnabled:boolean;singerSpotlight:boolean;votingDeadline:string;announcement:string;guides:boolean;autoWindowHandoff:boolean;native:boolean;handoffSupported:boolean;filled:boolean;displayId:string;displays:{id:string;label:string;width:number;height:number;current:boolean}[]};
export type StageDisplayCommand=
 | {type:'view';value:StageDisplayView}
 | {type:'theme';value:StageDisplayTheme}
 | {type:'flag';key:'partyEnabled'|'singerSpotlight'|'guides'|'autoWindowHandoff';value:boolean}
 | {type:'deadline';value:string}
 | {type:'announcement';value:string}
 | {type:'fill';displayId:string}
 | {type:'restore'|'close'};
export function validStageCommand(value:unknown):value is StageDisplayCommand {
 if(!value||typeof value!=='object')return false;
 const c=value as Record<string,unknown>;
 switch(c.type){
  case 'view':return stageViews.includes(c.value as StageDisplayView);
  case 'theme':return stageThemes.includes(c.value as StageDisplayTheme);
  case 'flag':return ['partyEnabled','singerSpotlight','guides','autoWindowHandoff'].includes(String(c.key))&&typeof c.value==='boolean';
  case 'deadline':return typeof c.value==='string'&&(c.value===''||(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(c.value)&&Number.isFinite(new Date(c.value).getTime())));
  case 'announcement':return typeof c.value==='string'&&c.value.length<=180;
  case 'fill':return typeof c.displayId==='string'&&c.displayId.length<=100;
  case 'restore':case 'close':return true;
  default:return false;
 }
}
export const stageControlChannel=(eventId:string)=>'stage-display-controls:'+eventId;
