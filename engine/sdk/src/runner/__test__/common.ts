import type { Step } from '../../model'

export const addAssetStep: Step = {
  stepId: 'addAsset',
  type: 'add-asset',
  asset: {
    type: 'native',
  },
  amount: 1,
}

export const aaveSupplyStep: Step = {
  stepId: 'aaveSupply',
  type: 'aave-supply',
  inputAsset: {
    asset: {
      type: 'native',
    },
    amount: 1,
  },
}

export const stargateBridgeStep: Step = {
  stepId: 'starGate',
  type: 'stargate-bridge',
  destinationChain: 'arbitrum',
  destinationGasUnits: 1000000,
  destinationUserAddress: '0x1234567890123456789012345678901234567890',
  inputAsset: {
    asset: {
      type: 'native',
    },
    amount: 1,
  },
  maxSlippagePercent: 0.04,
}

export const chainBranchStep: Step = {
  stepId: 'chainBranch',
  type: 'chain-branch',
  currentChain: 'arbitrum',
  ifYes: 'aaveSupply',
}
