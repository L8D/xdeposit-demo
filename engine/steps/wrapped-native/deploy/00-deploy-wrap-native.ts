import { DeployFunction } from 'hardhat-deploy/types'
import { STEP_TYPE_ID as WRAP_STEP_TYPE_ID } from '../tslib/wrap-native-helper'
import { deployStep } from '@freemarket/step-sdk/tslib/deploy-step'
import { getWrappedNativeAddress } from '../tslib/getWrappedNativeAddress'

const func: DeployFunction = async function (hardhatRuntimeEnv) {
  const chainId = await hardhatRuntimeEnv.getChainId()
  const poolAddress = getWrappedNativeAddress(chainId)
  await deployStep('WrapNativeAction', WRAP_STEP_TYPE_ID, hardhatRuntimeEnv, [poolAddress])
}

func.tags = ['WrapNativeAction']
func.dependencies = ['WorkflowRunner']

export default func
