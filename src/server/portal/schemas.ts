import { z } from 'zod';
const website = z.string().trim().max(500).refine(value => { if(!value) return true; try { return ['https:','http:'].includes(new URL(value).protocol); } catch { return false; } }, 'Enter a full http or https website URL.');
export const WidgetSchema = z.object({ name:z.string().trim().min(1).max(80), type:z.enum(['door','window']), website_url:website });
export const UpdateWidgetSchema = z.object({ id:z.uuid(), name:z.string().trim().min(1).max(80), website_url:website, enabled:z.boolean() });
export const QuoteStatusSchema = z.object({ id:z.uuid(), status:z.enum(['new','viewed','contacted','closed']) });
export const ConfigurationSchema=z.object({
 style:z.string().max(80).default(''),design_id:z.union([z.uuid(),z.literal('')]).default(''),
 side_designs:z.record(z.string().max(200),z.uuid()).refine(v=>Object.keys(v).length<=16).default({}),
 picks:z.record(z.string().max(1000),z.uuid()).refine(v=>Object.keys(v).length<=100).default({}),
 texts:z.record(z.string().max(1000),z.string().max(200)).refine(v=>Object.keys(v).length<=100).default({}),
});
export type Configuration=z.infer<typeof ConfigurationSchema>;
export const PublicSubmissionSchema = z.discriminatedUnion('kind', [
  z.object({ kind:z.literal('view'), session_id:z.uuid() }),
  z.object({ kind:z.literal('quote'), session_id:z.uuid(), layout_id:z.uuid(), name:z.string().trim().min(1).max(120), email:z.email().max(254), phone:z.string().trim().max(50), message:z.string().trim().max(2000), company:z.string().max(0),configuration:ConfigurationSchema.optional() }),
]);
