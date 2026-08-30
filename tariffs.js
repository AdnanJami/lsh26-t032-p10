
// ==========================================
// 1. MODEL
// ==========================================
class MeterModel {
    constructor() {
        // Tariff configuration based on strict prompt constraints
        this.slabs = [
            { limit: 75, rate: 4.63 },
            { limit: 200, rate: 5.26 },
            { limit: 300, rate: 5.63 },
            { limit: 400, rate: 5.83 },
            { limit: 600, rate: 9.30 },
            { limit: Infinity, rate: 10.70 }
        ];
        this.demandCharge = 42;
        this.meterRent = 40;
        this.vatRate = 0.05;

        this.rawLogs = []; // The input data: {date, units, recharge}
        this.processedLogs = []; // The output data: includes calculated balances and costs
        this.currentBalance = 0;
        this.currentMonthUnits = 0;
    }

    // Calculate cost for a given amount of units, starting from a specific slab position
    calculateEnergyCost(startSlabUnits, unitsToBill) {
        let remainingUnits = unitsToBill;
        let currentPos = startSlabUnits;
        let totalCost = 0;
        let baseCost = unitsToBill * this.slabs[0].rate; // Cost if all units were in the lowest slab

        for (let slab of this.slabs) {
            if (remainingUnits <= 0) break;
            if (currentPos < slab.limit) {
                let unitsInThisSlab = Math.min(remainingUnits, slab.limit - currentPos);
                totalCost += unitsInThisSlab * slab.rate;
                remainingUnits -= unitsInThisSlab;
                currentPos += unitsInThisSlab;
            }
        }
        
        return {
            cost: totalCost,
            penalty: totalCost - baseCost, // "The part caused by being in a higher slab"
            endSlabUnits: currentPos
        };
    }

    // Core Engine: Rebuilds the meter balance day by day
    processHistory(startBalance = 0) {
        this.processedLogs = [];
        let balance = startBalance;
        let monthSlabUnits = 0;
        let currentMonth = null;
        let paidFixedThisMonth = false;

        for (let day of this.rawLogs) {
            let d = new Date(day.date);
            let month = d.getMonth();

            // CRITICAL: Slab counter resets on the first day of each calendar month
            if (month !== currentMonth) {
                monthSlabUnits = 0;
                currentMonth = month;
                paidFixedThisMonth = false;
            }

            let recharge = day.recharge || 0;
            let fixedDeducted = 0;
            
            // CRITICAL: Fixed charges taken on the FIRST recharge of that month
            if (recharge > 0) {
                balance += recharge;
                if (!paidFixedThisMonth) {
                    fixedDeducted = this.demandCharge + this.meterRent;
                    balance -= fixedDeducted;
                    paidFixedThisMonth = true;
                }
            }

            // Process energy
            let { cost, endSlabUnits } = this.calculateEnergyCost(monthSlabUnits, day.units);
            let vat = cost * this.vatRate;
            let totalDeduction = cost + vat;
            
            balance -= totalDeduction;
            monthSlabUnits = endSlabUnits;

            this.processedLogs.push({
                date: day.date,
                units: day.units,
                recharge: recharge,
                energyCost: cost,
                vat: vat,
                fixedCharge: fixedDeducted,
                balance: balance,
                monthSlabUnits: monthSlabUnits,
                paidFixedThisMonth: paidFixedThisMonth
            });
        }

        // Update current state based on last processed day
        if (this.processedLogs.length > 0) {
            let last = this.processedLogs[this.processedLogs.length - 1];
            this.currentBalance = last.balance;
            this.currentMonthUnits = last.monthSlabUnits;
            this.paidFixedThisMonth = last.paidFixedThisMonth;
            this.lastDate = new Date(last.date);
        }
    }

