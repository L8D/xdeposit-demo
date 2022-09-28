import Web3 from 'web3'
// import { provider as EthereumProvider } from 'web3-core'
import ethers from 'ethers'
import { Connection as SolanaConnection, Keypair as SolanaKeypair } from '@solana/web3.js'
import { AssetBalance, Workflow, WorkflowStep, WorkflowStepResult } from '../types'

export type EthereumProvider = ethers.providers.ExternalProvider | ethers.providers.JsonRpcFetchFunc

export enum WorkflowEventType {
  Starting = 'Starting',
  StatusUpdate = 'StatusUpdate',
  Completed = 'Completed',
}

export interface WorkflowEvent {
  type: WorkflowEventType
  statusMessage: string
  workflow: Workflow
  steps: WorkflowStep[]
  balances: AssetBalance[]
  absoluteInputAmount?: bigint
  result?: WorkflowStepResult // defined when type is Completed
}

export type WorkflowEventHandler = (event: WorkflowEvent) => void | Promise<void>

export interface WorkflowEngineOptions {
  ethereumProvider?: EthereumProvider
  solanaConnection?: SolanaConnection
  solanaUser?: SolanaKeypair
  eventHandler: WorkflowEventHandler
}

export interface WorkflowEngine {
  execute(workflow: Workflow): Promise<void>
}
