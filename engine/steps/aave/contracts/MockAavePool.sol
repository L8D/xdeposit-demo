// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./IAaveV3Pool.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import '../../mocks/MockToken.sol';
import "@freemarket/step-sdk/contracts/TestErc20.sol";

contract MockAavePool is IAaveV3Pool {
    TestErc20 public immutable mockAToken = new TestErc20();

    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external {
        // take the asset being supplied, and mint some aToken (equal amounts of each)
        IERC20(asset).transferFrom(msg.sender, address(this), amount);
        mockAToken.mint(onBehalfOf, amount);
        emit Supply(asset, msg.sender, onBehalfOf, amount, referralCode);
    }

    function getReserveData(address) external view returns (ReserveData memory) {
        return ReserveData(
            ReserveConfigurationMap(0),
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            address(mockAToken),
            address(0),
            address(0),
            address(0),
            0,
            9,
            0
        );
    }
}
