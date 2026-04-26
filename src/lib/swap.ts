// Minimal Uniswap V3 SwapRouter02 helper for swapping native ETH (via WETH9) into USDC
// on each CCTP-supported testnet. Used by the bridge to allow "ETH → USDC across chains".
//
// SwapRouter02 supports `exactInputSingle` with `msg.value = amountIn` and
// the WETH address as `tokenIn`, which means we don't need a separate wrap step.
// After the swap completes, the resulting USDC sits in the user's wallet ready
// for the CCTP `depositForBurn` flow.

import { sepolia, baseSepolia, arbitrumSepolia } from "wagmi/chains";
import { type Address, encodeFunctionData } from "viem";

export type SwapRoute = {
  chainId: number;
  weth: Address;
  usdc: Address;
  swapRouter: Address; // Uniswap V3 SwapRouter02
  feeTier: number; // pool fee for WETH/USDC
};

export const SWAP_ROUTES: SwapRoute[] = [
  {
    chainId: sepolia.id,
    weth: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    swapRouter: "0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E", // SwapRouter02 sepolia
    feeTier: 500,
  },
  {
    chainId: baseSepolia.id,
    weth: "0x4200000000000000000000000000000000000006",
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    swapRouter: "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4", // SwapRouter02 base sepolia
    feeTier: 500,
  },
  {
    chainId: arbitrumSepolia.id,
    weth: "0x980B62Da83eFf3D4576C647993b0c1D7faf17c73",
    usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    swapRouter: "0x101F443B4d1b059569D643917553c771E1b9663E", // SwapRouter02 arb sepolia
    feeTier: 500,
  },
];

export function findSwapRoute(chainId: number | undefined): SwapRoute | undefined {
  return SWAP_ROUTES.find((r) => r.chainId === chainId);
}

// exactInputSingle on Uniswap V3 SwapRouter02 (no deadline arg in V2 of the router).
export function buildExactInputSingleCalldata(args: {
  tokenIn: Address;
  tokenOut: Address;
  fee: number;
  recipient: Address;
  amountIn: bigint;
  amountOutMinimum: bigint;
  sqrtPriceLimitX96?: bigint;
}) {
  return encodeFunctionData({
    abi: [
      {
        type: "function",
        name: "exactInputSingle",
        stateMutability: "payable",
        inputs: [
          {
            name: "params",
            type: "tuple",
            components: [
              { name: "tokenIn", type: "address" },
              { name: "tokenOut", type: "address" },
              { name: "fee", type: "uint24" },
              { name: "recipient", type: "address" },
              { name: "amountIn", type: "uint256" },
              { name: "amountOutMinimum", type: "uint256" },
              { name: "sqrtPriceLimitX96", type: "uint160" },
            ],
          },
        ],
        outputs: [{ name: "amountOut", type: "uint256" }],
      },
    ],
    functionName: "exactInputSingle",
    args: [
      {
        tokenIn: args.tokenIn,
        tokenOut: args.tokenOut,
        fee: args.fee,
        recipient: args.recipient,
        amountIn: args.amountIn,
        amountOutMinimum: args.amountOutMinimum,
        sqrtPriceLimitX96: args.sqrtPriceLimitX96 ?? 0n,
      } as any,
    ],
  });
}

// ERC20 balanceOf(address)
export function buildBalanceOfCalldata(owner: Address) {
  return encodeFunctionData({
    abi: [
      {
        type: "function",
        name: "balanceOf",
        stateMutability: "view",
        inputs: [{ name: "owner", type: "address" }],
        outputs: [{ type: "uint256" }],
      },
    ],
    functionName: "balanceOf",
    args: [owner],
  });
}
