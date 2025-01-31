import z from 'zod'
import { fungibleTokenSchema, parameterSchema } from '@freemarket/core'
import { stepSchema } from './Step'

export const workflowSchema = z
  .object({
    parameters: parameterSchema.array().optional(),
    fungibleTokens: fungibleTokenSchema
      .array()
      .optional()
      .describe(
        'Custom fungible tokens used in this workflow.  These override or augment the default curated set of tokens provided by the SDK.'
      ),
    steps: stepSchema.array().min(1).describe('The set of steps for this workflow.  Execution will begin at the step at index 0.'),
  })
  .describe('A workflow.')

export interface Workflow extends z.infer<typeof workflowSchema> {}
