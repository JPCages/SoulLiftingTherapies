// Loyalty maths, shared by the API and the customer display.
export function pointsForSpend(amountPennies:number,poundsPerPoint:number):number{
  if(poundsPerPoint<=0||amountPennies<=0)return 0;
  return Math.floor((amountPennies/100)/poundsPerPoint);
}
export type RewardStatus={balance:number;threshold:number;rewardsReady:number;progress:number;toNext:number};
export function rewardStatus(balance:number,threshold:number):RewardStatus{
  const t=threshold>0?threshold:1;
  const rewardsReady=Math.floor(balance/t);
  const progress=balance%t;
  return {balance,threshold:t,rewardsReady,progress,toNext:t-progress};
}
