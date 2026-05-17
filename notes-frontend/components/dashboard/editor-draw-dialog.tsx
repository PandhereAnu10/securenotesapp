"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eraser, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EditorDrawDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, opens in edit mode with existing drawing loaded */
  initialImage?: string | null;
  onInsert: (dataUrl: string) => void;
  onUpdate?: (dataUrl: string) => void;
}

export function EditorDrawDialog({
  open,
  onOpenChange,
  initialImage,
  onInsert,
  onUpdate,
}: EditorDrawDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [strokeColor, setStrokeColor] = useState("#fafafa");
  const isEdit = Boolean(initialImage);

  const getCtx = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }, []);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(2, 2);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = strokeColor;

    const drawBackground = () => {
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, rect.width, rect.height);
    };

    if (initialImage) {
      const img = new window.Image();
      img.onload = () => {
        drawBackground();
        const scale = Math.min(rect.width / img.width, rect.height / img.height, 1);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (rect.width - w) / 2;
        const y = (rect.height - h) / 2;
        ctx.drawImage(img, x, y, w, h);
      };
      img.src = initialImage;
    } else {
      drawBackground();
    }
  }, [getCtx, strokeColor, initialImage]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(initCanvas, 50);
    return () => clearTimeout(t);
  }, [open, initCanvas]);

  useEffect(() => {
    const ctx = getCtx();
    if (ctx) ctx.strokeStyle = strokeColor;
  }, [strokeColor, getCtx]);

  const pointerPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ctx = getCtx();
    if (!ctx) return;
    drawing.current = true;
    canvasRef.current?.setPointerCapture(e.pointerId);
    const { x, y } = pointerPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = pointerPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const onPointerUp = () => {
    drawing.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, rect.width, rect.height);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    if (isEdit && onUpdate) {
      onUpdate(dataUrl);
    } else {
      onInsert(dataUrl);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-obsidian-border bg-obsidian-panel sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="tracking-tighter">
            {isEdit ? "Edit drawing" : "Draw"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Continue sketching on your drawing, or clear and redraw."
              : "Sketch on the canvas and insert it into your note."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 py-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-none border-obsidian-border text-sm font-medium tracking-normal"
            onClick={() => setStrokeColor("#fafafa")}
          >
            <PenLine className="mr-1 h-3 w-3" />
            White
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-none border-obsidian-border text-sm font-medium tracking-normal"
            onClick={() => setStrokeColor("#71717a")}
          >
            Gray
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-none border-obsidian-border text-sm font-medium tracking-normal"
            onClick={clearCanvas}
          >
            <Eraser className="mr-1 h-3 w-3" />
            Clear
          </Button>
        </div>

        <canvas
          ref={canvasRef}
          className="h-64 w-full touch-none border border-obsidian-border bg-black"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />

        <DialogFooter>
          <Button
            type="button"
            className="rounded-none bg-foreground text-background"
            onClick={handleSave}
          >
            {isEdit ? "Update drawing" : "Insert drawing"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
