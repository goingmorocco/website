import { useCallback, useState } from "react";
import Cropper from "react-easy-crop";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function getCroppedBlob(imageSrc: string, cropPixels: any): Promise<Blob> {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((res) => (image.onload = res));

  const canvas = document.createElement("canvas");
  canvas.width = cropPixels.width;
  canvas.height = cropPixels.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    cropPixels.width,
    cropPixels.height
  );

  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.9));
}

export default function ImageCropModal({
  file,
  aspect = 16 / 9,
  onCancel,
  onCropped,
}: {
  file: File;
  aspect?: number;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
}) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  useState(() => {
    readFileAsDataUrl(file).then(setImageSrc);
  });

  const onCropComplete = useCallback((_: any, pixels: any) => {
    setCroppedAreaPixels(pixels);
  }, []);

  async function handleConfirm() {
    if (!imageSrc || !croppedAreaPixels) return;
    const blob = await getCroppedBlob(imageSrc, croppedAreaPixels);
    onCropped(blob);
  }

  if (!imageSrc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-ink">Crop featured image</h3>
        <div className="relative h-80 w-full bg-black/5">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="mt-3 w-full"
        />
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-full px-4 py-2 text-sm text-ink/60">Cancel</button>
          <button onClick={handleConfirm} className="rounded-full bg-royal px-5 py-2 text-sm font-semibold text-white">
            Use this crop
          </button>
        </div>
      </div>
    </div>
  );
}
