import { useFireStore } from "../../store/fireStore";
import type { FireRequest } from "../../types";

function Field({
  label,
  k,
  prefix,
  suffix,
  min,
  max,
  step,
}: {
  label: string;
  k: keyof FireRequest;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  const { inputs, setInput } = useFireStore();
  const value = inputs[k] as number;

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-slate-400 font-medium">{label}</label>
      <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
        {prefix && <span className="px-2 text-slate-500 text-sm border-r border-slate-700">{prefix}</span>}
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step ?? 1}
          onChange={(e) => setInput(k, parseFloat(e.target.value) || 0)}
          className="flex-1 bg-transparent px-3 py-2 text-white text-sm outline-none"
        />
        {suffix && <span className="px-2 text-slate-500 text-sm border-l border-slate-700">{suffix}</span>}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 pb-2 border-b border-slate-700">
        {title}
      </h3>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

export function FireInputForm() {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
      <Section title="Basic Info">
        <Field label="Current Age" k="current_age" min={18} max={80} />
        <Field label="Target Retirement Age" k="target_retirement_age" min={30} max={90} />
        <Field label="Annual Income" k="current_income" prefix="$" step={1000} />
        <Field label="Annual Expenses" k="annual_expenses" prefix="$" step={1000} />
        <Field label="Current Savings" k="current_savings" prefix="$" step={1000} />
        <Field label="Savings Rate" k="savings_rate_pct" suffix="%" min={0} max={100} step={0.5} />
        <Field label="Expected Return" k="expected_return_pct" suffix="%" min={1} max={20} step={0.5} />
      </Section>

      <Section title="Roth IRA">
        <Field label="Current Roth Balance" k="roth_current_balance" prefix="$" step={1000} />
        <Field label="Annual Roth Contribution" k="roth_annual_contribution" prefix="$" step={500} max={7000} />
      </Section>

      <Section title="401(k)">
        <Field label="Current 401(k) Balance" k="k401_current_balance" prefix="$" step={1000} />
        <Field label="Annual 401(k) Contribution" k="k401_annual_contribution" prefix="$" step={1000} max={23000} />
        <Field label="Employer Match ($/yr)" k="k401_employer_match" prefix="$" step={500} />
      </Section>
    </div>
  );
}
