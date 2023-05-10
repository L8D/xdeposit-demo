// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "@freemarket/core/contracts/IWorkflowStep.sol";
import "@freemarket/step-sdk/contracts/LibActionHelpers.sol";
import "./IAaveV3PoolWithdraw.sol";
import "@freemarket/core/contracts/model/AssetAmount.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@freemarket/step-sdk/contracts/LibStepResultBuilder.sol";
import "@freemarket/step-sdk/contracts/LibErc20.sol";

using LibStepResultBuilder for StepResultBuilder;
using LibErc20 for IERC20;

// import {IPool} from '@aave/core-v3/contracts/interfaces/IPool.sol';
// import {DataTypes} from '@aave/core-v3/contracts/protocol/libraries/types/DataTypes.sol';

contract AaveWithdrawAction is IWorkflowStep {
    address public immutable poolAddress;

    /// @notice This event is emitted when an Aave 'withdraw' action is executed.
    /// @param inputAssetAmount the asset and amout being withdrawn to Aave.
    event AaveWithdrawActionEvent(AssetAmount inputAssetAmount);

    constructor(address _aavePoolAddress) {
        poolAddress = _aavePoolAddress;
    }

    struct Locals {
        IERC20 inputToken;
        IAaveV3Pool pool;
        IERC20 aToken;
        uint256 aTokenBalanceBefore;
        uint256 aTokenBalanceAfter;
        uint256 collateralBalanceBefore;
        uint256 collateralBalanceAfter;
        ReserveData reserveData;
    }

    function execute(AssetAmount[] calldata assetAmounts, bytes calldata)
        public
        payable
        returns (WorkflowStepResult memory)
    {
        // validate
        require(assetAmounts.length == 1, "there must be exactly 1 input asset");
        require(assetAmounts[0].asset.assetType == AssetType.ERC20, "the input asset must be an ERC20");
        // require(outputAssets.length == 1, 'there must be exactly 1 output asset when keeping the aToken in the engine');

        emit AaveWithdrawActionEvent(assetAmounts[0]);
        Locals memory locals;
        // approve aave to take the asset
        locals.inputToken = IERC20(assetAmounts[0].asset.assetAddress);
        locals.inputToken.safeApprove(poolAddress, assetAmounts[0].amount);

        // get the aToken
        locals.pool = IAaveV3Pool(poolAddress);
        locals.reserveData = locals.pool.getReserveData(assetAmounts[0].asset.assetAddress);
        locals.aToken = IERC20(locals.reserveData.aTokenAddress);

        // take note of the before balance
        locals.aTokenBalanceBefore = locals.aToken.balanceOf(address(this));

        // invoke withdraw
        locals.pool.withdraw(assetAmounts[0].asset.assetAddress, assetAmounts[0].amount, address(this), 0);
        locals.collateralBalanceAfter = locals.inputToken.balance(address(this))
        require(locals.collateralBalanceAfter > locals.collateralBalanceBefore, "Collateral did not increase")
        locals.aTokenBalanceAfter = locals.aToken.balanceOf(address(this));
        require(locals.aTokenBalanceAfter < locals.aTokenBalanceBefore, "aToken balance did not decrease");

        return LibStepResultBuilder.create(1, 1).addInputAssetAmount(assetAmounts[0]).addOutputToken(
            locals.reserveData.aTokenAddress, locals.aTokenBalanceAfter - locals.aTokenBalanceBefore
        ).result;
    }
}
