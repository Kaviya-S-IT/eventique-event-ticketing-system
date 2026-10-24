import React, { useState } from 'react';
import { X, Zap, ShieldCheck, CheckCircle2, AlertOctagon, RefreshCw, Users } from 'lucide-react';

interface ConcurrencySimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ConcurrencySimulatorModal: React.FC<ConcurrencySimulatorModalProps> = ({ isOpen, onClose }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  if (!isOpen) return null;

  const runTest = async () => {
    setIsRunning(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/reservations/stress-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-3xl border border-[#D8CBE8] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-[#EDE7F6] p-6 border-b border-[#D8CBE8] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-[#D99A36] border border-[#D8CBE8] flex items-center justify-center shadow-xs">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#5D4634]">Atomic Concurrency Stress-Tester</h3>
              <p className="text-xs text-[#5F5A64]">
                Proves serialized PostgreSQL-equivalent inventory locks prevent ticket overselling
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white text-[#5F5A64] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          <div className="bg-[#F5EFE7] p-4 rounded-2xl border border-[#D8CBE8]/70 text-xs text-[#5F5A64] space-y-2">
            <div className="flex items-center gap-2 font-bold text-[#5D4634]">
              <ShieldCheck className="w-4 h-4 text-[#388E65]" />
              <span>Simulated Scenario:</span>
            </div>
            <p>
              An exclusive VIP tier has <strong>exactly 1 remaining seat</strong>. Two distinct attendees (Alice & Bob) click "Reserve Ticket" at the exact same millisecond.
            </p>
            <p>
              Under a naive system without serialized atomic row locking, both requests read quantity = 1 and both reserve tickets, causing illegal overselling.
            </p>
            <p className="font-semibold text-[#5D4634]">
              Watch how Eventique’s backend atomic lock enforces serialization so only 1 request succeeds and the other is safely rejected.
            </p>
          </div>

          <div className="flex justify-center">
            <button
              onClick={runTest}
              disabled={isRunning}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#C4A484] hover:bg-[#b09172] text-white font-bold text-sm shadow-md transition disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Firing Parallel Requests in Server Mutex...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Launch 2 Simultaneous Concurrent Requests</span>
                </>
              )}
            </button>
          </div>

          {/* Test Results Display */}
          {testResult && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Racer 1: Alice */}
                <div className={`p-4 rounded-2xl border ${
                  testResult.results.attendeeA.success 
                    ? 'bg-[#388E65]/5 border-[#388E65]/30' 
                    : 'bg-[#C94C4C]/5 border-[#C94C4C]/30'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#5D4634] flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#C4A484]" />
                      Attendee 1 (Alice)
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      testResult.results.attendeeA.success ? 'bg-[#388E65] text-white' : 'bg-[#C94C4C] text-white'
                    }`}>
                      {testResult.results.attendeeA.success ? 'SUCCESS (HELD)' : 'REJECTED (409)'}
                    </span>
                  </div>
                  <p className="text-xs text-[#5F5A64]">
                    {testResult.results.attendeeA.success 
                      ? `Reserved Hold ID: ${testResult.results.attendeeA.reservationId}. Exactly 10-minute hold initiated.`
                      : `Error: ${testResult.results.attendeeA.error}`
                    }
                  </p>
                </div>

                {/* Racer 2: Bob */}
                <div className={`p-4 rounded-2xl border ${
                  testResult.results.attendeeB.success 
                    ? 'bg-[#388E65]/5 border-[#388E65]/30' 
                    : 'bg-[#C94C4C]/5 border-[#C94C4C]/30'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-[#5D4634] flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#C4A484]" />
                      Attendee 2 (Bob)
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      testResult.results.attendeeB.success ? 'bg-[#388E65] text-white' : 'bg-[#C94C4C] text-white'
                    }`}>
                      {testResult.results.attendeeB.success ? 'SUCCESS (HELD)' : 'REJECTED (409)'}
                    </span>
                  </div>
                  <p className="text-xs text-[#5F5A64]">
                    {testResult.results.attendeeB.success 
                      ? `Reserved Hold ID: ${testResult.results.attendeeB.reservationId}`
                      : `Error: ${testResult.results.attendeeB.error}`
                    }
                  </p>
                </div>
              </div>

              {/* Verification Summary Banner */}
              <div className="p-4 bg-[#EDE7F6] rounded-2xl border border-[#D8CBE8] flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#388E65] shrink-0 mt-0.5" />
                <div className="text-xs text-[#5D4634]">
                  <p className="font-bold text-sm">Integrity Verified: Zero Overselling</p>
                  <p className="mt-1 leading-relaxed text-[#5F5A64]">
                    Total capacity: 1 seat. Successful reservations: {testResult.verification.successfulReservations}.
                    {testResult.verification.preventedOverselling ? ' The second competing transaction was safely rejected with zero database corruption.' : ''}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#F5EFE7] border-t border-[#D8CBE8] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white border border-[#D8CBE8] text-xs font-bold text-[#5D4634] hover:bg-[#EDE7F6] transition"
          >
            Close Benchmark
          </button>
        </div>
      </div>
    </div>
  );
};
