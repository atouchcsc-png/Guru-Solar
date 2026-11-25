import React, { useMemo, useState } from 'react';
import { ArrowLeftRight, Bolt, Gauge, Home, Sun, Zap } from 'lucide-react';

type UnitSection = 'units-kw' | 'hp-units' | 'power' | 'electrical' | 'area';

export const UnitConverterView: React.FC = () => {
  const [section, setSection] = useState<UnitSection>('units-kw');

  // 1. Units (kWh) <-> Solar kW
  const [unitsMode, setUnitsMode] = useState<'units-to-kw' | 'kw-to-units'>('units-to-kw');
  const [unitsPeriod, setUnitsPeriod] = useState<'monthly' | 'daily' | 'yearly'>('monthly');
  const [unitsInput, setUnitsInput] = useState(450);
  const [solarKwInput, setSolarKwInput] = useState(3);
  const [unitsPerKwPerDay, setUnitsPerKwPerDay] = useState(4.2);

  // 2. Horsepower (HP) <-> Electricity Units (kWh) & Solar Pump
  const [hpMode, setHpMode] = useState<'hp-to-units' | 'units-to-hp'>('hp-to-units');
  const [hpType, setHpType] = useState<'mechanical' | 'metric'>('mechanical');
  const [hpValue, setHpValue] = useState(5);
  const [motorRunHours, setMotorRunHours] = useState(6);
  const [motorEfficiency, setMotorEfficiency] = useState(85);
  const [motorPowerFactor, setMotorPowerFactor] = useState(0.85);
  const [dailyUnitsForHp, setDailyUnitsForHp] = useState(25);

  // 3. Universal Power Converter
  const [powerValue, setPowerValue] = useState(5);
  const [powerUnit, setPowerUnit] = useState<'W' | 'kW' | 'MW' | 'HP_mech' | 'HP_metric' | 'kVA' | 'BTU_hr'>('kW');
  const [powerPf, setPowerPf] = useState(0.8);

  // 4. Electrical Ohm's Law & Battery Ah <-> Wh
  const [phase, setPhase] = useState<'1ph' | '3ph' | 'dc'>('1ph');
  const [voltage, setVoltage] = useState(230);
  const [amps, setAmps] = useState(16);
  const [elecPf, setElecPf] = useState(0.9);
  const [batteryVoltage, setBatteryVoltage] = useState(48);
  const [batteryAh, setBatteryAh] = useState(150);

  // 5. Roof Area <-> Solar Capacity
  const [areaValue, setAreaValue] = useState(500);
  const [areaUnit, setAreaUnit] = useState<'sqft' | 'sqm' | 'acre' | 'cottah'>('sqft');
  const [sqftPerKw, setSqftPerKw] = useState(95);

  // Calculations: 1. Units <-> Solar kW
  const unitsKwResult = useMemo(() => {
    const yieldPerDay = Math.max(1, unitsPerKwPerDay);
    if (unitsMode === 'units-to-kw') {
      const dailyUnits =
        unitsPeriod === 'daily'
          ? unitsInput
          : unitsPeriod === 'monthly'
          ? unitsInput / 30
          : unitsInput / 365;
      const requiredKw = dailyUnits / yieldPerDay;
      const requiredWatts = requiredKw * 1000;
      const panels540 = Math.ceil(requiredWatts / 540);
      return {
        dailyUnits,
        monthlyUnits: dailyUnits * 30,
        yearlyUnits: dailyUnits * 365,
        solarKw: requiredKw,
        solarWatts: requiredWatts,
        panels540,
      };
    }
    const dailyUnits = solarKwInput * yieldPerDay;
    return {
      dailyUnits,
      monthlyUnits: dailyUnits * 30,
      yearlyUnits: dailyUnits * 365,
      solarKw: solarKwInput,
      solarWatts: solarKwInput * 1000,
      panels540: Math.ceil((solarKwInput * 1000) / 540),
    };
  }, [unitsMode, unitsPeriod, unitsInput, solarKwInput, unitsPerKwPerDay]);

  // Calculations: 2. HP <-> Units
  const hpResult = useMemo(() => {
    const wattsPerHp = hpType === 'mechanical' ? 745.7 : 735.5;
    const eff = Math.max(0.3, motorEfficiency / 100);
    const pf = Math.max(0.5, motorPowerFactor);
    const hrs = Math.max(0.25, motorRunHours);

    if (hpMode === 'hp-to-units') {
      const mechanicalWatts = hpValue * wattsPerHp;
      const electricalInputWatts = mechanicalWatts / eff;
      const inputKw = electricalInputWatts / 1000;
      const unitsPerHour = inputKw;
      const dailyUnits = unitsPerHour * hrs;
      const monthlyUnits = dailyUnits * 30;
      const amps1Ph = electricalInputWatts / (230 * pf);
      const amps3Ph = electricalInputWatts / (Math.sqrt(3) * 415 * pf);
      const recommendedSolarPumpKw = Math.ceil(hpValue * 1.15 * 2) / 2;

      return {
        hp: hpValue,
        mechanicalWatts,
        electricalInputWatts,
        inputKw,
        unitsPerHour,
        dailyUnits,
        monthlyUnits,
        amps1Ph,
        amps3Ph,
        recommendedSolarPumpKw,
      };
    }

    const inputKw = dailyUnitsForHp / hrs;
    const electricalInputWatts = inputKw * 1000;
    const mechanicalWatts = electricalInputWatts * eff;
    const hp = mechanicalWatts / wattsPerHp;
    const amps1Ph = electricalInputWatts / (230 * pf);
    const amps3Ph = electricalInputWatts / (Math.sqrt(3) * 415 * pf);

    return {
      hp,
      mechanicalWatts,
      electricalInputWatts,
      inputKw,
      unitsPerHour: inputKw,
      dailyUnits: dailyUnitsForHp,
      monthlyUnits: dailyUnitsForHp * 30,
      amps1Ph,
      amps3Ph,
      recommendedSolarPumpKw: Math.ceil(hp * 1.15 * 2) / 2,
    };
  }, [hpMode, hpType, hpValue, motorRunHours, motorEfficiency, motorPowerFactor, dailyUnitsForHp]);

  // Calculations: 3. Universal Power Converter
  const powerResult = useMemo(() => {
    const pf = Math.max(0.1, powerPf);
    let watts = 0;
    switch (powerUnit) {
      case 'W':
        watts = powerValue;
        break;
      case 'kW':
        watts = powerValue * 1000;
        break;
      case 'MW':
        watts = powerValue * 1_000_000;
        break;
      case 'HP_mech':
        watts = powerValue * 745.7;
        break;
      case 'HP_metric':
        watts = powerValue * 735.5;
        break;
      case 'kVA':
        watts = powerValue * 1000 * pf;
        break;
      case 'BTU_hr':
        watts = powerValue * 0.293071;
        break;
    }

    return {
      W: watts,
      kW: watts / 1000,
      MW: watts / 1_000_000,
      HP_mech: watts / 745.7,
      HP_metric: watts / 735.5,
      kVA: watts / (1000 * pf),
      BTU_hr: watts / 0.293071,
      unitsPerHour: watts / 1000,
    };
  }, [powerValue, powerUnit, powerPf]);

  // Calculations: 4. Electrical & Battery
  const electricalResult = useMemo(() => {
    const pf = phase === 'dc' ? 1 : Math.max(0.1, elecPf);
    const watts =
      phase === '3ph'
        ? Math.sqrt(3) * voltage * amps * pf
        : voltage * amps * pf;
    const va = phase === '3ph' ? Math.sqrt(3) * voltage * amps : voltage * amps;
    const batteryWh = batteryVoltage * batteryAh;
    const batteryKwh = batteryWh / 1000;
    return {
      watts,
      kw: watts / 1000,
      kva: va / 1000,
      unitsPerHour: watts / 1000,
      batteryWh,
      batteryKwh,
      usableLithiumKwh: batteryKwh * 0.85,
      usableTubularKwh: batteryKwh * 0.5,
    };
  }, [phase, voltage, amps, elecPf, batteryVoltage, batteryAh]);

  // Calculations: 5. Roof Area
  const areaResult = useMemo(() => {
    let sqft = 0;
    switch (areaUnit) {
      case 'sqft':
        sqft = areaValue;
        break;
      case 'sqm':
        sqft = areaValue * 10.7639;
        break;
      case 'acre':
        sqft = areaValue * 43560;
        break;
      case 'cottah':
        sqft = areaValue * 720;
        break;
    }
    const sqm = sqft / 10.7639;
    const acres = sqft / 43560;
    const kwCapacity = sqft / Math.max(50, sqftPerKw);
    const panels540 = Math.floor((kwCapacity * 1000) / 540);
    return { sqft, sqm, acres, kwCapacity, panels540 };
  }, [areaValue, areaUnit, sqftPerKw]);

  const sections: Array<{ id: UnitSection; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'units-kw', label: 'Units ↔ kW', icon: Sun },
    { id: 'hp-units', label: 'HP ↔ Units', icon: Gauge },
    { id: 'power', label: 'Power (W/kW/HP/kVA)', icon: Zap },
    { id: 'electrical', label: 'Volts / Amps / Ah', icon: Bolt },
    { id: 'area', label: 'Roof Area ↔ kW', icon: Home },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Section Selector */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500">Solar & Electrical Engineering Conversions</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Solar & Electrical Unit Converter
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Instantly convert Electricity Units (kWh) to Solar kW, Horsepower (HP) to Units, kVA, Amps, Battery Ah, and Roof Area.
          </p>
        </div>

        <div className="inline-flex flex-wrap items-center gap-1 rounded-lg bg-slate-200/70 p-1">
          {sections.map((s) => {
            const Icon = s.icon;
            const active = section === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 1. UNITS (kWh) <-> SOLAR kW */}
      {section === 'units-kw' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          <div className="lg:col-span-6 rounded-xl border border-slate-200 bg-white p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-4">
              <h2 className="text-base font-semibold text-slate-900">
                Electricity Units (kWh) ↔ Solar Plant kW
              </h2>
              <button
                type="button"
                onClick={() =>
                  setUnitsMode((m) => (m === 'units-to-kw' ? 'kw-to-units' : 'units-to-kw'))
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 whitespace-nowrap"
              >
                <ArrowLeftRight className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                Swap Direction
              </button>
            </div>

            {unitsMode === 'units-to-kw' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Electricity Consumption Period
                  </label>
                  <div className="inline-flex rounded-lg bg-slate-100 p-1">
                    {(['daily', 'monthly', 'yearly'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setUnitsPeriod(p)}
                        className={`rounded-md px-3 py-1 text-xs font-medium capitalize ${
                          unitsPeriod === p ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                        }`}
                      >
                        {p} Units
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Electricity Units ({unitsPeriod} kWh)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={10}
                    value={unitsInput}
                    onChange={(e) => setUnitsInput(Number(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 font-mono text-lg font-semibold text-slate-900 tabular-nums focus:border-amber-600 focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Solar Plant Size (kW)
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.5}
                  value={solarKwInput}
                  onChange={(e) => setSolarKwInput(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 font-mono text-lg font-semibold text-slate-900 tabular-nums focus:border-amber-600 focus:outline-none"
                />
              </div>
            )}

            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-700">
                  Average Solar Yield (Units / kW / Day)
                </label>
                <span className="font-mono text-xs font-semibold text-amber-700 tabular-nums">
                  {unitsPerKwPerDay.toFixed(1)} kWh/kW/day
                </span>
              </div>
              <input
                type="range"
                min={3.0}
                max={5.5}
                step={0.1}
                value={unitsPerKwPerDay}
                onChange={(e) => setUnitsPerKwPerDay(Number(e.target.value))}
                className="w-full accent-amber-600"
              />
              <p className="text-xs text-slate-500 mt-1">
                Standard Indian rooftop solar yields ~4.0 to 4.5 units per kW per day (120–135 units/month).
              </p>
            </div>
          </div>

          <div className="lg:col-span-6 rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="bg-slate-900 px-6 py-5 text-white">
              <p className="text-xs text-slate-300">
                {unitsMode === 'units-to-kw' ? 'Required Solar Plant Size' : 'Expected Monthly Output'}
              </p>
              <p className="mt-1 font-mono text-3xl font-bold text-amber-400 tabular-nums">
                {unitsMode === 'units-to-kw'
                  ? `${unitsKwResult.solarKw.toFixed(2)} kW`
                  : `${Math.round(unitsKwResult.monthlyUnits).toLocaleString()} Units / mo`}
              </p>
            </div>
            <div className="divide-y divide-slate-200 px-6 text-sm">
              <div className="flex justify-between py-3.5">
                <span className="text-slate-600">Solar Capacity (kW)</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {unitsKwResult.solarKw.toFixed(2)} kW
                </span>
              </div>
              <div className="flex justify-between py-3.5">
                <span className="text-slate-600">Solar Capacity (Watts)</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {Math.round(unitsKwResult.solarWatts).toLocaleString()} W
                </span>
              </div>
              <div className="flex justify-between py-3.5">
                <span className="text-slate-600">Daily Electricity Units</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {unitsKwResult.dailyUnits.toFixed(2)} kWh/day
                </span>
              </div>
              <div className="flex justify-between py-3.5">
                <span className="text-slate-600">Monthly Electricity Units</span>
                <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                  {Math.round(unitsKwResult.monthlyUnits).toLocaleString()} kWh/mo
                </span>
              </div>
              <div className="flex justify-between py-3.5">
                <span className="text-slate-600">Annual Electricity Units</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {Math.round(unitsKwResult.yearlyUnits).toLocaleString()} kWh/yr
                </span>
              </div>
              <div className="flex justify-between py-3.5">
                <span className="text-slate-600">Approx. 540W Panels Needed</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {unitsKwResult.panels540} panels
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. HORSEPOWER (HP) <-> UNITS (kWh) & SOLAR PUMP */}
      {section === 'hp-units' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          <div className="lg:col-span-6 rounded-xl border border-slate-200 bg-white p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-4">
              <h2 className="text-base font-semibold text-slate-900">
                Horsepower (HP) ↔ Units (kWh) & Pump Sizing
              </h2>
              <button
                type="button"
                onClick={() =>
                  setHpMode((m) => (m === 'hp-to-units' ? 'units-to-hp' : 'hp-to-units'))
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50 whitespace-nowrap"
              >
                <ArrowLeftRight className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                Swap Direction
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {hpMode === 'hp-to-units' ? (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Motor / Pump Rating (Horsepower — HP)
                  </label>
                  <input
                    type="number"
                    min={0.25}
                    step={0.5}
                    value={hpValue}
                    onChange={(e) => setHpValue(Number(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 font-mono text-lg font-semibold text-slate-900 tabular-nums focus:border-amber-600 focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[1, 2, 3, 5, 7.5, 10, 15].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setHpValue(preset)}
                        className={`rounded-md border px-2.5 py-1 font-mono text-xs tabular-nums ${
                          hpValue === preset
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {preset} HP
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Daily Motor Energy Consumption (Units / kWh per day)
                  </label>
                  <input
                    type="number"
                    min={0.5}
                    step={1}
                    value={dailyUnitsForHp}
                    onChange={(e) => setDailyUnitsForHp(Number(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 font-mono text-lg font-semibold text-slate-900 tabular-nums focus:border-amber-600 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  HP Standard
                </label>
                <select
                  value={hpType}
                  onChange={(e) => setHpType(e.target.value as 'mechanical' | 'metric')}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                >
                  <option value="mechanical">Mechanical / Electrical (745.7 W)</option>
                  <option value="metric">Metric HP / PS (735.5 W)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Daily Running Hours
                </label>
                <input
                  type="number"
                  min={0.5}
                  max={24}
                  step={0.5}
                  value={motorRunHours}
                  onChange={(e) => setMotorRunHours(Number(e.target.value) || 1)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Motor Efficiency (%)
                </label>
                <input
                  type="number"
                  min={50}
                  max={100}
                  step={1}
                  value={motorEfficiency}
                  onChange={(e) => setMotorEfficiency(Number(e.target.value) || 85)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Power Factor (PF)
                </label>
                <input
                  type="number"
                  min={0.5}
                  max={1}
                  step={0.05}
                  value={motorPowerFactor}
                  onChange={(e) => setMotorPowerFactor(Number(e.target.value) || 0.85)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="bg-slate-900 px-6 py-5 text-white">
              <p className="text-xs text-slate-300">
                {hpMode === 'hp-to-units'
                  ? `Units Consumed (${motorRunHours} hrs/day)`
                  : 'Equivalent Motor Horsepower'}
              </p>
              <p className="mt-1 font-mono text-3xl font-bold text-amber-400 tabular-nums">
                {hpMode === 'hp-to-units'
                  ? `${hpResult.dailyUnits.toFixed(2)} Units / day`
                  : `${hpResult.hp.toFixed(2)} HP`}
              </p>
            </div>
            <div className="divide-y divide-slate-200 px-6 text-sm">
              <div className="flex justify-between py-3">
                <span className="text-slate-600">Units per Hour (kWh/hr)</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {hpResult.unitsPerHour.toFixed(3)} Units/hr
                </span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-slate-600">Monthly Units ({motorRunHours}h × 30d)</span>
                <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                  {hpResult.monthlyUnits.toFixed(1)} Units/mo
                </span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-slate-600">Shaft Output Power</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {Math.round(hpResult.mechanicalWatts).toLocaleString()} W
                </span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-slate-600">Electrical Input Draw (at {motorEfficiency}% eff.)</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {hpResult.inputKw.toFixed(2)} kW ({Math.round(hpResult.electricalInputWatts).toLocaleString()} W)
                </span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-slate-600">Running Current (1-Ph 230V / 3-Ph 415V)</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {hpResult.amps1Ph.toFixed(1)} A / {hpResult.amps3Ph.toFixed(1)} A
                </span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-slate-600">Recommended Solar Pump Array</span>
                <span className="font-mono font-semibold text-amber-700 tabular-nums">
                  {hpResult.recommendedSolarPumpKw.toFixed(1)} kW DC Array
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. UNIVERSAL POWER CONVERTER */}
      {section === 'power' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 items-end border-b border-slate-200 pb-5">
            <div className="sm:col-span-5">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Input Value</label>
              <input
                type="number"
                step="any"
                value={powerValue}
                onChange={(e) => setPowerValue(Number(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 font-mono text-lg font-semibold text-slate-900 tabular-nums focus:border-amber-600 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-4">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Source Unit</label>
              <select
                value={powerUnit}
                onChange={(e) => setPowerUnit(e.target.value as typeof powerUnit)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900"
              >
                <option value="W">Watts (W)</option>
                <option value="kW">Kilowatts (kW)</option>
                <option value="MW">Megawatts (MW)</option>
                <option value="HP_mech">Horsepower — Mechanical (745.7W)</option>
                <option value="HP_metric">Horsepower — Metric (735.5W)</option>
                <option value="kVA">Kilovolt-Ampere (kVA)</option>
                <option value="BTU_hr">BTU / Hour (HVAC)</option>
              </select>
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Power Factor (for kVA)
              </label>
              <input
                type="number"
                min={0.5}
                max={1}
                step={0.05}
                value={powerPf}
                onChange={(e) => setPowerPf(Number(e.target.value) || 0.8)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-mono text-sm tabular-nums"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Watts (W)', val: powerResult.W.toLocaleString(undefined, { maximumFractionDigits: 2 }) },
              { label: 'Kilowatts (kW)', val: powerResult.kW.toFixed(4) },
              { label: 'Megawatts (MW)', val: powerResult.MW.toFixed(6) },
              { label: 'Units per Hour (kWh/hr)', val: powerResult.unitsPerHour.toFixed(4) },
              { label: 'Horsepower (Mech 745.7W)', val: powerResult.HP_mech.toFixed(3) },
              { label: 'Horsepower (Metric 735.5W)', val: powerResult.HP_metric.toFixed(3) },
              { label: `Apparent Power (kVA @ PF ${powerPf})`, val: powerResult.kVA.toFixed(3) },
              { label: 'Thermal / AC (BTU/hr)', val: Math.round(powerResult.BTU_hr).toLocaleString() },
            ].map((cell) => (
              <div key={cell.label} className="rounded-lg border border-slate-200 bg-slate-50/70 p-4">
                <p className="text-xs text-slate-500">{cell.label}</p>
                <p className="mt-1 font-mono text-lg font-semibold text-slate-900 tabular-nums">
                  {cell.val}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. ELECTRICAL OHM'S LAW & BATTERY AH <-> WH */}
      {section === 'electrical' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Volts / Amps -> Watts / kW / kVA */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
            <h2 className="text-base font-semibold text-slate-900 border-b border-slate-200 pb-3">
              Volts & Amps → Watts, kW & kVA
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <div className="inline-flex rounded-lg bg-slate-100 p-1">
                  {(
                    [
                      { id: 'dc', label: 'DC Solar' },
                      { id: '1ph', label: 'AC Single-Phase' },
                      { id: '3ph', label: 'AC Three-Phase' },
                    ] as const
                  ).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setPhase(p.id);
                        setVoltage(p.id === '3ph' ? 415 : p.id === '1ph' ? 230 : 48);
                      }}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap ${
                        phase === p.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Voltage (V)</label>
                <input
                  type="number"
                  value={voltage}
                  onChange={(e) => setVoltage(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Current (Amps)</label>
                <input
                  type="number"
                  step={0.5}
                  value={amps}
                  onChange={(e) => setAmps(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums"
                />
              </div>
              {phase !== 'dc' && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Power Factor (0.5 – 1.0)
                  </label>
                  <input
                    type="number"
                    min={0.5}
                    max={1}
                    step={0.05}
                    value={elecPf}
                    onChange={(e) => setElecPf(Number(e.target.value) || 0.9)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums"
                  />
                </div>
              )}
            </div>

            <div className="divide-y divide-slate-200 border-t border-slate-200 pt-2 text-sm">
              <div className="flex justify-between py-2.5">
                <span className="text-slate-600">Real Power (Watts)</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {electricalResult.watts.toFixed(1)} W
                </span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-slate-600">Real Power (kW)</span>
                <span className="font-mono font-semibold text-amber-700 tabular-nums">
                  {electricalResult.kw.toFixed(3)} kW
                </span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-slate-600">Apparent Power (kVA)</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {electricalResult.kva.toFixed(3)} kVA
                </span>
              </div>
            </div>
          </div>

          {/* Battery Ah <-> Wh / Units */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
            <h2 className="text-base font-semibold text-slate-900 border-b border-slate-200 pb-3">
              Battery Ah ↔ Watt-Hours (Wh) & Units (kWh)
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Battery System Voltage (V)
                </label>
                <select
                  value={batteryVoltage}
                  onChange={(e) => setBatteryVoltage(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm tabular-nums"
                >
                  <option value={12}>12 V</option>
                  <option value={24}>24 V</option>
                  <option value={48}>48 V</option>
                  <option value={96}>96 V</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Battery Capacity (Ah)
                </label>
                <input
                  type="number"
                  min={1}
                  step={10}
                  value={batteryAh}
                  onChange={(e) => setBatteryAh(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums"
                />
              </div>
            </div>

            <div className="divide-y divide-slate-200 border-t border-slate-200 pt-2 text-sm">
              <div className="flex justify-between py-2.5">
                <span className="text-slate-600">Total Stored Energy (Wh)</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {electricalResult.batteryWh.toLocaleString()} Wh
                </span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-slate-600">Total Stored Units (kWh)</span>
                <span className="font-mono font-semibold text-amber-700 tabular-nums">
                  {electricalResult.batteryKwh.toFixed(2)} kWh (Units)
                </span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-slate-600">Usable Lithium Energy (85% DoD)</span>
                <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                  {electricalResult.usableLithiumKwh.toFixed(2)} Units
                </span>
              </div>
              <div className="flex justify-between py-2.5">
                <span className="text-slate-600">Usable Tubular Energy (50% DoD)</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {electricalResult.usableTubularKwh.toFixed(2)} Units
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. ROOF AREA <-> SOLAR CAPACITY */}
      {section === 'area' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          <div className="lg:col-span-6 rounded-xl border border-slate-200 bg-white p-6 space-y-5">
            <h2 className="text-base font-semibold text-slate-900 border-b border-slate-200 pb-3">
              Shadow-Free Roof / Land Area Input
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Area Value</label>
                <input
                  type="number"
                  min={0}
                  step={10}
                  value={areaValue}
                  onChange={(e) => setAreaValue(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-base font-semibold tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Area Unit</label>
                <select
                  value={areaUnit}
                  onChange={(e) => setAreaUnit(e.target.value as typeof areaUnit)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="sqft">Square Feet (sq ft)</option>
                  <option value="sqm">Square Meters (m²)</option>
                  <option value="cottah">Cottah / Katha (720 sq ft)</option>
                  <option value="acre">Acres (43,560 sq ft)</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Footprint Density (sq ft per kW — typical 90–100 sq ft)
                </label>
                <input
                  type="number"
                  min={60}
                  max={140}
                  value={sqftPerKw}
                  onChange={(e) => setSqftPerKw(Number(e.target.value) || 95)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm tabular-nums"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="bg-slate-900 px-6 py-5 text-white">
              <p className="text-xs text-slate-300">Estimated Installable Solar Plant</p>
              <p className="mt-1 font-mono text-3xl font-bold text-amber-400 tabular-nums">
                {areaResult.kwCapacity.toFixed(2)} kW
              </p>
            </div>
            <div className="divide-y divide-slate-200 px-6 text-sm">
              <div className="flex justify-between py-3">
                <span className="text-slate-600">Square Feet (sq ft)</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {Math.round(areaResult.sqft).toLocaleString()} sq ft
                </span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-slate-600">Square Meters (m²)</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {areaResult.sqm.toFixed(2)} m²
                </span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-slate-600">Acres</span>
                <span className="font-mono font-semibold text-slate-900 tabular-nums">
                  {areaResult.acres.toFixed(4)} acres
                </span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-slate-600">Fits Approx. 540W Panels</span>
                <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                  {areaResult.panels540} panels
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Field Engineering Quick Reference Table */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-200 px-6 py-3.5">
          <h2 className="text-sm font-semibold text-slate-900">
            Solar & Electrical Quick Conversion Reference
          </h2>
        </div>
        <div className="grid grid-cols-1 divide-y divide-slate-200 sm:grid-cols-2 sm:divide-y-0 sm:divide-x lg:grid-cols-4 text-xs">
          <div className="p-4 space-y-1">
            <p className="font-semibold text-slate-900">Electricity Unit</p>
            <p className="font-mono text-slate-600 tabular-nums">1 Unit = 1 kWh = 1,000 Wh</p>
          </div>
          <div className="p-4 space-y-1">
            <p className="font-semibold text-slate-900">Horsepower (HP)</p>
            <p className="font-mono text-slate-600 tabular-nums">1 HP = 745.7 W (Mech) · 735.5 W (Metric)</p>
          </div>
          <div className="p-4 space-y-1">
            <p className="font-semibold text-slate-900">1 kW Solar Generation</p>
            <p className="font-mono text-slate-600 tabular-nums">~4.0–4.5 Units/day · 120–135 Units/mo</p>
          </div>
          <div className="p-4 space-y-1">
            <p className="font-semibold text-slate-900">Roof Footprint & kVA</p>
            <p className="font-mono text-slate-600 tabular-nums">1 kW ≈ 95 sq ft · kW = kVA × PF</p>
          </div>
        </div>
      </section>
    </div>
  );
};
