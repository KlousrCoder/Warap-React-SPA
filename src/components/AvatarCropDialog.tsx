import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

async function getCroppedBlob(src: string, area: Area, mime = "image/jpeg"): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });
  const canvas = document.createElement("canvas");
  const size = Math.min(area.width, area.height);
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size);
  return await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("crop failed"))), mime, 0.9),
  );
}

export function AvatarCropDialog({
  open,
  src,
  onCancel,
  onConfirm,
  busy,
}: {
  open: boolean;
  src: string | null;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
  busy?: boolean;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const onComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), []);

  const confirm = async () => {
    if (!src || !area) return;
    const blob = await getCroppedBlob(src, area);
    onConfirm(blob);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Recadrer la photo de profil</DialogTitle></DialogHeader>
        <div className="relative h-72 w-full overflow-hidden rounded-lg bg-black">
          {src && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onComplete}
            />
          )}
        </div>
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Zoom</div>
          <Slider min={1} max={4} step={0.05} value={[zoom]} onValueChange={(v) => setZoom(v[0])} />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>Annuler</Button>
          <Button onClick={confirm} disabled={busy || !area} className="bg-orange-600 hover:bg-orange-700 text-white">
            {busy ? "Téléversement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
