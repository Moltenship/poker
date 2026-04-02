import { useMemo, useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Image component with a skeleton placeholder to prevent layout shifts.
 *  Dimensions are read from a `#dim=WxH` URL hash fragment appended by the server.
 *  Clicking the image opens a full-size preview dialog. */
export function DescriptionImage({
  className: _className,
  src,
  ...props
}: React.ComponentProps<"img">) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [preview, setPreview] = useState(false);

  // Parse server-provided dimensions from URL hash (e.g., #dim=800x600)
  const { cleanSrc, width, height } = useMemo(() => {
    if (!src) {
      return { cleanSrc: src };
    }
    const hashIdx = src.indexOf("#dim=");
    if (hashIdx === -1) {
      return { cleanSrc: src };
    }
    const dimStr = src.slice(hashIdx + 5);
    const [w, h] = dimStr.split("x").map(Number);
    return {
      cleanSrc: src.slice(0, hashIdx),
      height: h || undefined,
      width: w || undefined,
    };
  }, [src]);

  if (error) {
    return <span className="text-muted-foreground text-xs italic">Image not available</span>;
  }

  return (
    <>
      {!loaded && (
        <span
          className="bg-muted block animate-pulse rounded-lg"
          style={
            width && height
              ? { aspectRatio: `${width}/${height}`, maxWidth: width, width: "100%" }
              : { height: 128, width: 192 }
          }
        />
      )}
      <img
        {...props}
        src={cleanSrc}
        width={width}
        height={height}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        onClick={() => setPreview(true)}
        className={cn(
          "max-w-full cursor-pointer rounded-lg",
          loaded
            ? "opacity-100 transition-opacity duration-300"
            : "!m-0 !h-0 !p-0 overflow-hidden opacity-0",
        )}
        style={width && height ? { height: "auto" } : undefined}
      />

      <Dialog open={preview} onOpenChange={setPreview}>
        <DialogContent
          className="w-auto max-w-[calc(100vw-2rem)] gap-0 border-0 bg-transparent p-0 shadow-none sm:max-w-[calc(100vw-2rem)]"
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">{props.alt || "Image preview"}</DialogTitle>
          <img
            src={cleanSrc}
            alt={props.alt}
            className="max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] rounded-lg object-contain"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

export const streamdownComponents = { img: DescriptionImage };
