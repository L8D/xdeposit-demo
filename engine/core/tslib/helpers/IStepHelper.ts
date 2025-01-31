import type { EIP1193Provider } from 'eip1193-provider'
import type { EncodedWorkflowStep } from '../runner/EncodedWorkflow'
import type { AssetAmount, Chain, StepBase } from '../model'

export interface BridgeTarget {
  chain: Chain
  firstStepId: string
}

export interface NextSteps {
  sameChain: string[]
  differentChains?: [
    {
      chain: Chain
      stepId: string
    }
  ]
}

export interface EncodingContext<T> {
  userAddress: string
  chain: Chain
  stepConfig: T
  mapStepIdToIndex: Map<string, number>
}

export interface IStepHelper<T extends StepBase> {
  requiresRemittance(stepConfig: T): boolean
  getRemittance(stepConfig: T): Promise<AssetAmount | null>
  getBridgeTarget(stepConfig: T): BridgeTarget | null
  encodeWorkflowStep(context: EncodingContext<T>): Promise<EncodedWorkflowStep>
  getPossibleNextSteps(stepConfig: T): NextSteps | null
  setProvider(provider: EIP1193Provider): void
}
