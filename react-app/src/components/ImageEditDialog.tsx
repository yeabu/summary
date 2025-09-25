import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Stack, ToggleButtonGroup, ToggleButton, Typography } from '@mui/material';

type Props = {
  open: boolean;
  file: Blob | File | null;
  onClose: () => void;
  onDone: (blob: Blob) => void;
};

const ImageEditDialog: React.FC<Props> = ({ open, file, onClose, onDone }) => {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [rotate, setRotate] = useState<0 | 90 | 180 | 270>(0);
  const [cropMode, setCropMode] = useState<'original' | 'square'>('original');

  useEffect(() => {
    if (url) URL.revokeObjectURL(url);
    if (open && file) setUrl(URL.createObjectURL(file));
    return () => { if (url) URL.revokeObjectURL(url); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, file]);

  const renderToCanvas = (): Blob | null => {
    const img = imgRef.current; const canvas = canvasRef.current;
    if (!img || !canvas) return null;
    // compute rotated dimensions
    const rad = (rotate * Math.PI) / 180;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));
    const w = img.naturalWidth; const h = img.naturalHeight;
    const rw = Math.floor(w * cos + h * sin);
    const rh = Math.floor(w * sin + h * cos);
    const tmp = document.createElement('canvas');
    tmp.width = rw; tmp.height = rh;
    const tctx = tmp.getContext('2d'); if (!tctx) return null;
    tctx.translate(rw / 2, rh / 2);
    tctx.rotate(rad);
    tctx.drawImage(img, -w / 2, -h / 2);
    // crop
    let sx = 0, sy = 0, sw = rw, sh = rh;
    if (cropMode === 'square') {
      const side = Math.min(rw, rh);
      sx = Math.floor((rw - side) / 2);
      sy = Math.floor((rh - side) / 2);
      sw = side; sh = side;
    }
    canvas.width = sw; canvas.height = sh;
    const ctx = canvas.getContext('2d'); if (!ctx) return null;
    ctx.drawImage(tmp, sx, sy, sw, sh, 0, 0, sw, sh);
    const blob = canvasToJpeg(canvas, 0.92);
    return blob;
  };

  const canvasToJpeg = (c: HTMLCanvasElement, q: number): Blob | null => {
    try {
      const data = c.toDataURL('image/jpeg', q);
      const arr = data.split(',');
      const bstr = atob(arr[1]);
      let n = bstr.length; const u8 = new Uint8Array(n);
      while (n--) u8[n] = bstr.charCodeAt(n);
      return new Blob([u8], { type: 'image/jpeg' });
    } catch { return null; }
  };

  const handleDone = () => {
    const blob = renderToCanvas();
    if (blob) onDone(blob);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>编辑图片</DialogTitle>
      <DialogContent>
        <Stack spacing={1} sx={{ mb: 1 }}>
          <Typography variant="body2">旋转</Typography>
          <ToggleButtonGroup size="small" exclusive value={rotate} onChange={(_, v) => { if (v !== null) setRotate(v); }}>
            <ToggleButton value={0}>0°</ToggleButton>
            <ToggleButton value={90}>90°</ToggleButton>
            <ToggleButton value={180}>180°</ToggleButton>
            <ToggleButton value={270}>270°</ToggleButton>
          </ToggleButtonGroup>
          <Typography variant="body2" sx={{ mt: 1 }}>裁剪</Typography>
          <ToggleButtonGroup size="small" exclusive value={cropMode} onChange={(_, v) => { if (v) setCropMode(v); }}>
            <ToggleButton value="original">原图</ToggleButton>
            <ToggleButton value="square">正方形</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        <div style={{ display:'none' }}><canvas ref={canvasRef} /></div>
        {url && <img ref={imgRef} alt="to-edit" src={url} style={{ maxWidth:'100%', display:'block' }} />}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={handleDone} disabled={!url}>应用</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImageEditDialog;

