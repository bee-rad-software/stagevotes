export function safeLoginReturn(value:string|null|undefined,fallback='/') {
 if(!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value))return fallback;
 try {const base='https://stagevotes.invalid';const url=new URL(value,base);return url.origin===base?url.pathname+url.search+url.hash:fallback;}catch{return fallback;}
}
export function loginReturnPath(next:string|null,standalone:boolean) {
 return safeLoginReturn(next,standalone?'/my-schedule':'/');
}
