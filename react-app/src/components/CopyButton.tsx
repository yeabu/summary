/**
 * CopyButton - Reusable button for copying text to the clipboard.
 *
 * Accepts a value to copy and optional hideText prop. Shows feedback by changing icon (and optional text)
 * to indicate success state. Uses Material UI Button and icons.
 */
import { useState } from 'react';
import Button from '@mui/material/Button';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

interface CopyButtonProps {
  value: string;
  hideText?: boolean;
}

const CopyButton: React.FC<CopyButtonProps> = ({ value, hideText }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      // Reset after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  return (
    <Button
      variant="text"
      size="small"
      startIcon={
        copied ? <CheckCircleOutlineIcon color="success" /> : <ContentCopyIcon color='primary' />
      }
      onClick={handleCopy}
      sx={{
        textTransform: 'none',
        minWidth: 'auto',
        p: 0,
        color: copied ? 'green' : 'inherit',
      }}
    >
      {!hideText && (
        copied ? 'Copied' : 'Copy'
      )}
    </Button>
  );
};

export default CopyButton;
