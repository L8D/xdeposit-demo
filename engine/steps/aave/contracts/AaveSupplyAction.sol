// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import '@freemarket/core/contracts/IWorkflowStep.sol';
import '@freemarket/step-sdk/contracts/LibActionHelpers.sol';
import './IAaveV3Pool.sol';
import '@freemarket/core/contracts/model/AssetAmount.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@freemarket/step-sdk/contracts/LibStepResultBuilder.sol';
import '@freemarket/step-sdk/contracts/LibErc20.sol';
import '@freemarket/step-sdk/contracts/LibWethUtils.sol';
import 'hardhat/console.sol';

using LibStepResultBuilder for StepResultBuilder;
using LibErc20 for IERC20;

contract AaveSupplyAction is IWorkflowStep {
  address public immutable poolAddress;
  address public immutable wethAddress;

  /// @notice This event is emitted when an Aave 'supply' action is executed.
  /// @param inputAssetAmount the asset and amout being supplied to Aave.
  event AaveSupplyActionEvent(AssetAmount inputAssetAmount);

  constructor(address _aavePoolAddress, address _wethAddress) {
    poolAddress = _aavePoolAddress;
    wethAddress = _wethAddress;
  }

  struct Locals {
    IERC20 inputToken;
    address inputTokenAddress;
    IAaveV3Pool pool;
    IERC20 aToken;
    uint256 aTokenBalanceBefore;
    uint256 aTokenBalanceAfter;
    ReserveData reserveData;
  }

  function execute(AssetAmount[] calldata assetAmounts, bytes calldata) public payable returns (WorkflowStepResult memory) {
    // validate
    require(assetAmounts.length == 1, 'there must be exactly 1 input asset');
    // require(assetAmounts[0].asset.assetType == AssetType.ERC20, 'the input asset must be an ERC20');

    emit AaveSupplyActionEvent(assetAmounts[0]);
    Locals memory locals;

    console.log('entering aave supply action');
    console.log('assetAmounts[0].asset.address', assetAmounts[0].asset.assetAddress);

    locals.inputTokenAddress = LibWethUtils.wrapIfNecessary(assetAmounts[0], wethAddress);
    console.log('locals.inputTokenAddress', locals.inputTokenAddress);

    // approve aave to take the asset
    locals.inputToken = IERC20(locals.inputTokenAddress);
    locals.inputToken.safeApprove(poolAddress, assetAmounts[0].amount);

    // get the aToken
    locals.pool = IAaveV3Pool(poolAddress);
    locals.reserveData = locals.pool.getReserveData(locals.inputTokenAddress);
    locals.aToken = IERC20(locals.reserveData.aTokenAddress);

    // take note of the before balance
    locals.aTokenBalanceBefore = locals.aToken.balanceOf(address(this));

    // invoke supply
    locals.pool.supply(locals.inputTokenAddress, assetAmounts[0].amount, address(this), 0);

    locals.aTokenBalanceAfter = locals.aToken.balanceOf(address(this));
    require(locals.aTokenBalanceAfter > locals.aTokenBalanceBefore, 'aToken balance did not increase');

    return
      LibStepResultBuilder
        .create(1, 1)
        .addInputAssetAmount(assetAmounts[0])
        .addOutputToken(locals.reserveData.aTokenAddress, locals.aTokenBalanceAfter - locals.aTokenBalanceBefore)
        .result;
  }
}
