// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;
import '../../IWorkflowStep.sol';
import '../../IWorkflowRunner.sol';
import '../../LibAsset.sol';
import '../../LibActionHelpers.sol';
import '../../model/Asset.sol';
import '../../model/AssetAmount.sol';
import '../../model/BridgePayload.sol';
import './IStargateRouter.sol';
import './IStargateReceiver.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';

// StargateBridgeAction specific arguments
struct StargateBridgeActionArgs {
  //  addr of the StargateSwapAction on the target chain.
  address dstActionAddress;
  // addr of the user (caller on the source chain)
  address dstUserAddress;
  // stargate destination chain
  uint16 dstChainId;
  // stargate source pool (implies source asset)
  uint256 srcPoolId;
  // stargate destination pool (implies destination asset)
  uint256 dstPoolId;
  // gas to execute workflow continuation on destination chain
  uint256 dstGasForCall;
  // amount of native asset to send to dstUserAddress
  uint256 dstNativeAmount;
  // minimum amount of output asset (else the tx on the source chain will revert)
  uint256 minAmountOut;
  // if true, minAmountOut passed to stargate
  bool minAmountOutIsPercent;
}

contract StargateBridgeAction is IWorkflowStep, IStargateReceiver {
  address public immutable frontDoorAddress;
  address public immutable stargateRouterAddress;

  event Wtf(uint256 x);
  event SgReceiveCalled(BridgePayload bridgePayload);

  event StargateBridgeParamsEvent(
    uint256 nativeAmount,
    uint256 assetAmount,
    address dstActionAddress,
    uint16 dstChainId,
    uint256 srcPoolId,
    uint256 dstPoolId,
    uint256 dstGasForCall,
    uint256 dstNativeAmount,
    uint256 minAmountOut,
    bytes nextChainWorkflow
  );

  constructor(address _frontDoorAddress, address _stargateRouterAddress) {
    frontDoorAddress = _frontDoorAddress;
    stargateRouterAddress = _stargateRouterAddress;
  }

  //  need to gather things up into a struct to prevent 'Stack too deep'
  struct Locals {
    uint256 lengthPrefix;
    StargateBridgeActionArgs sgParams;
    bytes dstActionAddressEncoded;
    uint256 minAmountOut;
    AssetAmount nativeInputAsset;
    AssetAmount erc20InputAsset;
  }

  function execute(
    AssetAmount[] calldata inputAssetAmounts,
    Asset[] calldata,
    bytes calldata data
  ) public payable returns (WorkflowStepResult memory) {
    emit Wtf(66);
    Locals memory locals;
    require(inputAssetAmounts.length == 2, 'there must be 2 input assets');
    if (inputAssetAmounts[0].asset.assetType == AssetType.Native) {
      require(inputAssetAmounts[1].asset.assetType == AssetType.ERC20, 'one input asset must be an ERC20');
      locals.nativeInputAsset = inputAssetAmounts[0];
      locals.erc20InputAsset = inputAssetAmounts[1];
    } else if (inputAssetAmounts[1].asset.assetType == AssetType.Native) {
      require(inputAssetAmounts[0].asset.assetType == AssetType.ERC20, 'one input asset must be an ERC20');
      locals.nativeInputAsset = inputAssetAmounts[1];
      locals.erc20InputAsset = inputAssetAmounts[0];
    } else {
      revert('one input asset must be native');
    }
    require(
      inputAssetAmounts[0].asset.assetType == AssetType.ERC20 || inputAssetAmounts[0].asset.assetType == AssetType.Native,
      'the input asset must be an ERC20 or Native'
    );

    // approve sg to take the token
    if (inputAssetAmounts[0].asset.assetType == AssetType.ERC20) {
      approveErc20(inputAssetAmounts[0].asset.assetAddress, inputAssetAmounts[0].amount);
    }

    // decode the parameters
    locals.lengthPrefix = abi.decode(data[0:32], (uint256));
    locals.sgParams = abi.decode(data[32:32 + locals.lengthPrefix], (StargateBridgeActionArgs));

    // address payable refundAddress = payable(msg.sender);
    locals.dstActionAddressEncoded = abi.encodePacked(locals.sgParams.dstActionAddress);
    if (locals.sgParams.minAmountOutIsPercent) {
      locals.minAmountOut = (inputAssetAmounts[0].amount * locals.sgParams.minAmountOut) / 100_000;
    } else {
      locals.minAmountOut = locals.sgParams.minAmountOut;
    }

    // emit Eraseme(locals.nativeInputAsset.amount);

    emit StargateBridgeParamsEvent(
      locals.nativeInputAsset.amount, // native amount
      inputAssetAmounts[0].amount, // token amount
      locals.sgParams.dstActionAddress, // dest addr for money and sgReceive
      locals.sgParams.dstChainId,
      locals.sgParams.srcPoolId,
      locals.sgParams.dstPoolId,
      locals.sgParams.dstGasForCall,
      locals.sgParams.dstNativeAmount,
      locals.minAmountOut,
      data[32 + locals.lengthPrefix:]
    );

    IStargateRouter(stargateRouterAddress).swap{value: locals.nativeInputAsset.amount}(
      locals.sgParams.dstChainId,
      locals.sgParams.srcPoolId,
      locals.sgParams.dstPoolId,
      payable(msg.sender), // refundAddreess
      inputAssetAmounts[0].amount,
      locals.minAmountOut,
      IStargateRouter.lzTxObj(
        locals.sgParams.dstGasForCall,
        locals.sgParams.dstNativeAmount,
        abi.encodePacked(locals.sgParams.dstUserAddress)
      ),
      locals.dstActionAddressEncoded,
      data[32 + locals.lengthPrefix:]
    );
    return LibActionHelpers.noOutputAssetsResult();
  }

  function approveErc20(address tokenAddress, uint256 amount) internal {
    IERC20 inputToken = IERC20(tokenAddress);
    inputToken.approve(stargateRouterAddress, amount);
  }

  function sgReceive(
    uint16, // the remote chainId sending the tokens
    bytes memory, // the remote Bridge address
    uint256,
    address tokenAddress, // the token contract on the local chain
    uint256 amount, // the qty of local token contract tokens
    bytes memory payload
  ) external {
    require(msg.sender == stargateRouterAddress, 'only Stargate is permitted to call sgReceive');
    emit Wtf(99);
    // BridgePayload memory bridgePayload = abi.decode(payload, (BridgePayload));
    // // TODO eraseme we don't need this event after everything is debugged
    // emit SgReceiveCalled(bridgePayload);

    // TODO maybe we do delegateProxy here instead to avoid having this xfer
    // IERC20 startingToken = IERC20(tokenAddress);
    // SafeERC20.safeTransfer(startingToken, frontDoorAddress, amount);

    // AssetAmount memory startingAsset = AssetAmount(Asset(AssetType.ERC20, tokenAddress), amount);
    // IWorkflowRunner runner = IWorkflowRunner(frontDoorAddress);
    // runner.continueWorkflow(bridgePayload.userAddress, bridgePayload.nonce, bridgePayload.workflow, startingAsset);
  }
}
