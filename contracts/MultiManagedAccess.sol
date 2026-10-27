// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

abstract contract MultiManagedAccess {
    address[] public managers;
    bool[] public confirmed;

    constructor(address[] memory _managers) {
        require(_managers.length >= 3, "at least 3 managers required");
        managers = _managers;
        confirmed = new bool[](_managers.length);
    }

    modifier onlyManager() {
        require(isManager(msg.sender), "You are not a manager");
        _;
    }

    modifier onlyAllConfirmed() {
        require(isManager(msg.sender), "You are not a manager");
        require(allConfirmed(), "Not all confirmed yet");
        reset();
        _;
    }

    function confirm() external onlyManager {
        for (uint256 i = 0; i < managers.length; i++) {
            if (managers[i] == msg.sender) {
                confirmed[i] = true;
            }
        }
    }

    function isManager(address addr) internal view returns (bool) {
        for (uint256 i = 0; i < managers.length; i++) {
            if (managers[i] == addr) {
                return true;
            }
        }
        return false;
    }

    function allConfirmed() internal view returns (bool) {
        for (uint256 i = 0; i < confirmed.length; i++) {
            if (!confirmed[i]) {
                return false;
            }
        }
        return true;
    }

    function reset() internal {
        for (uint256 i = 0; i < confirmed.length; i++) {
            confirmed[i] = false;
        }
    }
}
