import { useEffect, useState } from "react";
import type { WindowControls } from "@gita/ui";
import { isTauri } from "./platform";

export function useWindowControls(): WindowControls {
  const enabled = isTauri();
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void (async () => {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const win = getCurrentWindow();
      if (disposed) return;
      setMaximized(await win.isMaximized());
      const stop = await win.onResized(() => {
        void win.isMaximized().then((value) => {
          if (!disposed) setMaximized(value);
        });
      });
      if (disposed) stop();
      else unlisten = stop;
    })();
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, [enabled]);

  return {
    enabled,
    maximized,
    onMinimize: () => {
      void import("@tauri-apps/api/window").then(({ getCurrentWindow }) => getCurrentWindow().minimize());
    },
    onMaximize: () => {
      void import("@tauri-apps/api/window").then(({ getCurrentWindow }) =>
        getCurrentWindow().toggleMaximize(),
      );
    },
    onClose: () => {
      void import("@tauri-apps/api/window").then(({ getCurrentWindow }) => getCurrentWindow().close());
    },
  };
}