    // Generate initial mock data ensuring we hit specific scenarios requested
    generateMockData() {
        const data = [];
        let d = new Date(2023, 0, 1); // Jan 1, 2023
        
        for (let i = 0; i < 181; i++) { // Approx 6 months
            let month = d.getMonth();
            let units = 5;
            let recharge = 0;

            // Scenarios setup
            if (month === 0) units = 2.5 + Math.random(); // Jan: Light month
            else if (month === 3) units = 14 + Math.random()*3; // Apr: Heavy summer month
            else if (month === 4) units = 8 + Math.random(); // May: Late heavy recharge
            else units = 5 + Math.random()*2; // Normal

            // Specific Recharge Habits for history
            if (month === 0 && d.getDate() === 5) recharge = 800;
            if (month === 1 && d.getDate() === 10) recharge = 800;
            if (month === 2 && d.getDate() === 1) recharge = 1200;
            if (month === 3 && d.getDate() === 1) recharge = 2000;
            if (month === 3 && d.getDate() === 15) recharge = 2000;
            if (month === 4 && d.getDate() === 25) recharge = 4000; // Big amount late in the month
            if (month === 5 && d.getDate() === 5) recharge = 1000;

            data.push({ date: new Date(d), units: parseFloat(units.toFixed(2)), recharge });
            d.setDate(d.getDate() + 1);
        }
        this.rawLogs = data;
        this.processHistory(0);
    }

    // Calculate average use of the last 7 days
    getAverageDailyUse() {
        if (this.rawLogs.length < 7) return 5;
        let sum = 0;
        for (let i = this.rawLogs.length - 7; i < this.rawLogs.length; i++) {
            sum += this.rawLogs[i].units;
        }
        return sum / 7;
    }

    // Predict run-out date
    predictRunOutDate(avgUse) {
        let simBalance = this.currentBalance;
        let simSlab = this.currentMonthUnits;
        let simDate = new Date(this.lastDate);
        let currentMonth = simDate.getMonth();
        let daysAdded = 0;

        while (simBalance > 0 && daysAdded < 365) {
            simDate.setDate(simDate.getDate() + 1);
            daysAdded++;
            
            if (simDate.getMonth() !== currentMonth) {
                simSlab = 0;
                currentMonth = simDate.getMonth();
            }

            let { cost, endSlabUnits } = this.calculateEnergyCost(simSlab, avgUse);
            let vat = cost * this.vatRate;
            simBalance -= (cost + vat);
            simSlab = endSlabUnits;
        }
        return simDate;
    }

    // Calculate amount required to last until targetDate
    calculateRequiredRecharge(targetDate, avgUse) {
        let simDate = new Date(this.lastDate);
        let endTarget = new Date(targetDate);
        if (endTarget <= simDate) return null; // Date must be in future

        let simSlab = this.currentMonthUnits;
        let currentMonth = simDate.getMonth();
        
        let totalEnergy = 0, totalPenalty = 0;
        let totalFixed = 0;
        
        // If we recharge TODAY, we incur this month's fixed charge if not paid yet.
        // According to strict prompt: fixed charges apply on FIRST RECHARGE of a month.
        // Since this calculation represents ONE recharge done today, we only incur today's fixed charge.
        // Future months passed without recharges won't trigger the real meter's fixed charge in this strict logic.
        if (!this.paidFixedThisMonth) {
            totalFixed += (this.demandCharge + this.meterRent);
        }

        while (simDate < endTarget) {
            simDate.setDate(simDate.getDate() + 1);
            
            if (simDate.getMonth() !== currentMonth) {
                simSlab = 0;
                currentMonth = simDate.getMonth();
            }

            let { cost, penalty, endSlabUnits } = this.calculateEnergyCost(simSlab, avgUse);
            totalEnergy += cost;
            totalPenalty += penalty;
            simSlab = endSlabUnits;
        }

        let totalVat = totalEnergy * this.vatRate;
        let totalConsumedMoney = totalEnergy + totalVat + totalFixed;
        let shortfall = totalConsumedMoney - this.currentBalance;

        return {
            amountNeeded: Math.max(0, shortfall),
            breakdown: {
                energy: totalEnergy,
                penalty: totalPenalty,
                vat: totalVat,
                fixed: totalFixed
            }
        };
    }

