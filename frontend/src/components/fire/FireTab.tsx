import { useEffect } from "react";
import { useFireStore } from "../../store/fireStore";
import { FireInputForm } from "./FireInputForm";
import { FireResults } from "./FireResults";
import { Spinner } from "../shared/Spinner";

export function FireTab() {
  const { calculate, loading } = useFireStore();

  useEffect(() => {
    calculate();
  }, []);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          🔥 FIRE Numbers
        </h1>
        <p className="text-slate-400 text-sm">
          Financial Independence, Retire Early — model your path to freedom.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <div>
          <FireInputForm />
          <button
            onClick={calculate}
            disabled={loading}
            className="mt-4 w-full px-6 py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Spinner size="sm" />}
            Calculate FIRE
          </button>
        </div>
        <FireResults />
      </div>
    </div>
  );
}
