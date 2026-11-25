import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("MyTokenDeploy", (m) => {
  const managers = [m.getAccount(0), m.getAccount(1), m.getAccount(2)];
  const myTokenC = m.contract("MyToken", ["MyToken", "MT", 18, 100]);
  const tinyBankC = m.contract("TinyBank", [myTokenC, managers]);
  m.call(myTokenC, "setManager", [tinyBankC]);
  return { myTokenC, tinyBankC };
});
