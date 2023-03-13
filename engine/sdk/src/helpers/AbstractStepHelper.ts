import assert from '../utils/assert'
import { Memoize } from 'typescript-memoize'
import type { Provider } from '@ethersproject/providers'
import { WORKFLOW_END_STEP_ID } from '../runner/constants'
import type { EIP1193Provider } from 'eip1193-provider'
import type { BridgeTarget, EncodingContext, IStepHelper, NextSteps } from './IStepHelper'
import type { AssetAmount, Chain, StepBase } from '../model'
import type { IWorkflowInstance } from '../runner/IWorkflowInstance'

import type { EncodedWorkflowStep } from '../EncodedWorkflow'
import { getEthersProvider } from '../utils/evm-utils'
export abstract class AbstractStepHelper<T extends StepBase> implements IStepHelper<T> {
  protected standardProvider?: EIP1193Provider
  protected ethersProvider?: Provider
  protected instance: IWorkflowInstance

  constructor(runner: IWorkflowInstance, provider?: EIP1193Provider) {
    this.instance = runner
    this.standardProvider = provider
    if (provider) {
      this.ethersProvider = getEthersProvider(provider)
    }
  }
  setProvider(provider: EIP1193Provider): void {
    this.standardProvider = provider
    this.ethersProvider = getEthersProvider(provider)
  }

  abstract encodeWorkflowStep(context: EncodingContext<T>): Promise<EncodedWorkflowStep>

  protected async getChain(): Promise<Chain> {
    const chainId = await this.getChainId()
    switch (chainId) {
      case 1:
      case 5:
        return 'ethereum'
      case 56:
      case 97:
        return 'binance'
      case 42161:
      case 421613:
        return 'arbitrum'
      case 137:
      case 80001:
        return 'polygon'
      case 43114:
      case 43113:
        return 'avalanche'
      case 10:
      case 420:
        return 'optimism'
      case 250:
      case 4002:
        return 'fantom'
      default:
        throw new Error('unknown chainId: ' + chainId)
    }
  }

  @Memoize()
  protected async getFrontDoorAddress(): Promise<string> {
    const chain = await this.getChain()
    return this.instance.getFrontDoorAddressForChain(chain)
  }

  @Memoize()
  protected async getChainId(): Promise<number> {
    assert(this.ethersProvider)
    const network = await this.ethersProvider.getNetwork()
    return network.chainId
  }

  requiresRemittance(_stepConfig: T) {
    return false
  }

  getRemittance(_stepConfig: T): Promise<AssetAmount | null> {
    return Promise.resolve(null)
  }

  getBridgeTarget(_stepConfig: T): BridgeTarget | null {
    return null
  }

  getPossibleNextSteps(stepConfig: T): NextSteps | null {
    assert(stepConfig.nextStepId)
    if (stepConfig.nextStepId === WORKFLOW_END_STEP_ID) {
      return null
    }
    return {
      sameChain: [stepConfig.nextStepId],
    }
  }
}
