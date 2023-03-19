import {
  StepIds,
  IStargateRouter__factory,
  StargateBridge as StargateBridgeEvm,
  StargateBridgeAction__factory,
  StargateChainIds,
  WorkflowRunner__factory,
  getBridgePayload,
  ADDRESS_ZERO,
  AssetType,
  StargateBridge as EvmStargateBridge,
  StargatePoolIds,
  IStargateFactory__factory,
  IStargatePool__factory,
  IStargateFeeLibrary__factory,
  StargateBridgeActionArgs,
} from '@freemarket/evm'
import { Memoize } from 'typescript-memoize'
import type { AssetAmount, Chain, StargateBridge } from '../model'
import { AbstractStepHelper } from './AbstractStepHelper'
import { absoluteAmountToString } from './utils'
import rootLogger from 'loglevel'
import type { EncodingContext, NextSteps } from './IStepHelper'
import assert from '../utils/assert'
import type { EncodedWorkflowStep } from '../EncodedWorkflow'
import { WORKFLOW_END_STEP_ID } from '../runner/constants'
import { getEthersProvider, sdkAssetAmountToEvmInputAmount } from '../utils/evm-utils'
import type { AssetReference } from '../model/AssetReference'
import Big from 'big.js'
import type { Provider } from '@ethersproject/providers'
import { BigNumber } from '@ethersproject/bignumber'

const log = rootLogger.getLogger('StargateBridgeHelper')

interface StargateFeeArgs {
  dstAddress: string
  dstGasForCall: string
  dstNativeAmount: string
  payload: string
  dstChainId: number
}

export interface StargateMinAmountOutArgs {
  inputAmount: string
  dstChainId: number
  srcPoolId: number
  dstPoolId: number
  dstUserAddress: string
}

export class StargateBridgeHelper extends AbstractStepHelper<StargateBridge> {
  requiresRemittance(_stepConfig: StargateBridge) {
    return true
  }

  async getRemittance(stepConfig: StargateBridge): Promise<AssetAmount> {
    const dstAddress = await this.getStargateBridgeActionAddress()
    const dstChainId = await this.getStargateChainId(stepConfig.destinationChain)
    if (!stepConfig.destinationGasUnits) {
      throw new Error('stargate automatic destination chain gas estimation not implemented, please provide a value for destinationGasUnits')
    }

    const payload = await this.getPayload(stepConfig, ADDRESS_ZERO)

    const requiredNative = await this.getStargateRequiredNative({
      dstAddress,
      dstGasForCall: absoluteAmountToString(stepConfig.destinationGasUnits),
      dstNativeAmount: stepConfig.destinationAdditionalNative ? absoluteAmountToString(stepConfig.destinationAdditionalNative) : '0',
      payload: payload.continuationWorkflow,
      dstChainId,
    })
    return {
      asset: { type: 'native' },
      amount: requiredNative,
    }
  }

  @Memoize()
  private async getStargateChainId(chain: Chain): Promise<number> {
    if (await this.instance.isTestNet()) {
      switch (chain) {
        case 'ethereum':
          return StargateChainIds.GoerliEthereum
        case 'arbitrum':
          return StargateChainIds.GoerliArbitrum
        case 'avalanche':
          return StargateChainIds.GoerliAvalanche
        case 'binance':
          return StargateChainIds.GoerliBinance
        case 'fantom':
          return StargateChainIds.GoerliFantom
        case 'optimism':
          return StargateChainIds.GoerliOptimism
        case 'polygon':
          return StargateChainIds.GoerliPolygon
      }
    } else {
      switch (chain) {
        case 'ethereum':
          return StargateChainIds.Ethereum
        case 'arbitrum':
          return StargateChainIds.Arbitrum
        case 'avalanche':
          return StargateChainIds.Avalanche
        case 'binance':
          return StargateChainIds.Binance
        case 'fantom':
          return StargateChainIds.Fantom
        case 'optimism':
          return StargateChainIds.Optimism
        case 'polygon':
          return StargateChainIds.Polygon
      }
    }
  }

