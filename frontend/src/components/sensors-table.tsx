import { Panel } from "@/components/ui";
import {
  getSensorAvailability,
  SensorSummary,
  validateSensorSummary
} from "@/lib/sensor-data";

function formatAvailability(value: number) {
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`;
}

function AvailabilityBar({ value }: { value: number }) {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div className="flex min-w-[140px] items-center gap-3">
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-slateblue-600"
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      <span className="w-12 text-right text-sm font-semibold text-slate-700">
        {formatAvailability(clampedValue)}
      </span>
    </div>
  );
}

function SensorMobileCard({ sensor }: { sensor: SensorSummary }) {
  const availability = getSensorAvailability(sensor);
  const isValid = validateSensorSummary(sensor);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <h4 className="text-base font-semibold text-slate-900">{sensor.type}</h4>
        {!isValid ? (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            Check data
          </span>
        ) : null}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Total</p>
          <p className="mt-1 font-semibold text-slate-900">{sensor.total}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Active</p>
          <p className="mt-1 font-semibold text-emerald-700">{sensor.active}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Inactive</p>
          <p className="mt-1 font-semibold text-red-700">{sensor.inactive}</p>
        </div>
      </div>
      <div className="mt-4">
        <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">
          Availability
        </p>
        <AvailabilityBar value={availability} />
      </div>
    </div>
  );
}

export function SensorsTable({ sensors }: { sensors: SensorSummary[] }) {
  const isEmpty = sensors.length === 0;

  return (
    <Panel>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Sensor Inventory</h3>
          <p className="mt-1 text-sm text-slate-500">
            Current status summary for pipeline monitoring instruments.
          </p>
        </div>
      </div>

      <div className="mt-6 hidden overflow-x-auto rounded-3xl border border-slate-200 md:block">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Sensor Type</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
              <th className="px-4 py-3 text-right font-medium">Active</th>
              <th className="px-4 py-3 text-right font-medium">Inactive</th>
              <th className="px-4 py-3 text-right font-medium">Availability</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {isEmpty ? (
              <tr>
                <td className="px-4 py-10 text-center text-slate-500" colSpan={5}>
                  No device records are available yet.
                </td>
              </tr>
            ) : (
              sensors.map((sensor) => {
                const availability = getSensorAvailability(sensor);
                const isValid = validateSensorSummary(sensor);

                return (
                  <tr key={sensor.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-4 font-medium text-slate-900">
                      <div className="flex items-center gap-3">
                        {sensor.type}
                        {!isValid ? (
                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            Check data
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-slate-900">
                      {sensor.total}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {sensor.active}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                        {sensor.inactive}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end">
                        <AvailabilityBar value={availability} />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 space-y-4 md:hidden">
        {isEmpty ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm text-slate-500">
            No device records are available yet.
          </div>
        ) : (
          sensors.map((sensor) => (
            <SensorMobileCard key={sensor.id} sensor={sensor} />
          ))
        )}
      </div>
    </Panel>
  );
}