    // Compare two habits over identical consumption (3 months)
    // Start Date: July 1. End Date: Sept 30. Daily Units: 4.
    compareHabits() {
        let dailyUnits = 4; // Low consumption ensures Habit A survives long enough to skip a month
        let startDate = new Date(2023, 6, 1); // Jul 1
        let totalDays = 92; // Jul, Aug, Sep
        let startBalance = 200;
        let rechargeAmt = 1000;

        // Helper to run simulation
        const runSim = (isHabitA) => {
            let bal = startBalance;
            let costSum = 0;
            let monthSlab = 0;
            let curMonth = null;
            let paidFixed = false;
            let d = new Date(startDate);
            let rechargesTriggered = 0;

            for (let i = 0; i < totalDays; i++) {
                let month = d.getMonth();
                if (month !== curMonth) {
                    monthSlab = 0;
                    curMonth = month;
                    paidFixed = false;
                }

                let doRecharge = false;
                if (isHabitA) {
                    // Habit A: Low balance recharge
                    if (bal < 100) doRecharge = true;
                } else {
                    // Habit B: Start of month recharge
                    if (d.getDate() === 1) doRecharge = true;
                }

                if (doRecharge) {
                    bal += rechargeAmt;
                    rechargesTriggered++;
                    if (!paidFixed) {
                        let f = this.demandCharge + this.meterRent;
                        bal -= f;
                        costSum += f;
                        paidFixed = true;
                    }
                }

                let { cost, endSlabUnits } = this.calculateEnergyCost(monthSlab, dailyUnits);
                let vat = cost * this.vatRate;
                bal -= (cost + vat);
                costSum += (cost + vat);
                monthSlab = endSlabUnits;

                d.setDate(d.getDate() + 1);
            }
            return { cost: costSum, recharges: rechargesTriggered };
        };

        return {
            habitA: runSim(true),
            habitB: runSim(false)
        };
    }

    // Bonus: Calculate monthly breakdown
    getMonthlyBreakdown(yearMonthStr) {
        let energy = 0, vat = 0, demand = 0, rent = 0;
        for (let log of this.processedLogs) {
            let d = new Date(log.date);
            let ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
            if (ym === yearMonthStr) {
                energy += log.energyCost;
                vat += log.vat;
                if (log.fixedCharge > 0) {
                    demand += this.demandCharge;
                    rent += this.meterRent;
                }
            }
        }
        return { energy, vat, demand, rent, total: energy + vat + demand + rent };
    }
}


// ==========================================
// 2. VIEW
// ==========================================
class MeterView {
    constructor() {
        this.chartInstance = null;
        // Cache DOM elements
        this.elBalance = document.getElementById('current-balance');
        this.elMonthUnits = document.getElementById('current-month-units');
        this.elAvgUse = document.getElementById('avg-daily-use');
        this.elRunoutDate = document.getElementById('runout-date');
        this.elSlabWarning = document.getElementById('slab-warning');
        
        this.targetInput = document.getElementById('target-date-input');
        this.btnCalcTarget = document.getElementById('btn-calculate-target');
        this.targetResultBox = document.getElementById('target-result-box');
        
        this.billMonthSelect = document.getElementById('bill-month-select');
        this.billBreakdownBox = document.getElementById('bill-breakdown-box');

        this.habitACost = document.getElementById('habit-a-cost');
        this.habitBCost = document.getElementById('habit-b-cost');
        this.habitConclusion = document.getElementById('habit-conclusion');

        this.customDataInput = document.getElementById('custom-data-input');
        this.btnLoadCustom = document.getElementById('btn-load-custom');
    }

