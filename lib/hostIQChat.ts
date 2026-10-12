export type HostIQChatMessage={role:'user'|'assistant';content:string};
export type HostIQChatRequest={
 eventId:string;question:string;history:HostIQChatMessage[];
 context?:{targetEndTime?:string;bufferMinutes?:number;averageMinutes?:number;queueMinutes?:number;
 projectedEndTime?:string;localTime?:string;timeZone?:string;karaFunConnected?:boolean;
 watchdogFindings?:{kind:string;title:string;message:string;suggestion:string}[]};
};
