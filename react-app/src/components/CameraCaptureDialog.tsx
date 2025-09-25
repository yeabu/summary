import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Alert, Stack } from '@mui/material';

type Props = {
  open: boolean;
  onClose: () => void;
  onCapture: (blob: Blob) => void;
  instant?: boolean; // 立即上传模式：拍照后直接回调onCapture并关闭
};

const CameraCaptureDialog: React.FC<Props> = ({ open, onClose, onCapture, instant }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);

  useEffect(() => {
    let active = true;
    const start = async () => {
      setError('');
      setPreviewUrl(null);
      setCapturedBlob(null);
      if (!open) return;
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError('当前设备不支持摄像头访问');
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (!active) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (e: any) {
        setError(e?.message || '无法开启摄像头');
      }
    };
    start();
    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob((blob) => {
      if (!blob) return;
      if (instant) {
        onCapture(blob);
        onClose();
        return;
      }
      setCapturedBlob(blob);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    }, 'image/jpeg', 0.92);
  };

  const confirmUpload = () => {
    if (capturedBlob) {
      onCapture(capturedBlob);
      onClose();
    }
  };

  const retake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setCapturedBlob(null);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>拍照上传票据</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
        {instant || !previewUrl ? (
          <Box sx={{ position: 'relative', width: '100%', aspectRatio: '4 / 3', bgcolor: 'black', borderRadius: 1, overflow: 'hidden' }}>
            <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </Box>
        ) : (
          <Box sx={{ width: '100%', border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
            {/* eslint-disable-next-line jsx-a11y/img-redundant-alt */}
            <img src={previewUrl} alt="captured photo preview" style={{ width: '100%', display: 'block' }} />
          </Box>
        )}
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </DialogContent>
      <DialogActions>
        {instant ? (
          <Stack direction="row" spacing={1} sx={{ p: 1 }}>
            <Button onClick={onClose}>取消</Button>
            <Button variant="contained" onClick={takePhoto} disabled={!!error}>拍照上传</Button>
          </Stack>
        ) : !previewUrl ? (
          <Stack direction="row" spacing={1} sx={{ p: 1 }}>
            <Button onClick={onClose}>取消</Button>
            <Button variant="contained" onClick={takePhoto} disabled={!!error}>拍照</Button>
          </Stack>
        ) : (
          <Stack direction="row" spacing={1} sx={{ p: 1 }}>
            <Button onClick={retake}>重拍</Button>
            <Button variant="contained" onClick={confirmUpload}>确认上传</Button>
          </Stack>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CameraCaptureDialog;