    updateDashboard(model, avgUse) {
        this.elBalance.innerText = model.currentBalance.toFixed(2) + ' ৳';
        this.elMonthUnits.innerText = model.currentMonthUnits.toFixed(1);
        this.elAvgUse.innerText = avgUse.toFixed(1);

        // Slab warning logic
        let s = model.currentMonthUnits;
        let threshold = model.slabs.find(slab => s < slab.limit && (slab.limit - s) <= 20);
        if (threshold) {
            let nextSlabRate = model.slabs[model.slabs.indexOf(threshold) + 1].rate;
            this.elSlabWarning.innerHTML = `<i class="fas fa-exclamation-triangle"></i> <b>Slab Warning:</b> You are at ${s.toFixed(1)} units. Crossing ${threshold.limit} units will increase your rate to <b>${nextSlabRate} ৳/unit</b>.`;
            this.elSlabWarning.className = "mt-4 p-3 rounded-md text-sm bg-yellow-100 text-yellow-800 block";
        } else {
            this.elSlabWarning.className = "hidden";
        }
    }

    updateRunoutPrediction(date) {
        this.elRunoutDate.innerText = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    renderChart(processedLogs) {
        const ctx = document.getElementById('balanceChart').getContext('2d');
        
        const labels = processedLogs.map(l => {
            let d = new Date(l.date);
            return `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
        });
        const balances = processedLogs.map(l => l.balance);
        
        // Identify recharge points for chart highlighting
        const rechargePoints = processedLogs.map(l => l.recharge > 0 ? l.balance : null);

        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        this.chartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Meter Balance (৳)',
                        data: balances,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        pointRadius: 0,
                        tension: 0.1
                    },
                    {
                        label: 'Recharge Event',
                        data: rechargePoints,
                        backgroundColor: '#10b981',
                        borderColor: '#059669',
                        pointRadius: 5,
                        pointHoverRadius: 8,
                        showLine: false // Only show dots
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Balance (৳)' } },
                    x: { ticks: { maxTicksLimit: 15 } }
                }
            }
        });
    }

    showTargetResult(result) {
        this.targetResultBox.classList.remove('hidden');
        document.getElementById('target-total').innerText = result.amountNeeded.toFixed(2) + ' ৳';
        document.getElementById('target-energy').innerText = result.breakdown.energy.toFixed(2) + ' ৳';
        document.getElementById('target-penalty').innerText = result.breakdown.penalty.toFixed(2) + ' ৳';
        document.getElementById('target-vat').innerText = result.breakdown.vat.toFixed(2) + ' ৳';
        document.getElementById('target-fixed').innerText = result.breakdown.fixed.toFixed(2) + ' ৳';
    }

    populateBillMonths(logs) {
        const months = new Set();
        logs.forEach(l => {
            let d = new Date(l.date);
            months.add(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
        });
        
        this.billMonthSelect.innerHTML = '<option value="">Select a month...</option>';
        Array.from(months).sort().forEach(ym => {
            let opt = document.createElement('option');
            opt.value = ym;
            let [y, m] = ym.split('-');
            let date = new Date(y, parseInt(m)-1, 1);
            opt.innerText = date.toLocaleString('default', { month: 'long', year: 'numeric' });
            this.billMonthSelect.appendChild(opt);
        });
    }

    showBillBreakdown(bd) {
        if(bd.total === 0) {
            this.billBreakdownBox.classList.add('hidden');
            return;
        }
        this.billBreakdownBox.classList.remove('hidden');
        document.getElementById('bill-total').innerText = bd.total.toFixed(2) + ' ৳';
        document.getElementById('bill-energy').innerText = bd.energy.toFixed(2) + ' ৳';
        document.getElementById('bill-vat').innerText = bd.vat.toFixed(2) + ' ৳';
        document.getElementById('bill-demand').innerText = bd.demand.toFixed(2) + ' ৳';
        document.getElementById('bill-rent').innerText = bd.rent.toFixed(2) + ' ৳';
    }

    renderHabitComparison(res) {
        this.habitACost.innerText = res.habitA.cost.toFixed(2) + ' ৳';
        this.habitBCost.innerText = res.habitB.cost.toFixed(2) + ' ৳';
        
        let diff = Math.abs(res.habitA.cost - res.habitB.cost);
        if (diff < 1) {
            this.habitConclusion.innerHTML = `<i class="fas fa-info-circle text-blue-400 mr-2"></i> Costs are identical. Since both habits recharged every month, the fixed charges applied equally.`;
        } else if (res.habitA.cost < res.habitB.cost) {
            this.habitConclusion.innerHTML = `<i class="fas fa-check-circle text-green-400 mr-2"></i> <b>Habit A was cheaper by ${diff.toFixed(2)} ৳.</b><br>Why? Because Habit A's low consumption meant the balance lasted over a month without recharging, causing it to completely skip the meter's monthly fixed charge for that skipped calendar month.`;
        }
    }

    bindCalculateTarget(handler) {
        this.btnCalcTarget.addEventListener('click', () => {
            handler(this.targetInput.value);
        });
    }

    bindBillSelect(handler) {
        this.billMonthSelect.addEventListener('change', (e) => {
            handler(e.target.value);
        });
    }

    bindLoadCustom(handler) {
        this.btnLoadCustom.addEventListener('click', () => {
            handler(this.customDataInput.value);
        });
    }
}


// ==========================================
// 3. CONTROLLER
// ==========================================
class MeterController {
    constructor(model, view) {
        this.model = model;
        this.view = view;

        // Init system
        this.model.generateMockData();
        this.refreshUI();

        // Bind events
        this.view.bindCalculateTarget(this.handleTargetCalc.bind(this));
        this.view.bindBillSelect(this.handleBillSelect.bind(this));
        this.view.bindLoadCustom(this.handleCustomData.bind(this));
        
        // Set default target date to 1 month from now
        let nextMonth = new Date(this.model.lastDate);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        this.view.targetInput.value = nextMonth.toISOString().split('T')[0];
    }

    refreshUI() {
        let avgUse = this.model.getAverageDailyUse();
        this.view.updateDashboard(this.model, avgUse);
        this.view.renderChart(this.model.processedLogs);
        
        let runoutDate = this.model.predictRunOutDate(avgUse);
        this.view.updateRunoutPrediction(runoutDate);

        this.view.populateBillMonths(this.model.processedLogs);

        let compRes = this.model.compareHabits();
        this.view.renderHabitComparison(compRes);
    }

    handleTargetCalc(dateStr) {
        if(!dateStr) return alert('Please select a date.');
        let avgUse = this.model.getAverageDailyUse();
        let result = this.model.calculateRequiredRecharge(dateStr, avgUse);
        if (!result) return alert('Target date must be in the future (after ' + this.model.lastDate.toDateString() + ').');
        this.view.showTargetResult(result);
    }

    handleBillSelect(ym) {
        if(!ym) {
            this.view.billBreakdownBox.classList.add('hidden');
            return;
        }
        let bd = this.model.getMonthlyBreakdown(ym);
        this.view.showBillBreakdown(bd);
    }

    handleCustomData(csvStr) {
        if(!csvStr.trim()) return;
        try {
            let lines = csvStr.trim().split('\n');
            let newLogs = lines.map(line => {
                let parts = line.split(',');
                return {
                    date: new Date(parts[0].trim()),
                    units: parseFloat(parts[1].trim()),
                    recharge: parseFloat(parts[2] ? parts[2].trim() : 0)
                };
            });
            
            // Sort chronologically
            newLogs.sort((a,b) => a.date - b.date);
            this.model.rawLogs = newLogs;
            this.model.processHistory(0);
            this.refreshUI();
            alert('Custom data loaded and simulated successfully!');
        } catch(e) {
            alert('Error parsing custom data. Ensure format is: YYYY-MM-DD, units, rechargeAmount');
        }
    }
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    const app = new MeterController(new MeterModel(), new MeterView());
});