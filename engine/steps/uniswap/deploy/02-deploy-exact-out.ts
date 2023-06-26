import { DeployFunction } from 'hardhat-deploy/types'
import { STEP_TYPE_ID_UNISWAP_EXACT_OUT } from '../tslib/UniswapExactOutHelper'
import { deployStep, getWrappedNativeAddress } from '@freemarket/step-sdk'
import { ADDRESS_ZERO } from '@freemarket/core'
import { SWAP_ROUTER_02_ADDRESS } from '../tslib'

const func: DeployFunction = async function (hardhatRuntimeEnv) {
  const chainId = await hardhatRuntimeEnv.getChainId()
  const wethAddress = getWrappedNativeAddress(chainId) || ADDRESS_ZERO
  return deployStep('UniswapExactOutAction', STEP_TYPE_ID_UNISWAP_EXACT_OUT, hardhatRuntimeEnv, [SWAP_ROUTER_02_ADDRESS, wethAddress])
}

func.tags = ['UniswapExactOutAction']
func.dependencies = ['ConfigManager']

export default func
