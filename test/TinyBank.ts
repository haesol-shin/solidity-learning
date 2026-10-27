import hre from "hardhat";
import { expect } from "chai";
import { DECIMALS, MINTING_AMOUNT } from "./constant";
import { MyToken, TinyBank } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("TinyBank", () => {
  let signers: HardhatEthersSigner[];
  let managers: HardhatEthersSigner[];
  let myTokenC: MyToken;
  let tinyBankC: TinyBank;
  beforeEach(async () => {
    signers = await hre.ethers.getSigners();
    managers = signers.slice(0, 3);
    myTokenC = await hre.ethers.deployContract("MyToken", [
      "MyToken",
      "MT",
      DECIMALS,
      MINTING_AMOUNT,
    ]);
    tinyBankC = await hre.ethers.deployContract("TinyBank", [
      await myTokenC.getAddress(),
      managers.map((m) => m.address),
    ]);
    await myTokenC.setManager(await tinyBankC.getAddress());
  });

  describe("Initialized state check", () => {
    it("should return totalStaked 0", async () => {
      expect(await tinyBankC.totalStaked()).equal(0);
    });
    it("should return staked 0 amount of signer0", async () => {
      const signer0 = signers[0];
      expect(await tinyBankC.staked(signer0.address)).equal(0);
    });
  });

  describe("Staking", () => {
    it("should revert when staking 0", async () => {
      await expect(tinyBankC.stake(0)).to.be.revertedWith(
        "cannot stake 0 amount",
      );
    });
    it("should return staked amount", async () => {
      const signer0 = signers[0];
      const stakingAmount = hre.ethers.parseUnits("50", DECIMALS);
      await myTokenC.approve(await tinyBankC.getAddress(), stakingAmount);
      await tinyBankC.stake(stakingAmount);
      expect(await tinyBankC.staked(signer0.address)).equal(stakingAmount);
      expect(await tinyBankC.totalStaked()).equal(stakingAmount);
      expect(await myTokenC.balanceOf(tinyBankC)).equal(
        await tinyBankC.totalStaked(),
      );
    });
  });

  describe("Withdraw", () => {
    it("should return 0 staked after withdrawing total token", async () => {
      const signer0 = signers[0];
      const stakingAmount = hre.ethers.parseUnits("50", DECIMALS);
      await myTokenC.approve(await tinyBankC.getAddress(), stakingAmount);
      await tinyBankC.stake(stakingAmount);
      await tinyBankC.withdraw(stakingAmount);
      expect(await tinyBankC.staked(signer0.address)).equal(0);
    });
  });

  describe("Reward", () => {
    it("should reward 1MT every blocks", async () => {
      const signer0 = signers[0];
      const stakingAmount = hre.ethers.parseUnits("50", DECIMALS);
      await myTokenC.approve(await tinyBankC.getAddress(), stakingAmount);
      await tinyBankC.stake(stakingAmount);

      const BLOCKS = 5n;
      const transferAmount = hre.ethers.parseUnits("1", DECIMALS);
      for (let i = 0; i < BLOCKS; i++) {
        await myTokenC.transfer(transferAmount, signer0.address);
      }

      await tinyBankC.withdraw(stakingAmount);
      expect(await myTokenC.balanceOf(signer0.address)).equal(
        hre.ethers.parseUnits((BLOCKS + MINTING_AMOUNT + 1n).toString()),
      );
    });
  });

  describe("Multi Manager", () => {
    const rewardToChange = hre.ethers.parseUnits("10000", DECIMALS);

    it("should revert deployment with fewer than 3 managers", async () => {
      await expect(
        hre.ethers.deployContract("TinyBank", [
          await myTokenC.getAddress(),
          managers.slice(0, 2).map((m) => m.address),
        ]),
      ).to.be.revertedWith("at least 3 managers required");
    });

    it("should revert with not a manager error from a non-manager", async () => {
      const hacker = signers[3];
      await expect(
        tinyBankC.connect(hacker).setRewardPerBlock(rewardToChange),
      ).to.be.revertedWith("You are not a manager");
      await expect(tinyBankC.connect(hacker).confirm()).to.be.revertedWith(
        "You are not a manager",
      );
    });

    it("should revert with not all confirmed error before every manager confirms", async () => {
      await expect(
        tinyBankC.connect(managers[0]).setRewardPerBlock(rewardToChange),
      ).to.be.revertedWith("Not all confirmed yet");

      await tinyBankC.connect(managers[0]).confirm();
      await tinyBankC.connect(managers[1]).confirm();
      await expect(
        tinyBankC.connect(managers[0]).setRewardPerBlock(rewardToChange),
      ).to.be.revertedWith("Not all confirmed yet");
    });

    it("should change rewardPerBlock after every manager confirms", async () => {
      for (const manager of managers) {
        await tinyBankC.connect(manager).confirm();
      }
      await tinyBankC.connect(managers[0]).setRewardPerBlock(rewardToChange);
      expect(await tinyBankC.rewardPerBlock()).equal(rewardToChange);
    });

    it("should reset every confirmation after the change", async () => {
      for (const manager of managers) {
        await tinyBankC.connect(manager).confirm();
      }
      await tinyBankC.connect(managers[0]).setRewardPerBlock(rewardToChange);

      for (let i = 0; i < managers.length; i++) {
        expect(await tinyBankC.confirmed(i)).equal(false);
      }
      await expect(
        tinyBankC.connect(managers[0]).setRewardPerBlock(rewardToChange),
      ).to.be.revertedWith("Not all confirmed yet");
    });
  });
});
