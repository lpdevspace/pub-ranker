import React, { useState, useEffect } from 'react';

export function LiveGoogleStatus({ pub, featureFlags }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!featureFlags?.enableGoogleStatus || !pub?.placeId) return;
    setLoading(true);
    // Placeholder: replace with real Google Places API call if needed
    setTimeout(() => {
      setStatus(null);
      setLoading(false);
    }, 500);
  }, [pub?.placeId, featureFlags?.enableGoogleStatus]);

  if (!featureFlags?.enableGoogleStatus) return null;
  if (loading) return (
    <div className="text-xs text-gray-400 animate-pulse font-bold uppercase tracking-wider">
      Checking Google status...
    </div>
  );
  if (!status) return null;

  return (
    <div className="inline-flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-3 py-2">
      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
      <span className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider">
        {status}
      </span>
    </div>
  );
}

export default function PubsToVisitPage() {
  return <div>Pubs To Visit Page</div>;
}
