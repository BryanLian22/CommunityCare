export type EmergencyAlert={id:string;category:string;location:string;phone:string;details:string;latitude:number|null;longitude:number|null;accuracy:number|null;captured_at:string|null;status:string;assignee:string;note:string;revision:number;created:string;updated:string;residentName:string;residentEmail:string;history:{status:string;at:string;note:string;assignee:string;actor:string}[]};
export type Facility={id:string;name:string;category:string;description:string;icon:string;isOpen:boolean;closureReason:string;revision:number;created:string;updated:string};
export type AppNotification={kind:'emergency'|'assistance'|'bookings'|'reports'|'services';id:string;title:string;body:string;requestId:string;audience:'resident'|'admin';created:string;readAt:string};
export type Assistance = {id:string;category:string;location:string;details:string;status:string;assignee:string;note:string;revision:number;created:string;updated:string;residentName:string;residentEmail:string;history:{status:string;at:string;assignee:string;note:string}[]};
export type User = {id:string; name:string; email:string; role:'resident'|'admin'; active:boolean; largeText:boolean; contrast:boolean; created:string};
export type Entry = {id:string; userId:string; created:string; status:string; facility?:string; date?:string; time?:string; category?:string; details?:string; name?:string; phone?:string; service?:string; address?:string; residentName?:string; residentEmail?:string; note?:string; history?:{status:string;at:string;note:string}[]};
export type Notice = {id:string; title:string; body:string; created:string; updated:string};
export type CommunityContact = {id:"management"|"guard"; name:string; phone:string; hours:string; description:string; updated:string};
export type ResidentData = {bookings:Entry[]; reports:Entry[]; contacts:Entry[]; services:Entry[]; notices:Notice[]; communityContacts:CommunityContact[]; facilities:Facility[]; assistance:Assistance[]; notifications:AppNotification[]; noticesReadAt:string};
export type AdminData = {users:User[]; bookings:Entry[]; reports:Entry[]; services:Entry[]; notices:Notice[]; communityContacts:CommunityContact[]; facilities:Facility[]; assistance:Assistance[]; notifications:AppNotification[]};
export async function api<T = {ok:boolean}>(path:string, method='GET', body?:unknown):Promise<T> {
 let response:Response;
 try { response=await fetch(`/api${path}`, {method,credentials:'same-origin',headers:{'Content-Type':'application/json','X-CommunityCare-Request':'1'},...(body===undefined?{}:{body:JSON.stringify(body)})}); }
 catch { throw new Error('Cannot reach the server. Check that npm.cmd run dev is running.'); }
 const data=await response.json().catch(()=>({error:'Server unavailable. Restart the app server.'}));
 if(!response.ok){if(response.status===401&&!path.startsWith('/auth/'))window.dispatchEvent(new Event('session-expired'));throw new Error(data.error||'Request failed.');}
 return data as T;
}
