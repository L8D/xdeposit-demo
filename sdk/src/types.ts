/** Represents an integer or a percentage such as "100%" */
export type AssetAmount = string | number

/** Enum containing all supported blockchains. */
export enum Chain {
  Ethereum = 'Ethereum',
  Solana = 'Solana',
}

/** The names of blockchains as a string union. */
export type ChainName = keyof typeof Chain

export interface BlockChainInfo {
  iconUrl: string
}

export type ChainInfos = { [name: string]: BlockChainInfo }

export const BLOCKCHAIN_INFO = {
  Ethereum: {
    iconUrl:
      'data:image/png;base64,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',
  },
  Solana: {
    iconUrl:
      'data:image/png;base64,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',
  },
}

/** Enum containing all supported types of assets. */
export enum AssetType {
  Native = 'Native',
  Token = 'Token',
  Account = 'Account',
}

/**
 * A compound key of a crypto asset.
 */
export class Asset {
  constructor(chain: ChainName, symbol: string) {
    this.chain = chain
    this.symbol = symbol
  }

  chain: ChainName
  symbol: string

  toString() {
    return `${this.chain}.${this.symbol}`
  }

  static fromString(s: string): Asset {
    const dotIndex = s.indexOf('.')
    return new Asset(s.slice(0, dotIndex) as ChainName, s.slice(dotIndex + 1))
  }
}

/** Informational aspects of an asset. */
export interface AssetInfo {
  name: string
  symbol: string
  address: string
  iconUrl: string
  decimals: number
  officialSiteUrl: string
  type: AssetType
}

/** An assetId and an associated balance. */
export interface AssetBalance {
  asset: Asset
  balance: string
}

/**
 * A parameterized workflow step.
 *  This is a common base class, subclasses can add step-specific parameters unique to their step.
 */
export interface WorkflowStep {
  stepId: string
}

export interface WorkflowAction extends WorkflowStep {
  actionId: string
  inputAmount: AssetAmount
  inputAsset: Asset
  outputAsset: Asset
}

export interface WorkflowBranch extends WorkflowStep {
  expression: string // TODO arbitrary expressions may be too expensive to implement on-chain
  ifTrue: string
  ifFalse: string
}

/**
 *  The categories of workflow steps.
 *  TODO maybe should align with defillama's categories https://defillama.com/categories
 *  TODO currently not used
 */
export enum WorkflowStepCategory {
  Swap = 'Swap',
  Bridge = 'Bridge',
  Yield = 'Yield',
  Loan = 'Loan',
}

/**
 *  Informational aspects of a workflow step (no runtime parameters here).
 */
export interface WorkflowActionInfo {
  actionId: string
  name: string
  description: string
  category: WorkflowStepCategory // TODO maybe align with defillama's categories
  chains: ChainName[]
  gasEstimate: string
  exchangeFee: string
  iconUrl: string
  webSiteUrl: string
}

/**
 * The outcome of executing a workflow step.
 */
export interface WorkflowStepResult {
  outputAmount: string
  gasCost: string // TODO need a better modeling of gas is needed
  exchangeFee: string
  // slippage: string
}

/**
 * A workflow.
 */
export interface Workflow {
  inputAssets: Asset[]
  steps: WorkflowStep[]
}
