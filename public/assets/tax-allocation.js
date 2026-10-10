// Integer cents, rounded independently for each tax component.
const bands=[[36000,3,0],[144000,10,2520],[300000,20,16920],[420000,25,31920],[660000,30,52920],[960000,35,85920],[Infinity,45,181920]];
const cents=v=>Math.round(v*100);
const wageTax=(taxable,relief)=>{const [,rate,quick]=bands.find(([cap])=>taxable<=cap*100);return Math.max(0,Math.round(Math.max(0,taxable)*rate/100)-quick*100-relief);};
const bonusTax=v=>{if(!v)return 0;const [,rate,quick]=bands.find(([cap])=>v<=cap*100);return Math.round(v*rate/100)-quick*100/12;};
export function allocateTax(d){
 const budget=cents(d.bonus),prior=d.priorMethod==='none'?0:cents(d.previousBonus),income=cents(d.annualIncome),deduction=cents(d.annualDeduction),relief=cents(d.annualRelief||0);
 const used=d.priorMethod==='separate',eligible=d.eligible==='yes',planning=d.allocationStage==='planning';
 const priorTax=used?bonusTax(prior):0,regular=income+(used?0:prior),net=regular+budget-deduction;
 const total=x=>wageTax(net-x,relief)+bonusTax(x)+priorTax;
 let candidates=new Set([0]);
 if(eligible&&!used){candidates.add(budget);if(planning){
  // Between tax bracket/zero-tax boundaries slopes are constant. Rounding repeats
  // every 100 cents, so a 100-cent window on each boundary covers exact minima.
  const boundaries=[0,budget,net];
  for(const [cap,rate,quick]of bands){if(Number.isFinite(cap))boundaries.push(cap*100,net-cap*100);boundaries.push(net-(quick*100+relief)*100/rate);}
  for(const point of boundaries)if(Number.isFinite(point))for(let offset=-100;offset<=100;offset++){const x=Math.round(point)+offset;if(x>=0&&x<=budget)candidates.add(x);}
 }}
 let best=0,bestTax=total(0);for(const x of candidates){const tax=total(x);if(tax<bestTax||(tax===bestTax&&x<best)){best=x;bestTax=tax;}}
 const allMerged=wageTax(income+prior+budget-deduction,relief);
 let previousChoice=used?'保留此前奖金单独计税':'此前奖金并入综合所得';
 // Switching an earlier separate bonus to combined is a whole-payment election,
 // never a split of an already received bonus or a second payroll use.
 if(used&&allMerged<bestTax){best=0;bestTax=allMerged;previousChoice='此前奖金整笔并入综合所得（年度汇算测算）';}
 const amount=best/100,wage=(budget-best)/100;
 return {bonus:amount,wage,bonusPercent:budget?Math.round(best/budget*10000)/100:0,wagePercent:budget?Math.round((budget-best)/budget*10000)/100:0,tax:bestTax/100,baseline:total(0)/100,saving:(total(0)-bestTax)/100,previousChoice,continuous:planning&&eligible&&!used,used,eligible,planning,evaluated:candidates.size};
}
