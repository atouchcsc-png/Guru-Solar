import React, { useMemo, useState } from 'react';
import {
  BatteryCharging,
  Calculator,
  Check,
  Copy,
  Plus,
  Save,
  Sun,
  Trash2,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import { DEFAULT_APPLIANCES } from '../data/initialData';
import { ApplianceItem, SavedCalculation, SolarSystemType } from '../types/solar';
import { formatCurrency } from '../utils/format';

interface SolarCalculatorViewProps {
  savedCalculations: SavedCalculation[];
  onSaveCalculation: (calc: SavedCalculation) => void;
  onDeleteCalculation: (id: string) => void;
  onCreateCustomerFromCalc: (preset: {
    systemType: SolarSystemType;
    systemKw: number;
    panelSpec: string;
    inverterSpec: string;
    batterySpec: string;
    totalAmount: number;
    notes: string;
  }) => void;
}

type CalcTab = 'sizing' | 'load' | 'battery' | 'roi';

export const SolarCalculatorView: React.FC<SolarCalculatorViewProps> = ({
  savedCalculations,
  onSaveCalculation,
  onDeleteCalculation,
  onCreateCustomerFromCalc,
}) => {
  const [activeTab, setActiveTab] = useState<CalcTab>('sizing');
  const [copied, setCopied] = useState(false);
  const [quoteLabel, setQuoteLabel] = useState('');

  // Tab 1: System Sizing & Bill Offset state
  const [inputMode, setInputMode] = useState<'bill' | 'units'>('bill');
  const [monthlyBill, setMonthlyBill] = useState(4500);
  const [monthlyUnitsInput, setMonthlyUnitsInput] = useState(500);
  const [tariffPerUnit, setTariffPerUnit] = useState(8.5);
  const [peakSunHours, setPeakSunHours] = useState(4.8);
  const [performanceRatio, setPerformanceRatio] = useState(0.8);
  const [offsetPercent, setOffsetPercent] = useState(100);
  const [panelWattage, setPanelWattage] = useState(540);
  const [systemType, setSystemType] = useState<SolarSystemType>('On-Grid');
  const [costPerKw, setCostPerKw] = useState(56000);
  const [subsidyAmount, setSubsidyAmount] = useState(78000);

  // Tab 2: Appliance Load Builder state
  const [appliances, setAppliances] = useState<ApplianceItem[]>(DEFAULT_APPLIANCES);
  const [newAppName, setNewAppName] = useState('');
  const [newAppWatts, setNewAppWatts] = useState(100);
  const [newAppQty, setNewAppQty] = useState(1);
  const [newAppHours, setNewAppHours] = useState(4);

  // Tab 3: Battery & Inverter Sizing state
  const [dailyLoadKwh, setDailyLoadKwh] = useState(8.5);
  const [autonomyDays, setAutonomyDays] = useState(1);
  const [systemVoltage, setSystemVoltage] = useState<12 | 24 | 48 | 96>(48);
  const [batteryChemistry, setBatteryChemistry] = useState<'tubular' | 'lithium'>('lithium');
  const [inverterEfficiency, setInverterEfficiency] = useState(90);
  const [singleBatteryAh, setSingleBatteryAh] = useState(150);
  const [peakLoadWatts, setPeakLoadWatts] = useState(2600);

  // Tab 4: ROI & Financial state
  const [tariffEscalation, setTariffEscalation] = useState(5);
  const [annualDegradation, setAnnualDegradation] = useState(0.5);
  const [annualMaintenance, setAnnualMaintenance] = useState(2500);

  // Computed: Sizing & Bill Offset
  const sizing = useMemo(() => {
    const safeTariff = Math.max(0.5, tariffPerUnit);
    const monthlyUnits =
      inputMode === 'bill' ? monthlyBill / safeTariff : monthlyUnitsInput;
    const targetMonthlyUnits = monthlyUnits * (offsetPercent / 100);
    const dailyUnitsNeeded = targetMonthlyUnits / 30;
    const effectiveDailyYieldPerKw = Math.max(1, peakSunHours * performanceRatio);
    const rawKw = dailyUnitsNeeded / effectiveDailyYieldPerKw;
    const recommendedKw = Math.max(1, Math.ceil(rawKw * 2) / 2); // nearest 0.5 kW
    const panelCount = Math.max(1, Math.ceil((recommendedKw * 1000) / panelWattage));
    const actualDcKw = (panelCount * panelWattage) / 1000;
    const inverterKva = Math.max(1, Math.ceil(recommendedKw * 1.15 * 2) / 2);
    const roofAreaSqFt = Math.round(actualDcKw * 95);
    const monthlyGenUnits = Math.round(actualDcKw * effectiveDailyYieldPerKw * 30);
    const annualGenUnits = monthlyGenUnits * 12;
    const grossCost = Math.round(actualDcKw * costPerKw);
    const appliedSubsidy = systemType === 'On-Grid' || systemType === 'Hybrid' ? Math.min(grossCost * 0.6, subsidyAmount) : 0;
    const netCost = Math.max(0, grossCost - appliedSubsidy);
    const annualSavings = Math.round(annualGenUnits * safeTariff);
    const monthlySavings = Math.round(annualSavings / 12);
    const paybackYears = annualSavings > 0 ? netCost / annualSavings : 0;
    const co2TonnesPerYear = (annualGenUnits * 0.82) / 1000;

    return {
      monthlyUnits: Math.round(monthlyUnits),
      dailyUnitsNeeded,
      recommendedKw,
      actualDcKw,
      panelCount,
      inverterKva,
      roofAreaSqFt,
      monthlyGenUnits,
      annualGenUnits,
      grossCost,
      appliedSubsidy,
      netCost,
      annualSavings,
      monthlySavings,
      paybackYears,
      co2TonnesPerYear,
    };
  }, [
    inputMode,
    monthlyBill,
    monthlyUnitsInput,
    tariffPerUnit,
    offsetPercent,
    peakSunHours,
    performanceRatio,
    panelWattage,
    costPerKw,
    subsidyAmount,
    systemType,
  ]);

  // Computed: Appliance Load Builder
  const loadSummary = useMemo(() => {
    let totalWatts = 0;
    let surgeWatts = 0;
    let dailyWh = 0;

    for (const item of appliances) {
      const itemPower = item.watts * item.quantity;
      totalWatts += itemPower;
      surgeWatts += item.isInductive ? itemPower * 2 : itemPower;
      dailyWh += itemPower * item.hoursPerDay;
    }

    const dailyKwh = dailyWh / 1000;
    const monthlyKwh = dailyKwh * 30;
    const recommendedInverterKva = Math.max(1, Math.ceil((totalWatts / 0.8 / 1000) * 1.25 * 2) / 2);
    const recommendedSolarKw = Math.max(1, Math.ceil((dailyKwh / (peakSunHours * performanceRatio)) * 2) / 2);
    const requiredBatteryKwh = (dailyKwh * 0.6) / 0.8;

    return {
      totalWatts,
      surgeWatts,
      dailyKwh,
      monthlyKwh,
      recommendedInverterKva,
      recommendedSolarKw,
      requiredBatteryKwh,
    };
  }, [appliances, peakSunHours, performanceRatio]);

  // Computed: Battery & Inverter Sizing
  const batteryCalc = useMemo(() => {
    const dod = batteryChemistry === 'lithium' ? 0.85 : 0.5;
    const eff = Math.max(0.5, inverterEfficiency / 100);
    const requiredStorageKwh = (dailyLoadKwh * autonomyDays) / (dod * eff);
    const requiredAh = Math.ceil((requiredStorageKwh * 1000) / systemVoltage);
    const batteriesInSeries = systemVoltage / 12;
    const parallelStrings = Math.max(1, Math.ceil(requiredAh / singleBatteryAh));
    const total12vBatteries = batteriesInSeries * parallelStrings;
    const recommendedInverterKva = Math.max(1, Math.ceil((peakLoadWatts / 0.8 / 1000) * 1.25 * 2) / 2);
    const suggestedArrayKw = Math.max(1, Math.ceil((dailyLoadKwh / (peakSunHours * 0.78)) * 2) / 2);
    const mpptAmps = Math.ceil(((suggestedArrayKw * 1000) / systemVoltage) * 1.25);
    const dcWireMm2 = mpptAmps > 80 ? 25 : mpptAmps > 50 ? 16 : mpptAmps > 30 ? 10 : 6;

    return {
      dod,
      requiredStorageKwh,
      requiredAh,
      batteriesInSeries,
      parallelStrings,
      total12vBatteries,
      recommendedInverterKva,
      suggestedArrayKw,
      mpptAmps,
      dcWireMm2,
    };
  }, [
    dailyLoadKwh,
    autonomyDays,
    systemVoltage,
    batteryChemistry,
    inverterEfficiency,
    singleBatteryAh,
    peakLoadWatts,
    peakSunHours,
  ]);

  // Computed: 10-Year & 25-Year ROI Projection
  const roiProjection = useMemo(() => {
    const years: Array<{ year: number; annualNet: number; cumulative: number }> = [];
    let cumulative = -sizing.netCost;
    let total25Savings = 0;

    for (let yr = 1; yr <= 25; yr += 1) {
      const genFactor = Math.pow(1 - annualDegradation / 100, yr - 1);
      const tariffFactor = Math.pow(1 + tariffEscalation / 100, yr - 1);
      const grossYearSavings = sizing.annualGenUnits * genFactor * (tariffPerUnit * tariffFactor);
      const annualNet = Math.round(grossYearSavings - annualMaintenance);
      total25Savings += annualNet;
      cumulative += annualNet;
      if (yr <= 10) {
        years.push({ year: yr, annualNet, cumulative: Math.round(cumulative) });
      }
    }

    const net25Profit = total25Savings - sizing.netCost;
    const maxAbsCumulative = Math.max(
      1,
      ...years.map((y) => Math.abs(y.cumulative)),
      sizing.netCost
    );

    return {
      years,
      total25Savings: Math.round(total25Savings),
      net25Profit: Math.round(net25Profit),
      maxAbsCumulative,
    };
  }, [sizing, tariffEscalation, annualDegradation, annualMaintenance, tariffPerUnit]);

  const handleAddAppliance = () => {
    if (!newAppName.trim()) return;
    setAppliances((prev) => [
      ...prev,
      {
        id: `app-${Date.now()}`,
        name: newAppName.trim(),
        watts: Math.max(1, newAppWatts),
        quantity: Math.max(1, newAppQty),
        hoursPerDay: Math.max(0.5, newAppHours),
      },
    ]);
    setNewAppName('');
  };

  const handleApplyLoadToSizing = () => {
    setInputMode('units');
    setMonthlyUnitsInput(Math.round(loadSummary.monthlyKwh));
    setDailyLoadKwh(Number(loadSummary.dailyKwh.toFixed(1)));
    setPeakLoadWatts(Math.round(loadSummary.totalWatts));
    setActiveTab('sizing');
  };

  const handleSaveCurrentQuote = () => {
    const label =
      quoteLabel.trim() ||
      `${sizing.actualDcKw.toFixed(1)} kW ${systemType} (${sizing.monthlyUnits} units/mo)`;
    onSaveCalculation({
      id: `calc-${Date.now()}`,
      createdAt: new Date().toISOString(),
      label,
      systemType,
      recommendedKw: Number(sizing.actualDcKw.toFixed(2)),
      monthlyUnits: sizing.monthlyUnits,
      estimatedCost: sizing.netCost,
      panelCount: sizing.panelCount,
      panelWattage,
      paybackYears: Number(sizing.paybackYears.toFixed(1)),
    });
    setQuoteLabel('');
  };

  const handleCopySummary = async () => {
    const text = [
      `Guru Solar — System Proposal Summary`,
      `System Type: ${systemType}`,
      `Recommended Plant Size: ${sizing.actualDcKw.toFixed(2)} kW (${sizing.panelCount} × ${panelWattage}W Panels)`,
      `Inverter Size: ${sizing.inverterKva} kVA / kW`,
      `Required Roof Area: ~${sizing.roofAreaSqFt} sq ft`,
      `Estimated Generation: ${sizing.monthlyGenUnits} units/month (${sizing.annualGenUnits} units/year)`,
      `Gross Cost: ${formatCurrency(sizing.grossCost)} | Subsidy: ${formatCurrency(sizing.appliedSubsidy)} | Net Cost: ${formatCurrency(sizing.netCost)}`,
      `Estimated Savings: ${formatCurrency(sizing.monthlySavings)}/month (Payback: ${sizing.paybackYears.toFixed(1)} yrs)`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API fallback ignored safely
    }
  };

  const handleCreateCustomer = () => {
    onCreateCustomerFromCalc({
      systemType,
      systemKw: Number(sizing.actualDcKw.toFixed(1)),
      panelSpec: `${sizing.panelCount} × ${panelWattage}W Mono PERC`,
      inverterSpec: `${sizing.inverterKva} kVA ${systemType} Inverter`,
      batterySpec:
        systemType === 'On-Grid'
          ? 'Grid-Tied (Net Metered)'
          : `${batteryCalc.total12vBatteries} × ${singleBatteryAh}Ah (${systemVoltage}V ${batteryChemistry === 'lithium' ? 'LiFePO4' : 'Tubular'})`,
      totalAmount: sizing.netCost,
      notes: `Generated from Solar Calculator: ${sizing.monthlyUnits} units/month consumption, est. generation ${sizing.monthlyGenUnits} units/month, payback ${sizing.paybackYears.toFixed(1)} years.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Mode Segmented Control */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">Engineering & Proposal Tools</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Solar System Calculator
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Calculate rooftop array capacity, appliance loads, battery bank sizing, and financial payback.
          </p>
        </div>

        <div className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-slate-200/70 p-1">
          {(
            [
              { id: 'sizing', label: 'System Sizing', icon: Sun },
              { id: 'load', label: 'Appliance Load', icon: Calculator },
              { id: 'battery', label: 'Battery & Inverter', icon: BatteryCharging },
              { id: 'roi', label: 'ROI & Payback', icon: TrendingUp },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: SYSTEM SIZING & BILL OFFSET */}
      {activeTab === 'sizing' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* Left Inputs */}
          <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <h2 className="text-base font-semibold text-slate-900">Site & Consumption Inputs</h2>
              <div className="inline-flex rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setInputMode('bill')}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                    inputMode === 'bill' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  By Monthly Bill
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('units')}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                    inputMode === 'units' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  By Monthly Units (kWh)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {inputMode === 'bill' ? (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Average Monthly Electricity Bill (₹)
                  </label>
                  <input
                    type="number"
                    min={100}
                    step={100}
                    value={monthlyBill}
                    onChange={(e) => setMonthlyBill(Number(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-amber-600 focus:outline-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Monthly Electricity Usage (Units / kWh)
                  </label>
                  <input
                    type="number"
                    min={10}
                    step={10}
                    value={monthlyUnitsInput}
                    onChange={(e) => setMonthlyUnitsInput(Number(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-amber-600 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Electricity Tariff (₹ / Unit)
                </label>
                <input
                  type="number"
                  min={1}
                  step={0.25}
                  value={tariffPerUnit}
                  onChange={(e) => setTariffPerUnit(Number(e.target.value) || 1)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-amber-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Solar System Type
                </label>
                <select
                  value={systemType}
                  onChange={(e) => setSystemType(e.target.value as SolarSystemType)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-amber-600 focus:outline-none"
                >
                  <option value="On-Grid">On-Grid (Net Metered)</option>
                  <option value="Hybrid">Hybrid (Grid + Battery Backup)</option>
                  <option value="Off-Grid">Off-Grid (Standalone Battery)</option>
                  <option value="Solar Pump">Solar Pump System</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Panel Wattage Rating (Wp)
                </label>
                <select
                  value={panelWattage}
                  onChange={(e) => setPanelWattage(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-amber-600 focus:outline-none"
                >
                  <option value={335}>335 W Poly/Mono</option>
                  <option value={450}>450 W Mono PERC</option>
                  <option value={540}>540 W Mono PERC Half-Cut</option>
                  <option value={550}>550 W Bifacial Mono</option>
                  <option value={580}>580 W N-Type TOPCon</option>
                  <option value={650}>650 W Commercial Bifacial</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-700">
                    Peak Sun Hours (hrs/day)
                  </label>
                  <span className="font-mono text-xs font-semibold text-amber-700 tabular-nums">
                    {peakSunHours.toFixed(1)} h
                  </span>
                </div>
                <input
                  type="range"
                  min={3.0}
                  max={6.5}
                  step={0.1}
                  value={peakSunHours}
                  onChange={(e) => setPeakSunHours(Number(e.target.value))}
                  className="w-full accent-amber-600"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-700">
                    Bill Offset Target
                  </label>
                  <span className="font-mono text-xs font-semibold text-amber-700 tabular-nums">
                    {offsetPercent}%
                  </span>
                </div>
                <input
                  type="range"
                  min={25}
                  max={120}
                  step={5}
                  value={offsetPercent}
                  onChange={(e) => setOffsetPercent(Number(e.target.value))}
                  className="w-full accent-amber-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  System Efficiency / PR (0.65 – 0.90)
                </label>
                <input
                  type="number"
                  min={0.65}
                  max={0.9}
                  step={0.01}
                  value={performanceRatio}
                  onChange={(e) => setPerformanceRatio(Number(e.target.value) || 0.8)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-amber-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Installed Cost per kW (₹)
                </label>
                <input
                  type="number"
                  min={15000}
                  step={1000}
                  value={costPerKw}
                  onChange={(e) => setCostPerKw(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-amber-600 focus:outline-none"
                />
              </div>

              {(systemType === 'On-Grid' || systemType === 'Hybrid') && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Applicable Government Subsidy (₹) — e.g. PM Surya Ghar up to ₹78,000
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={1000}
                    value={subsidyAmount}
                    onChange={(e) => setSubsidyAmount(Number(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:border-amber-600 focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Output Spec Sheet */}
          <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-900 px-6 py-5 text-white">
              <p className="text-xs text-slate-300">Recommended Solar Capacity</p>
              <div className="mt-1 flex items-baseline gap-3">
                <span className="font-mono text-4xl font-bold tracking-tight tabular-nums text-amber-400">
                  {sizing.actualDcKw.toFixed(2)} kW
                </span>
                <span className="text-xs text-slate-300">
                  {systemType} · {sizing.panelCount} panels
                </span>
              </div>
            </div>

            <div className="divide-y divide-slate-200 px-6">
              <div className="flex items-center justify-between py-3.5 text-sm">
                <span className="text-slate-600">Solar Modules</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {sizing.panelCount} × {panelWattage}W
                </span>
              </div>
              <div className="flex items-center justify-between py-3.5 text-sm">
                <span className="text-slate-600">Inverter Size</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {sizing.inverterKva} kVA / kW
                </span>
              </div>
              <div className="flex items-center justify-between py-3.5 text-sm">
                <span className="text-slate-600">Shadow-Free Roof Area</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  ~{sizing.roofAreaSqFt} sq ft
                </span>
              </div>
              <div className="flex items-center justify-between py-3.5 text-sm">
                <span className="text-slate-600">Monthly Generation</span>
                <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                  {sizing.monthlyGenUnits} units/mo
                </span>
              </div>
              <div className="flex items-center justify-between py-3.5 text-sm">
                <span className="text-slate-600">Estimated Monthly Savings</span>
                <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                  {formatCurrency(sizing.monthlySavings)}
                </span>
              </div>
              <div className="flex items-center justify-between py-3.5 text-sm">
                <span className="text-slate-600">Net Project Cost (After Subsidy)</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {formatCurrency(sizing.netCost)}
                </span>
              </div>
              <div className="flex items-center justify-between py-3.5 text-sm">
                <span className="text-slate-600">Payback & CO₂ Offset</span>
                <span className="font-mono font-semibold text-amber-700 tabular-nums">
                  {sizing.paybackYears.toFixed(1)} yrs · {sizing.co2TonnesPerYear.toFixed(1)} t/yr
                </span>
              </div>
            </div>

            <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Optional estimate label (e.g. Mr. Sen 4kW)"
                  value={quoteLabel}
                  onChange={(e) => setQuoteLabel(e.target.value)}
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-amber-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveCurrentQuote}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
                >
                  <Save className="h-3.5 w-3.5" aria-hidden="true" />
                  Save
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCreateCustomer}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
                >
                  <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
                  Save as Customer Quote
                </button>
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied' : 'Copy Quote'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: APPLIANCE LOAD BUILDER */}
      {activeTab === 'load' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Home & Commercial Load Table</h2>
                <p className="text-xs text-slate-500">
                  Adjust appliance wattage, quantities, and daily running hours.
                </p>
              </div>
              <button
                type="button"
                onClick={handleApplyLoadToSizing}
                className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-medium text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
              >
                Use in Solar Sizing
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
                    <th className="py-3 pl-6 pr-3">Appliance</th>
                    <th className="py-3 px-3 text-right">Watts</th>
                    <th className="py-3 px-3 text-right">Qty</th>
                    <th className="py-3 px-3 text-right">Hrs/Day</th>
                    <th className="py-3 px-3 text-right">Daily kWh</th>
                    <th className="py-3 pl-2 pr-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {appliances.map((item) => {
                    const kwh = (item.watts * item.quantity * item.hoursPerDay) / 1000;
                    return (
                      <tr key={item.id}>
                        <td className="py-2.5 pl-6 pr-3 font-medium text-slate-900">
                          {item.name}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            min={1}
                            value={item.watts}
                            onChange={(e) =>
                              setAppliances((prev) =>
                                prev.map((a) =>
                                  a.id === item.id ? { ...a, watts: Number(e.target.value) || 0 } : a
                                )
                              )
                            }
                            className="w-20 rounded border border-slate-200 px-2 py-1 text-right font-mono text-xs tabular-nums"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            min={0}
                            value={item.quantity}
                            onChange={(e) =>
                              setAppliances((prev) =>
                                prev.map((a) =>
                                  a.id === item.id ? { ...a, quantity: Number(e.target.value) || 0 } : a
                                )
                              )
                            }
                            className="w-16 rounded border border-slate-200 px-2 py-1 text-right font-mono text-xs tabular-nums"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            min={0}
                            max={24}
                            step={0.5}
                            value={item.hoursPerDay}
                            onChange={(e) =>
                              setAppliances((prev) =>
                                prev.map((a) =>
                                  a.id === item.id
                                    ? { ...a, hoursPerDay: Number(e.target.value) || 0 }
                                    : a
                                )
                              )
                            }
                            className="w-16 rounded border border-slate-200 px-2 py-1 text-right font-mono text-xs tabular-nums"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                          {kwh.toFixed(2)}
                        </td>
                        <td className="py-2.5 pl-2 pr-6 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setAppliances((prev) => prev.filter((a) => a.id !== item.id))
                            }
                            aria-label={`Remove ${item.name}`}
                            className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Add Custom Appliance Row */}
            <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
                <input
                  type="text"
                  placeholder="Add appliance (e.g. Submersible Pump)"
                  value={newAppName}
                  onChange={(e) => setNewAppName(e.target.value)}
                  className="sm:col-span-5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-amber-600 focus:outline-none"
                />
                <input
                  type="number"
                  placeholder="Watts"
                  value={newAppWatts}
                  onChange={(e) => setNewAppWatts(Number(e.target.value) || 0)}
                  className="sm:col-span-2 rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs tabular-nums"
                />
                <input
                  type="number"
                  placeholder="Qty"
                  value={newAppQty}
                  onChange={(e) => setNewAppQty(Number(e.target.value) || 1)}
                  className="sm:col-span-1 rounded-lg border border-slate-300 bg-white px-2 py-2 font-mono text-xs tabular-nums"
                />
                <input
                  type="number"
                  placeholder="Hrs"
                  step={0.5}
                  value={newAppHours}
                  onChange={(e) => setNewAppHours(Number(e.target.value) || 1)}
                  className="sm:col-span-2 rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs tabular-nums"
                />
                <button
                  type="button"
                  onClick={handleAddAppliance}
                  className="sm:col-span-2 inline-flex items-center justify-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 whitespace-nowrap"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Load Summary Panel */}
          <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-900">Calculated Load Profile</h2>
            <div className="divide-y divide-slate-200">
              <div className="flex justify-between py-3 text-sm">
                <span className="text-slate-600">Connected Running Load</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {loadSummary.totalWatts.toLocaleString()} W ({(loadSummary.totalWatts / 1000).toFixed(2)} kW)
                </span>
              </div>
              <div className="flex justify-between py-3 text-sm">
                <span className="text-slate-600">Peak Motor Surge Load</span>
                <span className="font-mono font-semibold text-amber-700 tabular-nums">
                  {loadSummary.surgeWatts.toLocaleString()} W
                </span>
              </div>
              <div className="flex justify-between py-3 text-sm">
                <span className="text-slate-600">Daily Energy (Units/Day)</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {loadSummary.dailyKwh.toFixed(2)} kWh
                </span>
              </div>
              <div className="flex justify-between py-3 text-sm">
                <span className="text-slate-600">Monthly Consumption</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {Math.round(loadSummary.monthlyKwh)} Units
                </span>
              </div>
              <div className="flex justify-between py-3 text-sm">
                <span className="text-slate-600">Recommended Inverter</span>
                <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                  {loadSummary.recommendedInverterKva} kVA
                </span>
              </div>
              <div className="flex justify-between py-3 text-sm">
                <span className="text-slate-600">Suggested Solar Array</span>
                <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                  {loadSummary.recommendedSolarKw} kW
                </span>
              </div>
              <div className="flex justify-between py-3 text-sm">
                <span className="text-slate-600">Night Battery Storage</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {loadSummary.requiredBatteryKwh.toFixed(1)} kWh
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BATTERY & INVERTER SIZING */}
      {activeTab === 'battery' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          <div className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-6 space-y-5">
            <h2 className="text-base font-semibold text-slate-900 border-b border-slate-200 pb-3">
              Off-Grid & Hybrid Storage Parameters
            </h2>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Daily Backup Energy Needed (kWh / Units)
                </label>
                <input
                  type="number"
                  min={0.5}
                  step={0.5}
                  value={dailyLoadKwh}
                  onChange={(e) => setDailyLoadKwh(Number(e.target.value) || 0.5)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Peak Simultaneous Load (Watts)
                </label>
                <input
                  type="number"
                  min={100}
                  step={100}
                  value={peakLoadWatts}
                  onChange={(e) => setPeakLoadWatts(Number(e.target.value) || 100)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Days of Autonomy (Cloudy Backup)
                </label>
                <input
                  type="number"
                  min={0.5}
                  max={5}
                  step={0.5}
                  value={autonomyDays}
                  onChange={(e) => setAutonomyDays(Number(e.target.value) || 1)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  DC Battery Bank Voltage
                </label>
                <select
                  value={systemVoltage}
                  onChange={(e) => setSystemVoltage(Number(e.target.value) as 12 | 24 | 48 | 96)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm tabular-nums"
                >
                  <option value={12}>12 V (Small Home)</option>
                  <option value={24}>24 V (1 – 2.5 kVA)</option>
                  <option value={48}>48 V (3 – 5 kVA)</option>
                  <option value={96}>96 V (7.5 – 10 kVA)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Battery Chemistry
                </label>
                <select
                  value={batteryChemistry}
                  onChange={(e) => setBatteryChemistry(e.target.value as 'tubular' | 'lithium')}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="lithium">Lithium LiFePO4 (85% DoD)</option>
                  <option value="tubular">Tall Tubular Lead-Acid (50% DoD)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Single Battery Unit Rating (Ah)
                </label>
                <select
                  value={singleBatteryAh}
                  onChange={(e) => setSingleBatteryAh(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm tabular-nums"
                >
                  <option value={100}>100 Ah</option>
                  <option value={150}>150 Ah</option>
                  <option value={200}>200 Ah</option>
                  <option value={220}>220 Ah</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <div className="flex justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-700">Inverter Efficiency</label>
                  <span className="font-mono text-xs font-semibold text-amber-700 tabular-nums">
                    {inverterEfficiency}%
                  </span>
                </div>
                <input
                  type="range"
                  min={75}
                  max={96}
                  step={1}
                  value={inverterEfficiency}
                  onChange={(e) => setInverterEfficiency(Number(e.target.value))}
                  className="w-full accent-amber-600"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-white p-6 space-y-4">
            <h2 className="text-base font-semibold text-slate-900">Battery Bank & MPPT Spec</h2>
            <div className="divide-y divide-slate-200 text-sm">
              <div className="flex justify-between py-3">
                <span className="text-slate-600">Total Storage Bank</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {batteryCalc.requiredStorageKwh.toFixed(1)} kWh
                </span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-slate-600">Required Capacity @ {systemVoltage}V</span>
                <span className="font-mono font-semibold text-amber-700 tabular-nums">
                  {batteryCalc.requiredAh} Ah
                </span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-slate-600">12V Battery Configuration</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {batteryCalc.total12vBatteries} units ({batteryCalc.batteriesInSeries}S × {batteryCalc.parallelStrings}P)
                </span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-slate-600">Recommended Inverter</span>
                <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                  {batteryCalc.recommendedInverterKva} kVA ({systemVoltage}V)
                </span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-slate-600">Solar Charging Array</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {batteryCalc.suggestedArrayKw} kW
                </span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-slate-600">MPPT Charge Controller</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  ≥ {batteryCalc.mpptAmps} A @ {systemVoltage}V
                </span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-slate-600">Recommended DC Cable</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {batteryCalc.dcWireMm2} mm² Copper
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: ROI & 25-YEAR PAYBACK */}
      {activeTab === 'roi' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          <div className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-6 space-y-5">
            <h2 className="text-base font-semibold text-slate-900 border-b border-slate-200 pb-3">
              Financial Assumptions ({sizing.actualDcKw.toFixed(1)} kW)
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Annual Electricity Tariff Escalation (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={15}
                  step={0.5}
                  value={tariffEscalation}
                  onChange={(e) => setTariffEscalation(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Annual Panel Degradation (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={2}
                  step={0.1}
                  value={annualDegradation}
                  onChange={(e) => setAnnualDegradation(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Annual Maintenance / AMC Cost (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={annualMaintenance}
                  onChange={(e) => setAnnualMaintenance(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums"
                />
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4 space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Net Upfront Cost</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {formatCurrency(sizing.netCost)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">25-Year Gross Savings</span>
                <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                  {formatCurrency(roiProjection.total25Savings)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">25-Year Net Profit</span>
                <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                  {formatCurrency(roiProjection.net25Profit)}
                </span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 rounded-xl border border-slate-200 bg-white p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  10-Year Cumulative Cash Flow
                </h2>
                <p className="text-xs text-slate-500">
                  Tracks net recovery after subsidy ({formatCurrency(sizing.appliedSubsidy)}) and annual AMC.
                </p>
              </div>
              <span className="font-mono text-xs font-semibold text-amber-700 tabular-nums">
                Payback: ~{sizing.paybackYears.toFixed(1)} years
              </span>
            </div>

            <div className="space-y-3">
              {roiProjection.years.map((row) => {
                const widthPct = Math.min(
                  100,
                  Math.max(4, Math.round((Math.abs(row.cumulative) / roiProjection.maxAbsCumulative) * 100))
                );
                const positive = row.cumulative >= 0;
                return (
                  <div key={row.year} className="grid grid-cols-12 items-center gap-3 text-xs">
                    <span className="col-span-2 font-mono text-slate-600 tabular-nums">
                      Year {row.year}
                    </span>
                    <div className="col-span-7 h-5 rounded bg-slate-100 overflow-hidden flex items-center">
                      <div
                        className={`h-full rounded transition-all duration-200 ${
                          positive ? 'bg-emerald-600' : 'bg-amber-500'
                        }`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                    <span
                      className={`col-span-3 text-right font-mono font-medium tabular-nums ${
                        positive ? 'text-emerald-700' : 'text-slate-700'
                      }`}
                    >
                      {positive ? '+' : ''}
                      {formatCurrency(row.cumulative)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Saved Quotes List */}
      {savedCalculations.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Saved Solar Estimates</h2>
          </div>
          <div className="divide-y divide-slate-200">
            {savedCalculations.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-4 px-6 py-3.5 text-sm"
              >
                <div>
                  <p className="font-medium text-slate-900">{item.label}</p>
                  <p className="text-xs text-slate-500 font-mono tabular-nums">
                    {item.recommendedKw} kW · {item.systemType} · {item.panelCount} × {item.panelWattage}W · {item.monthlyUnits} units/mo
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right font-mono tabular-nums">
                    <div className="text-xs font-semibold text-slate-900">
                      {formatCurrency(item.estimatedCost)}
                    </div>
                    <div className="text-xs text-emerald-700">{item.paybackYears} yr payback</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onDeleteCalculation(item.id)}
                    aria-label={`Delete estimate ${item.label}`}
                    className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
