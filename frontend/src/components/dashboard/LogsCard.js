"use client";

import useAppData from "@/hooks/useAppData";

export default function LogsCard() {
  const { logs } = useAppData();

  const entries = logs.flatMap((log) => {
    const edits =
      log.updates?.map((update) => ({
        sample_id: log.sample_id,
        type: "Edited",
        date: update.date,
      })) || [];

    const added = {
      sample_id: log.sample_id,
      type: "Added",
      date: log.added_at,
    };

    return [added, ...edits];
  });

  const recent = entries
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 10);

  return (
    <div className="rounded-xl p-4 bg-white shadow-md min-h-[100px]">
      <h2 className="text-lg font-semibold mb-4">Recent Sample Activity</h2>
      {recent.length === 0 ? (
        <p className="text-gray-500 italic">No recent activity</p>
      ) : (
        <table className="w-full text-sm text-gray-800">
          <thead className="text-left border-b border-gray-300">
            <tr>
              <th className="py-1 pr-4">Date</th>
              <th className="py-1 pr-4">Type</th>
              <th className="py-1">Sample ID</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((entry, i) => (
              <tr key={i}>
                <td className="py-1 pr-4 text-gray-800">
                  {new Date(entry.date).toLocaleString(undefined, {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })}
                </td>
                <td className="py-1 pr-4">{entry.type}</td>
                <td className="py-1 font-medium">{entry.sample_id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
