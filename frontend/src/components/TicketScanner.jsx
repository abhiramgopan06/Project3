import { useEffect, useId, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function TicketScanner({ onScan, onClose }) {
  const reactId = useId().replace(/:/g, "");
  const elementId = "evently-ticket-scanner-" + reactId;
  const [scannerError, setScannerError] = useState("");
  const [manualToken, setManualToken] = useState("");

  useEffect(function () {
    const scanner = new Html5Qrcode(elementId);
    let active = true;
    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1 },
      async function (decodedText) {
        if (!active) return;
        active = false;
        try { await scanner.stop(); } catch (error) {}
        onScan(decodedText);
      },
      function () {}
    ).catch(function () {
      if (active) setScannerError("Camera access was unavailable. Allow camera permission or use the manual ticket-token field below.");
    });
    return function () {
      active = false;
      if (scanner.isScanning) scanner.stop().catch(function () {});
      scanner.clear().catch(function () {});
    };
  }, [elementId, onScan]);

  return (
    <section className="ticket-scanner-card">
      <div className="section-head compact-head"><div><span className="eyebrow">ENTRY CHECK-IN</span><h2>Scan attendee ticket</h2><p className="hint">Point the camera at the QR code shown on the attendee's confirmed booking.</p></div><button className="btn ghost small" type="button" onClick={onClose}>Close scanner</button></div>
      <div id={elementId} className="ticket-scanner-camera" />
      {scannerError && <p className="notice">{scannerError}</p>}
      <form className="manual-ticket-token" onSubmit={function (event) { event.preventDefault(); if (manualToken.trim()) onScan(manualToken.trim()); }}>
        <label htmlFor={elementId + "-manual"}>Or enter ticket token manually</label>
        <div className="attendee-tool-actions"><input id={elementId + "-manual"} value={manualToken} onChange={function (event) { setManualToken(event.target.value); }} placeholder="Paste ticket token" /><button className="btn ghost" type="submit" disabled={!manualToken.trim()}>Verify ticket</button></div>
      </form>
    </section>
  );
}
