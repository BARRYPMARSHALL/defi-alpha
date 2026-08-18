export interface GasInfo {
  level: "very-low" | "low" | "medium" | "high";
  estCostPerTx: number;
  label: string;
}

const CHAIN_GAS: Record<string, GasInfo> = {
  Ethereum: { level: "high", estCostPerTx: 25, label: "High ($15-40 per tx)" },
  Arbitrum: { level: "low", estCostPerTx: 0.5, label: "Low (~$0.50 per tx)" },
  Optimism: { level: "low", estCostPerTx: 0.4, label: "Low (~$0.40 per tx)" },
  Base: { level: "low", estCostPerTx: 0.3, label: "Low (~$0.30 per tx)" },
  Polygon: { level: "low", estCostPerTx: 0.1, label: "Very low (~$0.10 per tx)" },
  BSC: { level: "low", estCostPerTx: 0.3, label: "Low (~$0.30 per tx)" },
  Avalanche: { level: "low", estCostPerTx: 0.3, label: "Low (~$0.30 per tx)" },
  Fantom: { level: "very-low", estCostPerTx: 0.05, label: "Very low (~$0.05 per tx)" },
  Solana: { level: "very-low", estCostPerTx: 0.01, label: "Very low (~$0.01 per tx)" },
  "zkSync Era": { level: "low", estCostPerTx: 0.3, label: "Low (~$0.30 per tx)" },
  Linea: { level: "low", estCostPerTx: 0.3, label: "Low (~$0.30 per tx)" },
  Scroll: { level: "low", estCostPerTx: 0.3, label: "Low (~$0.30 per tx)" },
};

export function getGasInfo(chain: string): GasInfo {
  return CHAIN_GAS[chain] || { level: "medium", estCostPerTx: 1, label: "Varies" };
}

/**
 * Estimate net APY after gas costs for an investment amount.
 * Manual pools assume 12 claim+reinvest tx/year. Auto-compound assumes 1 deposit + 1 withdraw/year.
 */
export function estimateNetApy(
  apy: number,
  chain: string,
  investmentUsd: number,
  isAutoCompound: boolean
): number {
  if (investmentUsd <= 0) return apy;
  const gas = getGasInfo(chain);
  const txPerYear = isAutoCompound ? 2 : 12;
  const annualGasCost = gas.estCostPerTx * txPerYear;
  const gasDragPct = (annualGasCost / investmentUsd) * 100;
  return Math.max(apy - gasDragPct, 0);
}
