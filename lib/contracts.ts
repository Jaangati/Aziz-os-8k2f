import { z } from 'zod';
export const kinds = ['task','memory','transaction','goal','person','document','note'] as const;
export type Kind = typeof kinds[number];
const title = z.string().trim().min(1).max(300);
const body = z.string().max(8000).default('');
const optionalDate = z.union([z.string().datetime({offset:true}),z.literal('')]).default('');
const currency = z.enum(['QAR','TND','USD','EUR']);
export const entrySchemas = {
 task:z.object({title,body,priority:z.enum(['high','normal','low']),status:z.enum(['open','done']),due:optionalDate,area:z.enum(['Personal','Work','Money','Health','Family']).default('Personal')}),
 memory:z.object({title,body:z.string().trim().min(1).max(8000),source:z.enum(['owner','inferred']),category:z.enum(['Preference','Goal','Fact','Decision','Lesson']).default('Fact')}),
 transaction:z.object({title,amount_minor:z.number().int().positive().max(999999999999),direction:z.enum(['income','expense']),currency,date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>!isNaN(Date.parse(s)) && new Date(s).toISOString().startsWith(s),'Invalid date'),category:z.string().trim().min(1).max(60),body}),
 goal:z.object({title,body,progress:z.number().int().min(0).max(100),due:optionalDate,area:z.string().max(40).default('Personal')}),
 person:z.object({title,body,relationship:z.string().max(100),email:z.union([z.string().email(),z.literal('')]),phone:z.string().max(40)}),
 document:z.object({title,path:z.string().regex(/^[a-f0-9]{64}\/[a-f0-9-]{36}$/),mime:z.string().max(150),size:z.number().int().positive().max(10485760),body}),
 note:z.object({title,body:z.string().trim().min(1).max(8000),category:z.enum(['Thought','Journal','Idea','Review']).default('Thought')})
};
export type Entry = {id:string;kind:Kind;data:Record<string,any>;version:number;created_at:string;updated_at:string};
export type Settings = {name:string;timezone:string;morning_hour:number;evening_hour:number;paused:boolean;currency:string;monthly_budget_minor:number};
export type AtlasState = {entries:Entry[];notifications:any[];activity:any[];runs:any[];settings:Settings;heartbeat:string|null;capabilities:{ai:boolean;external_notifications:boolean;vault:boolean};user:{name:string;email:string}};
export const settingsSchema = z.object({name:z.string().trim().min(1).max(100),timezone:z.enum(['Asia/Qatar','Africa/Tunis','Europe/London','UTC']),morning_hour:z.number().int().min(0).max(23),evening_hour:z.number().int().min(0).max(23),paused:z.boolean(),currency,monthly_budget_minor:z.number().int().min(0).max(999999999999)});
export function validateSave(input:unknown){
 const base=z.object({id:z.string().uuid().optional(),version:z.number().int().positive().optional(),kind:z.enum(kinds),data:z.unknown()}).parse(input);
 if(base.id&&!base.version)throw new Error('A version is required when editing.');
 return {...base,data:entrySchemas[base.kind].parse(base.data)};
}
