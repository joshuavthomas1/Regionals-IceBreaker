"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extractCode } from "@/lib/codes";

export function Scanner() {
  const router = useRouter();
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [typedError, setTypedError] = useState<string | null>(null);

  function openCode(raw: string) {
    const code = extractCode(raw);
    if (!code) {
      setTypedError("Enter a badge code, or the link from a QR.");
      return;
    }
    router.push(`/p/${code}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium tracking-[0.18em] text-primary uppercase">Scanner</p>
        <h1 className="font-display text-4xl leading-none tracking-tight">Scan a badge.</h1>
        <p className="text-muted-foreground">
          Point at someone else&apos;s QR. Your phone camera works too — every badge is a link.
        </p>
      </div>

      {cameraOn ? (
        <CameraPane
          onCode={(code) => router.push(`/p/${code}`)}
          onError={(message) => {
            setCameraError(message);
            setCameraOn(false);
          }}
          onClose={() => setCameraOn(false)}
        />
      ) : (
        <section className="rounded-2xl border border-dashed border-border bg-card px-4 py-6">
          <Button type="button" className="h-12 w-full text-base" onClick={() => setCameraOn(true)}>
            Open camera
          </Button>
          {cameraError ? (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {cameraError}
            </p>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              If the browser blocks the camera, use the phone&apos;s camera app on the badge, or type the code.
            </p>
          )}
        </section>
      )}

      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          openCode(typed);
        }}
      >
        <Label htmlFor="scan-code">Or type a code</Label>
        <Input
          id="scan-code"
          value={typed}
          onChange={(event) => {
            setTyped(event.target.value);
            setTypedError(null);
          }}
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="Badge code"
          className="h-12 bg-card px-3 font-mono text-base tracking-[0.14em] uppercase md:text-base"
        />
        {typedError ? (
          <p className="text-sm text-destructive" role="alert">
            {typedError}
          </p>
        ) : null}
        <Button type="submit" variant="outline" className="h-12 text-base">
          Open this badge
        </Button>
      </form>
    </div>
  );
}

function CameraPane({
  onCode,
  onError,
  onClose,
}: {
  onCode: (code: string) => void;
  onError: (message: string) => void;
  onClose: () => void;
}) {
  const onCodeRef = useRef(onCode);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onCodeRef.current = onCode;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    let stopped = false;
    let scanner: { stop: () => Promise<void>; isScanning: boolean } | null = null;

    async function start() {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (stopped) return;
        const instance = new Html5Qrcode("badge-reader");
        scanner = instance;
        await instance.start(
          { facingMode: "environment" },
          { fps: 8, qrbox: { width: 230, height: 230 } },
          (decoded) => {
            const code = extractCode(decoded);
            if (!code || stopped) return;
            stopped = true;
            void instance.stop().catch(() => undefined);
            onCodeRef.current(code);
          },
          () => undefined,
        );
      } catch (caught) {
        if (stopped) return;
        const name = caught instanceof Error ? caught.name : "";
        onErrorRef.current(
          name === "NotAllowedError"
            ? "Camera access is blocked. Use your phone camera on the badge, or type the code."
            : "This device didn't open a camera. Type the code, or scan with the phone camera app.",
        );
      }
    }

    void start();
    return () => {
      stopped = true;
      if (scanner?.isScanning) void scanner.stop().catch(() => undefined);
    };
  }, []);

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <div id="badge-reader" className="[&_video]:w-full" />
      <div className="p-3">
        <Button type="button" variant="outline" className="h-10 w-full" onClick={onClose}>
          Close camera
        </Button>
      </div>
    </section>
  );
}