  // TODO probably not needed
  // @Memoize()
  // private async getStargateChainId() {
  //   const chainId = await this.getChainId()
  //   switch (chainId) {
  //     case 1:
  //       return StargateChainIds.Ethereum
  //     case 5:
  //       return StargateChainIds.GoerliEthereum
  //     case 56:
  //       return StargateChainIds.BNB
  //     case 97:
  //       return StargateChainIds.GoerliBNB
  //     case 42161:
  //       return StargateChainIds.Arbitrum
  //     case 421613:
  //       return StargateChainIds.GoerliArbitrum
  //     case 137:
  //       return StargateChainIds.Polygon
  //     case 80001:
  //       return StargateChainIds.GoerliPolygon
  //     case 43114:
  //       return StargateChainIds.Avalanche
  //     case 43113:
  //       return StargateChainIds.GoerliAvalanche
  //     case 10:
  //       return StargateChainIds.Optimism
  //     case 420:
  //       return StargateChainIds.GoerliOptimism
  //     case 250:
  //       return StargateChainIds.Fantom
  //     case 4002:
  //       return StargateChainIds.GoerliFantom
  //     default:
  //       throw new Error('unknown stargate chainId for ' + chainId)
  //   }
  // }

  @Memoize()
  private async getStargateBridgeActionAddress(): Promise<string> {
    assert(this.standardProvider)
    const frontDoorAddress = await this.getFrontDoorAddress()
    return StargateBridgeEvm.getStargateBridgeActionAddress(frontDoorAddress, this.standardProvider)
  }

  @Memoize()
  async getStargateBridgeActionAddressForChain(chain: Chain): Promise<string> {
    const stdProvider = this.instance.getProvider(chain)
    const ethersProvider = getEthersProvider(stdProvider)
    const x = await ethersProvider.getNetwork()
    const frontDoorAddress = await this.instance.getFrontDoorAddressForChain(chain)
    const runner = WorkflowRunner__factory.connect(frontDoorAddress, ethersProvider)
    const sgBridgeActionAddr = await runner.getStepAddress(StepIds.stargateBridge)
    log.debug(`StargateBridgeAction for chain '${chain}' is ${sgBridgeActionAddr}`)
    return sgBridgeActionAddr
  }

  @Memoize()
  async getStargateRouterAddress(): Promise<string> {
    assert(this.ethersProvider)
    const frontDoorAddress = await this.getFrontDoorAddress()
    const runner = WorkflowRunner__factory.connect(frontDoorAddress, this.ethersProvider)
    const sgBridgeActionAddr = await runner.getStepAddress(StepIds.stargateBridge)
    const sgBridgeAction = StargateBridgeAction__factory.connect(sgBridgeActionAddr, this.ethersProvider)
    const sgRouterAddr = await sgBridgeAction.stargateRouterAddress()
    log.debug(`StargateRouter address=${sgRouterAddr}`)
    return sgRouterAddr
  }

  async getStargateRequiredNative(args: StargateFeeArgs): Promise<string> {
    assert(this.ethersProvider)
    // prettier-ignore
    log.debug(`getting stargate required native gas=${args.dstGasForCall} airdrop=${args.dstNativeAmount} payloadLen=${args.payload.length}`)
    const sgRouterAddress = await this.getStargateRouterAddress()
    const sgRouter = IStargateRouter__factory.connect(sgRouterAddress, this.ethersProvider)
    const quoteResult = await sgRouter.quoteLayerZeroFee(args.dstChainId, 1, args.dstAddress, args.payload, {
      dstGasForCall: args.dstGasForCall,
      dstNativeAmount: args.dstNativeAmount ?? 0,
      dstNativeAddr: args.dstAddress,
    })
    const stargateFee = quoteResult['0']
    log.debug(`stargate required native=${stargateFee.toString()}`)
    return stargateFee.toString()
  }

  getPossibleNextSteps(stepConfig: StargateBridge): NextSteps | null {
    assert(stepConfig.nextStepId)
    if (stepConfig.nextStepId === WORKFLOW_END_STEP_ID) {
      return null
    }
    return {
      sameChain: [],
      differentChains: [
        {
          chain: stepConfig.destinationChain,
          stepId: stepConfig.nextStepId,
        },
      ],
    }
  }

