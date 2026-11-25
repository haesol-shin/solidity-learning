import { HardhatUserConfig, vars } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const kairosKeys = [0, 1, 2]
  .map((i) => `KAIROS_KEY_${i}`)
  .filter((name) => vars.has(name))
  .map((name) => vars.get(name));

if (kairosKeys.length !== 0 && kairosKeys.length !== 3) {
  throw new Error("KAIROS_KEY_0..2 must all be set");
}

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    kairos: {
      url: "https://public-en-kairos.node.kaia.io",
      chainId: 1001,
      accounts: kairosKeys,
    },
  },
};

export default config;
