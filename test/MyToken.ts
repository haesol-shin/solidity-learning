import hre from "hardhat";
import { expect } from "chai";
import { MyToken } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

const mintingAmount = 100n;
const decimals = 18n;

describe("My Token", () => {
  let myTokenC: MyToken;
  let signers: HardhatEthersSigner[];
  beforeEach("should deploy", async () => {
    signers = await hre.ethers.getSigners();
    myTokenC = await hre.ethers.deployContract("MyToken", [
      "MyToken",
      "MT",
      decimals,
      mintingAmount,
    ]);
  });
  describe("Basic state value check", () => {
    it("should return name", async () => {
      expect(await myTokenC.name()).equal("MyToken");
    });
    it("should return symbol", async () => {
      expect(await myTokenC.symbol()).equal("MT");
    });
    it("should return decimals", async () => {
      expect(await myTokenC.decimals()).equal(decimals);
    });
    it("should return 100MT totalSupply", async () => {
      expect(await myTokenC.totalSupply()).equal(
        mintingAmount * 10n ** decimals,
      );
    });
  });

  describe("Mint", () => {
    it("should return 100MT balance for signer 0", async () => {
      const signer0 = signers[0];
      expect(await myTokenC.balanceOf(signer0)).equal(
        mintingAmount * 10n ** decimals,
      );
    });
  });

  describe("Transfer", () => {
    it("should have 0.5MT", async () => {
      const signer0 = signers[0];
      const signer1 = signers[1];
      await expect(
        myTokenC.transfer(
          hre.ethers.parseUnits("0.5", decimals),
          signer1.address,
        ),
      )
        .to.emit(myTokenC, "Transfer")
        .withArgs(
          signer0.address,
          signer1.address,
          hre.ethers.parseUnits("0.5", decimals),
        );
      expect(await myTokenC.balanceOf(signer1.address)).equal(
        hre.ethers.parseUnits("0.5", decimals),
      );
    });
    it("should be reverted with insufficient balance error", async () => {
      const signer1 = signers[1];
      await expect(
        myTokenC.transfer(
          hre.ethers.parseUnits((mintingAmount + 1n).toString(), decimals),
          signer1.address,
        ),
      ).to.be.revertedWith("insufficient balance");
    });
  });

  describe("TransferFrom", () => {
    it("should emit Approval event", async () => {
      const signer0 = signers[0];
      const signer1 = signers[1];
      const amount = hre.ethers.parseUnits("10", decimals);
      await expect(myTokenC.approve(signer1.address, amount))
        .to.emit(myTokenC, "Approval")
        .withArgs(signer1.address, amount);
      expect(await myTokenC.allowance(signer0.address, signer1.address)).equal(
        amount,
      );
    });

    it("should be reverted with insufficient allowance error", async () => {
      const signer0 = signers[0];
      const signer1 = signers[1];
      await expect(
        myTokenC
          .connect(signer1)
          .transferFrom(
            signer0.address,
            signer1.address,
            hre.ethers.parseUnits("1", decimals),
          ),
      ).to.be.revertedWith("insufficient allowance");
      expect(await myTokenC.balanceOf(signer0.address)).equal(
        mintingAmount * 10n ** decimals,
      );
      expect(await myTokenC.balanceOf(signer1.address)).equal(0n);
    });

    it("should be reverted when exceeding the allowance", async () => {
      const signer0 = signers[0];
      const signer1 = signers[1];
      const allowed = hre.ethers.parseUnits("1", decimals);
      await myTokenC.approve(signer1.address, allowed);
      await expect(
        myTokenC
          .connect(signer1)
          .transferFrom(signer0.address, signer1.address, allowed + 1n),
      ).to.be.revertedWith("insufficient allowance");
      expect(await myTokenC.allowance(signer0.address, signer1.address)).equal(
        allowed,
      );
      expect(await myTokenC.balanceOf(signer1.address)).equal(0n);
    });

    it("should move signer0's MT to signer1 by transferFrom", async () => {
      const signer0 = signers[0];
      const signer1 = signers[1];
      const amount = hre.ethers.parseUnits("10", decimals);

      // 1. approve
      await expect(myTokenC.connect(signer0).approve(signer1.address, amount))
        .to.emit(myTokenC, "Approval")
        .withArgs(signer1.address, amount);

      // 2. transferFrom
      await expect(
        myTokenC
          .connect(signer1)
          .transferFrom(signer0.address, signer1.address, amount),
      )
        .to.emit(myTokenC, "Transfer")
        .withArgs(signer0.address, signer1.address, amount);

      // 3. check balance
      expect(await myTokenC.balanceOf(signer0.address)).equal(
        mintingAmount * 10n ** decimals - amount,
      );
      expect(await myTokenC.balanceOf(signer1.address)).equal(amount);
      expect(await myTokenC.allowance(signer0.address, signer1.address)).equal(
        0n,
      );
    });
  });
});