  private async getPayload(stepConfig: StargateBridge, userAddress: string): Promise<{ nonce: string; continuationWorkflow: string }> {
    const targetChainUserAddress = stepConfig.destinationUserAddress ?? userAddress
    assert(stepConfig.nextStepId)
    if (stepConfig.nextStepId === WORKFLOW_END_STEP_ID) {
      return { nonce: '0', continuationWorkflow: '0x' }
    }
    const encodedTargetSegment = await this.instance.encodeSegment(
      stepConfig.nextStepId,
      stepConfig.destinationChain,
      targetChainUserAddress
    )
    log.debug('encoded target segment:\n' + JSON.stringify(encodedTargetSegment, null, 2))
    const { nonce, encodedWorkflow } = getBridgePayload(targetChainUserAddress, encodedTargetSegment)
    log.debug(`generated payload for stepId '${stepConfig.stepId}' nonce='${nonce}'`)
    return { nonce, continuationWorkflow: encodedWorkflow }
  }

  private async getBridgeTargetAddress(context: EncodingContext<StargateBridge>): Promise<string> {
    const { stepConfig, userAddress } = context
    assert(stepConfig.nextStepId)
    if (stepConfig.nextStepId === WORKFLOW_END_STEP_ID) {
      return stepConfig.destinationUserAddress ?? userAddress
    }
    return this.getStargateBridgeActionAddressForChain(stepConfig.destinationChain)
  }

  static getPoolId(assetRef: AssetReference): string {
    assert(typeof assetRef !== 'string')
    if (assetRef.type === 'native') {
      // TODO not sure if this is required when transferring native
      return StargatePoolIds['ETH'].toString()
    }
    const rv = StargatePoolIds[assetRef.symbol]
    return rv.toString()
  }

  async encodeWorkflowStep(context: EncodingContext<StargateBridge>): Promise<EncodedWorkflowStep> {
    const { stepConfig, chain, userAddress } = context
    assert(stepConfig.nextStepId)
    assert(typeof stepConfig.inputAsset !== 'string')
    const [transferInputAsset, payload, targetAddress, dstChainId, remittance] = await Promise.all([
      sdkAssetAmountToEvmInputAmount(stepConfig.inputAsset, chain, this.instance),
      this.getPayload(stepConfig, userAddress),
      this.getBridgeTargetAddress(context),
      this.getStargateChainId(stepConfig.destinationChain),
      this.getRemittance(context.stepConfig),
    ])
    // const transferInputAsset = await sdkAssetAmountToEvmInputAmount(stepConfig.inputAsset, chain, this.instance)
    // const payload = await this.getPayload(stepConfig, userAddress)
    // const targetAddress = await this.getBridgeTargetAddress(context)
    // const dstChainId = await this.getStargateChainId(stepConfig.destinationChain)
    // const remittance = await this.getRemittance(context.stepConfig)

    const { nonce, continuationWorkflow } = payload

    const stargateRequiredNative = remittance.amount.toString()
    let minAmountOut: string
    if (typeof stepConfig.inputAsset.amount === 'string' && stepConfig.inputAsset.amount.endsWith('%')) {
      log.warn('stargate maxSlippagePercent not yet supported for relative input amounts, defaulting minAmountOut to 1')
      minAmountOut = '1'
    } else {
      const p = stepConfig.maxSlippagePercent / 100
      const x = new Big(1 - p)
      const amount = new Big(stepConfig.inputAsset.amount.toString())
      minAmountOut = amount.mul(x).toFixed(0)
    }
    // TODO required native

    // TODO auto gas estimates
    if (!stepConfig.destinationGasUnits) {
      throw new Error('auto gas estimates are not supported')
    }

    const paymentAsset = {
      asset: {
        assetType: AssetType.Native,
        assetAddress: ADDRESS_ZERO,
      },
      amount: stargateRequiredNative.toString(),
      amountIsPercent: false,
    }

    const srcPoolId = StargateBridgeHelper.getPoolId(stepConfig.inputAsset.asset)
    const dstPoolId = stepConfig.outputAsset ? StargateBridgeHelper.getPoolId(stepConfig.inputAsset.asset) : srcPoolId

    const minOut = await this.getStargateMinAmountOut({
      dstChainId,
      dstPoolId: parseInt(dstPoolId),
      srcPoolId: parseInt(srcPoolId),
      dstUserAddress: targetAddress,
      inputAmount: transferInputAsset.amount.toString(),
    })

    minAmountOut = minOut

    const sgArgs: StargateBridgeActionArgs = {
      dstActionAddress: targetAddress, // who initially gets the money and gets invoked by SG
      dstUserAddress: stepConfig.destinationUserAddress ?? context.userAddress, // dstUserAddress, // who gets the money after the continuation workflow completes
      srcPoolId,
      dstPoolId,
      dstChainId: dstChainId.toString(),
      dstGasForCall: stepConfig.destinationGasUnits.toString(), // gas units (not wei or gwei)
      dstNativeAmount: stepConfig.destinationAdditionalNative ? stepConfig.destinationAdditionalNative.toString() : '0',
      minAmountOut: minAmountOut,
      minAmountOutIsPercent: false,
      continuationWorkflow: continuationWorkflow,
      nonce,
    }
    log.debug(`stargate args:\n${JSON.stringify(sgArgs, null, 2)}`)

    return {
      stepId: StepIds.stargateBridge,
      stepAddress: ADDRESS_ZERO,
      inputAssets: [transferInputAsset, paymentAsset],
      outputAssets: [], // no output assets, the input asset is transferred from the caller
      data: EvmStargateBridge.encodeStargateBridgeArgs(sgArgs),
    }
  }

  @Memoize()
  async getFactoryAddress(): Promise<string> {
    const sgRouterAddress = await this.getStargateRouterAddress()
    assert(this.ethersProvider)
    const sgRouter = IStargateRouter__factory.connect(sgRouterAddress, this.ethersProvider)
    const sgFactoryAddr = await sgRouter.factory()
    log.debug(`StargateFactory address=${sgFactoryAddr}`)
    return sgFactoryAddr
  }

  @Memoize()
  async getPoolAddress(poolId: number): Promise<string> {
    const sgFactoryAddr = await this.getFactoryAddress()
    assert(this.ethersProvider)
    const sgFactory = IStargateFactory__factory.connect(sgFactoryAddr, this.ethersProvider)
    const sgPoolAddr = await sgFactory.getPool(poolId)
    log.debug(`StargatePool address=${sgPoolAddr}`)
    return sgPoolAddr
  }

  @Memoize()
  private async getFeeLibraryAddress(srcPoolId: number): Promise<string> {
    const sgPoolAddr = await this.getPoolAddress(srcPoolId)
    assert(this.ethersProvider)
    const sgPool = IStargatePool__factory.connect(sgPoolAddr, this.ethersProvider)
    const sgFeeLibraryAddr = await sgPool.feeLibrary()
    log.debug(`StargateFeeLibrary address=${sgFeeLibraryAddr}`)
    return sgFeeLibraryAddr
  }
  async getStargateMinAmountOut(args: StargateMinAmountOutArgs): Promise<string> {
    assert(this.ethersProvider)
    const sgFeeLibraryAddr = await this.getFeeLibraryAddress(args.srcPoolId)
    const sgFeeLibrary = IStargateFeeLibrary__factory.connect(sgFeeLibraryAddr, this.ethersProvider)
    const swapObj = await sgFeeLibrary.getFees(args.srcPoolId, args.dstPoolId, args.dstChainId, args.dstUserAddress, args.inputAmount)
    const [_amount, eqFee, eqReward, lpFee, protocolFee, _lkbRemove] = swapObj
    const inputAmount = BigNumber.from(args.inputAmount)
    const minAmountOut = inputAmount
      .sub(BigNumber.from(eqFee))
      .sub(BigNumber.from(protocolFee))
      .sub(BigNumber.from(lpFee))
      .add(BigNumber.from(eqReward))
      .mul(StargateBridgeHelper.fudgeFactorNumerator)
      .div(StargateBridgeHelper.fudgeFactorDenominator)

    log.debug(`stargate minAmountOut=${minAmountOut}`)
    return minAmountOut.toString()
  }
  private static fudgeFactorNumerator = BigNumber.from(999)
  private static fudgeFactorDenominator = BigNumber.from(1000)
}
